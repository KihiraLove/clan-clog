import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import * as appText from '@clog/domain';
import {
  collectorDisplayName,
  normalizePlayerName,
  isGameMode,
  type GameMode,
  type CollectorIdentity,
  type CollectorCounts,
  type CollectorNamePreview,
  type CollectorNameResult,
} from '@clog/domain';
import { transaction } from './transaction.js';
import { lockCollectorNames } from './collector-identities.js';
import { ApiError } from './types.js';
import type { WomNameVerification } from './wom-names.js';
export const publicNameActor = 'public:wom';
export interface VerifiedPublicNameContext {
  hash: string;
  settingsRevision: string;
  evidence: WomNameVerification;
}
export async function readUserNameSettings(
  client: Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>,
  lock = false,
) {
  const row = (
    await client.query<{ version: number; enabled: boolean }>(
      'SELECT version,user_submissions_enabled AS enabled FROM collector_name_settings WHERE singleton' +
        (lock ? ' FOR SHARE' : ''),
    )
  ).rows[0];
  if (!row) throw new ApiError(503, appText.userNameChangesUnavailable);
  return {
    revision: 'collector-name-settings-' + row.version,
    enabled: row.enabled,
  };
}
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const fields =
  'id::text,display_name AS name,version::text,history_version::text AS "historyVersion",game_mode AS "gameMode"';
const conflict = () => new ApiError(409, appText.collectorNamesChanged);
const same = (
  a: CollectorIdentity | null | undefined,
  b: CollectorIdentity | null,
) =>
  a == null || b === null
    ? a == null && b === null
    : a.id === b.id &&
      a.name === b.name &&
      a.version === b.version &&
      a.historyVersion === b.historyVersion &&
      (a.gameMode ?? null) === (b.gameMode ?? null);
