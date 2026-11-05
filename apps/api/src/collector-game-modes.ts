import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import * as appText from '@clog/domain';
import {
  isGameMode,
  type CollectorGameMode,
  type CollectorGameModeChange,
  type CollectorGameModeResult,
} from '@clog/domain';
import { ApiError } from './types.js';
import { transaction } from './transaction.js';
import { lockCollectorNames } from './collector-identities.js';
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const changed = () => new ApiError(409, appText.gameModeChanged);
async function profile(
  client: Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>,
  submissionId: string,
  byCollector = false,
) {
  const row = (
    await client.query<CollectorGameMode>(
      `SELECT c.id::text AS "collectorId",c.display_name AS "collectorName",c.game_mode AS "gameMode",
    'collector-mode-'||c.id::text||'-'||c.game_mode_version::text||'-'||c.version::text AS revision
    FROM collectors original
    JOIN collectors c ON c.id=COALESCE(original.merged_into,original.id)
    WHERE ${byCollector ? 'original.id=$1' : 'original.id=(SELECT collector_id FROM submissions WHERE id=$1)'}`,
      [submissionId],
    )
  ).rows[0];
  if (!row) throw changed();
  return row;
}
export class PgCollectorGameModes {
  constructor(private readonly pool: pg.Pool) {}
  get(submissionId: string, byCollector = false) {
    if (!uuid.test(submissionId)) throw changed();
    return profile(this.pool, submissionId, byCollector);
  }
  save(
    submissionId: string,
    fields: CollectorGameModeChange,
    key: string,
    actorId: string,
    actorName: string,
    byCollector = false,
  ) {
    if (
      !uuid.test(submissionId) ||
      !uuid.test(fields.collectorId) ||
      !uuid.test(key)
    )
      throw changed();
    if (fields.gameMode !== null && !isGameMode(fields.gameMode))
      throw new ApiError(422, appText.gameModeInvalid);
    const hash = createHash('sha256')
      .update(
        JSON.stringify([
          ...(byCollector ? ['collector'] : []),
          submissionId,
          fields.collectorId,
          fields.expectedRevision,
          fields.gameMode,
        ]),
      )
      .digest('hex');
    return transaction(this.pool, 'write', async (client) => {
      await client.query('SELECT pg_advisory_xact_lock_shared(74261005)');
      await client.query(
        "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='15s'",
      );
      await lockCollectorNames(client, true);
      const saved = (
        await client.query<{
          payload_hash: string;
          response: CollectorGameModeResult;
        }>(
          'SELECT payload_hash,response FROM collector_game_mode_requests WHERE actor_id=$1 AND request_key=$2',
          [actorId, key],
        )
      ).rows[0];
      if (saved) {
        if (saved.payload_hash !== hash) throw changed();
        return saved.response;
      }
      const before = await profile(client, submissionId, byCollector);
      if (
        before.collectorId !== fields.collectorId ||
        before.revision !== fields.expectedRevision
      )
        throw changed();
      await client.query(
        'UPDATE collectors SET version=version+1 WHERE merged_into=$1',
        [fields.collectorId],
      );
      await client.query(
        'UPDATE collectors SET game_mode=$2,game_mode_reviewed=true,game_mode_version=game_mode_version+1,version=version+1 WHERE id=$1',
        [fields.collectorId, fields.gameMode],
      );
      const result: CollectorGameModeResult = {
        ...(await profile(client, submissionId, byCollector)),
        operationId: randomUUID(),
      };
      await client.query(
        "INSERT INTO collector_game_mode_audit(operation_id,collector_id,actor_id,actor_name,old_mode,new_mode,origin) VALUES($1,$2,$3,$4,$5,$6,'staff')",
        [
          result.operationId,
          fields.collectorId,
          actorId,
          actorName,
          before.gameMode,
          fields.gameMode,
        ],
      );
      await client.query(
        'INSERT INTO collector_game_mode_requests(actor_id,request_key,payload_hash,response) VALUES($1,$2,$3,$4)',
        [actorId, key, hash, JSON.stringify(result)],
      );
      return result;
    });
  }
}