async function readIdentity(client: pg.PoolClient, id: string) {
  return (
    await client.query<CollectorIdentity>(
      `SELECT ${fields} FROM collectors WHERE id=$1 AND merged_into IS NULL`,
      [id],
    )
  ).rows[0];
}
async function targetIdentity(
  client: pg.PoolClient,
  name: string,
  source: string,
) {
  return (
    (
      await client.query<CollectorIdentity>(
        `SELECT ${fields} FROM collectors WHERE normalized_name=$1 AND merged_into IS NULL AND id<>$2`,
        [normalizePlayerName(name), source],
      )
    ).rows[0] ?? null
  );
}
export class PgCollectorNames {
  constructor(private readonly pool: pg.Pool) {}
  settings() {
    return readUserNameSettings(this.pool);
  }
  saveSettings(enabled: boolean, revision: string, actorId: string) {
    return transaction(this.pool, 'write', async (client) => {
      const row = (
        await client.query(
          'SELECT version,user_submissions_enabled AS enabled FROM collector_name_settings WHERE singleton FOR UPDATE',
        )
      ).rows[0];
      if (!row || revision !== 'collector-name-settings-' + row.version)
        throw conflict();
      await client.query(
        'UPDATE collector_name_settings SET user_submissions_enabled=$1,version=version+1 WHERE singleton',
        [enabled],
      );
      await client.query(
        'INSERT INTO collector_name_settings_audit(id,actor_id,version,old_enabled,new_enabled) VALUES($1,$2,$3,$4,$5)',
        [randomUUID(), actorId, row.version + 1, row.enabled, enabled],
      );
      return {
        revision: 'collector-name-settings-' + (row.version + 1),
        enabled,
      };
    });
  }
  async search(query: string) {
    if (query.length > 80)
      throw new ApiError(422, appText.collectorNameInvalid);
    const key = normalizePlayerName(query).replace(/[\\%_]/gu, '\\$&') + '%';
    const result = await this.pool.query<CollectorIdentity>(
      `SELECT ${fields} FROM collectors WHERE merged_into IS NULL AND normalized_name LIKE $1 ORDER BY normalized_name,id LIMIT 51`,
      [key],
    );
    return {
      collectors: result.rows.slice(0, 50),
      hasMore: result.rows.length > 50,
    };
  }
  async preview(
    sourceId: string,
    rawName: string,
    actorId: string,
    modeResolution?: GameMode,
  ): Promise<CollectorNamePreview> {
    if (modeResolution !== undefined && !isGameMode(modeResolution))
      throw new ApiError(422, appText.gameModeInvalid);
    if (!uuid.test(sourceId))
      throw new ApiError(404, appText.collectorNamesMissing);
    let newName: string;
    try {
      newName = collectorDisplayName(rawName);
    } catch {
      throw new ApiError(422, appText.collectorNameInvalid);
    }
    return transaction(this.pool, 'write', async (client) => {
      await client.query('SELECT pg_advisory_xact_lock_shared(74261005)');
      await lockCollectorNames(client);
      await client.query("SET LOCAL statement_timeout='10s'");
      const source = await readIdentity(client, sourceId);
      if (!source) throw new ApiError(409, appText.collectorNamesMissing);
      const target = await targetIdentity(client, newName, sourceId);
      // History triggers use these rows too; pin both before reading versions/counts.
      await client.query(
        'SELECT id FROM collectors WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE',
        [[sourceId, ...(target ? [target.id] : [])]],
      );
      const current = (await readIdentity(client, sourceId))!;
      const currentTarget = target
        ? (await readIdentity(client, target.id))!
        : null;
      const counts: CollectorCounts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        revoked: 0,
      };
      const rows = await client.query<{
        status: keyof CollectorCounts;
        n: number;
      }>(
        'SELECT s.status,count(*)::int AS n FROM collectors c JOIN submissions s ON s.collector_id=c.id WHERE c.id=$1 OR c.merged_into=$1 GROUP BY s.status',
        [sourceId],
      );
      for (const row of rows.rows) counts[row.status] = row.n;
      const modeConflict =
        current.gameMode != null &&
        currentTarget?.gameMode != null &&
        current.gameMode !== currentTarget.gameMode;
      const gameMode = modeConflict
        ? (modeResolution ?? null)
        : (currentTarget?.gameMode ?? current.gameMode ?? null);
      if (
        !modeConflict &&
        modeResolution !== undefined &&
        modeResolution !== gameMode
      )
        throw conflict();
      const preview: CollectorNamePreview = {
        gameMode,
        modeResolutionRequired: modeConflict && modeResolution === undefined,
        token: randomUUID(),
        operation: currentTarget
          ? 'merge'
          : current.name === newName
            ? 'noop'
            : 'rename',
        source: current,
        target: currentTarget,
        newName: currentTarget?.name ?? newName,
        counts,
      };
      if (preview.operation !== 'noop') {
        await client.query(
          'WITH expired AS(SELECT token FROM collector_name_previews WHERE expires_at<clock_timestamp() ORDER BY expires_at LIMIT 100) DELETE FROM collector_name_previews WHERE token IN(SELECT token FROM expired)',
        );
        await client.query(
          'INSERT INTO collector_name_previews(token,actor_id,snapshot) VALUES($1,$2,$3)',
          [preview.token, actorId, JSON.stringify(preview)],
        );
      }
      return preview;
    });
  }
  async apply(
    token: string,
    key: string,
    actorId: string,
    actorName: string,
    publicContext?: VerifiedPublicNameContext,
  ): Promise<CollectorNameResult> {
    if (!uuid.test(token) || !uuid.test(key))
      throw new ApiError(422, appText.collectorNamesChanged);
    const hash =
      publicContext?.hash ??
      createHash('sha256')
        .update(JSON.stringify({ token: token.toLowerCase() }))
        .digest('hex');
    return transaction(this.pool, 'write', async (client) => {
      await client.query('SELECT pg_advisory_xact_lock_shared(74261005)');
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='15s'");
      await lockCollectorNames(client, true);
      const saved = (
        await client.query<{
          payload_hash: string;
          response: CollectorNameResult;
        }>(
          'SELECT payload_hash,response FROM collector_name_requests WHERE actor_id=$1 AND request_key=$2',
          [actorId, key],
        )
      ).rows[0];
      if (saved) {
        if (saved.payload_hash !== hash) throw conflict();
        return saved.response;
      }
      if (publicContext) {
        if (actorId !== publicNameActor) throw conflict();
        const settings = await readUserNameSettings(client, true);
        if (!settings.enabled)
          throw new ApiError(403, appText.publicNamesDisabled);
        if (settings.revision !== publicContext.settingsRevision)
          throw conflict();
      }
      const row = (
        await client.query<{ snapshot: CollectorNamePreview }>(
          'SELECT snapshot FROM collector_name_previews WHERE token=$1 AND actor_id=$2 AND expires_at>clock_timestamp()',
          [token, actorId],
        )
      ).rows[0];
      if (!row) throw conflict();
      const preview = row.snapshot,
        source = await readIdentity(client, preview.source.id);
      if (!source || preview.operation === 'noop') throw conflict();
      const target = await targetIdentity(client, preview.newName, source.id);
      if (!same(source, preview.source) || !same(target, preview.target))
        throw conflict();
      if (preview.modeResolutionRequired)
        throw new ApiError(
          422,
          publicContext
            ? appText.publicNamesStaffRequired
            : appText.gameModeMergeConflict,
        );
      if (publicContext) {
        const proof = publicContext.evidence,
          scope = [source.id, ...(target ? [target.id] : [])];
        const bindings = await client.query(
          `SELECT 1 WHERE EXISTS(
             SELECT 1 FROM collectors WHERE (id=ANY($1::uuid[]) OR merged_into=ANY($1::uuid[])) AND wom_player_id<>$2
           ) OR EXISTS(
             SELECT 1 FROM collectors WHERE wom_player_id=$2 AND NOT(COALESCE(merged_into,id)=ANY($1::uuid[]))
           )`,
          [scope, proof.playerId],
        );
        const consumed = await client.query(
          'SELECT 1 FROM collector_name_wom_verifications WHERE name_change_id=ANY($1::bigint[]) LIMIT 1',
          [proof.changes.map((c) => c.id)],
        );
        if (bindings.rowCount || consumed.rowCount)
          throw new ApiError(422, appText.publicNamesStaffRequired);
      }
      if (preview.operation === 'merge') {
        if (!target || target.id === source.id) throw conflict();
        await client.query(
          'UPDATE collectors SET version=version+1 WHERE merged_into=$1',
          [target.id],
        );
        await client.query(
          'UPDATE collectors SET merged_into=$2,version=version+1 WHERE merged_into=$1',
          [source.id, target.id],
        );
        await client.query(
          'UPDATE collectors SET merged_into=$2,version=version+1,history_version=history_version+1 WHERE id=$1',
          [source.id, target.id],
        );
        await client.query(
          'UPDATE collectors SET history_version=history_version+1,version=version+1,game_mode=$2,game_mode_version=game_mode_version+1,game_mode_reviewed=game_mode_reviewed OR(SELECT game_mode_reviewed FROM collectors WHERE id=$3) WHERE id=$1',
          [target.id, preview.gameMode ?? null, source.id],
        );
      } else {
        if (target) throw conflict();
        await client.query(
          'UPDATE collectors SET version=version+1 WHERE merged_into=$1',
          [source.id],
        );
        await client.query(
          'UPDATE collectors SET display_name=$2,normalized_name=$3,version=version+1 WHERE id=$1',
          [source.id, preview.newName, normalizePlayerName(preview.newName)],
        );
      }
      const result: CollectorNameResult = {
        gameMode: preview.gameMode ?? source.gameMode ?? null,
        operationId: randomUUID(),
        operation: preview.operation,
        sourceId: source.id,
        targetId: target?.id ?? source.id,
        originalName: source.name,
        newName: preview.newName,
        counts: preview.counts,
      };
      await client.query(
        'INSERT INTO collector_name_audit(operation_id,actor_id,actor_name,operation,source_id,target_id,original_name,target_name,affected_counts,source_game_mode,target_game_mode,resolved_game_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [
          result.operationId,
          actorId,
          actorName,
          result.operation,
          result.sourceId,
          result.targetId,
          result.originalName,
          result.newName,
          JSON.stringify(result.counts),
          source.gameMode ?? null,
          target?.gameMode ?? null,
          result.gameMode,
        ],
      );
      if (result.operation === 'merge')
        await client.query(
          "INSERT INTO collector_game_mode_audit(operation_id,collector_id,actor_id,actor_name,old_mode,new_mode,origin) VALUES($1,$2,$3,$4,$5,$6,'merge')",
          [
            result.operationId,
            result.targetId,
            actorId,
            actorName,
            target?.gameMode ?? null,
            result.gameMode,
          ],
        );
      await client.query(
        'INSERT INTO collector_name_requests(actor_id,request_key,payload_hash,response) VALUES($1,$2,$3,$4)',
        [actorId, key, hash, JSON.stringify(result)],
      );
      if (publicContext) {
        await client.query(
          'UPDATE collectors SET wom_player_id=$2 WHERE id=$1',
          [result.targetId, publicContext.evidence.playerId],
        );
        await client.query(
          `INSERT INTO collector_name_wom_verifications(name_change_id,operation_id,player_id,evidence)
           SELECT (c->>'id')::bigint,$2,$3,jsonb_build_object('playerId',$3::bigint,'username',$4::text,'verifiedAt',$5::text,'changes',jsonb_build_array(c))
           FROM jsonb_array_elements($1::jsonb) c`,
          [
            JSON.stringify(publicContext.evidence.changes),
            result.operationId,
            publicContext.evidence.playerId,
            publicContext.evidence.username,
            publicContext.evidence.verifiedAt,
          ],
        );
      }
      return result;
    });
  }
}
