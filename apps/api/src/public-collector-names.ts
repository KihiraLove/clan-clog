import { createHash } from 'node:crypto';
import type pg from 'pg';
import * as appText from '@clog/domain';
import {
  normalizePlayerName,
  publicNameChangeInput,
  type PublicNameChangeInput,
  type PublicNameChangeResult,
  type CollectorNameResult,
} from '@clog/domain';
import { ApiError } from './types.js';
import { PgCollectorNames, publicNameActor } from './collector-name-store.js';
import { verifyWomNameChange } from './wom-names.js';
export interface PublicNameChangesService {
  settings(): Promise<{ enabled: boolean }>;
  replay(
    fields: PublicNameChangeInput,
    key: string,
  ): Promise<PublicNameChangeResult | null>;
  change(
    fields: PublicNameChangeInput,
    key: string,
    signal: AbortSignal,
  ): Promise<PublicNameChangeResult>;
}
function input(raw: PublicNameChangeInput) {
  try {
    return publicNameChangeInput(raw);
  } catch {
    throw new ApiError(422, appText.publicNamesInvalid);
  }
}
const hash = (fields: PublicNameChangeInput) =>
  createHash('sha256').update(JSON.stringify(fields)).digest('hex');
const result = (saved: CollectorNameResult): PublicNameChangeResult => ({
  status: 'changed',
  operationId: saved.operationId,
  oldName: saved.originalName,
  newName: saved.newName,
});
export class PgPublicNameChanges implements PublicNameChangesService {
  private readonly names: PgCollectorNames;
  constructor(
    private readonly pool: pg.Pool,
    private readonly verify = verifyWomNameChange,
  ) {
    this.names = new PgCollectorNames(pool);
  }
  settings() {
    return this.names.settings();
  }
  async replay(raw: PublicNameChangeInput, key: string) {
    const fields = input(raw),
      saved = (
        await this.pool.query<{
          payload_hash: string;
          response: CollectorNameResult;
        }>(
          'SELECT payload_hash,response FROM collector_name_requests WHERE actor_id=$1 AND request_key=$2',
          [publicNameActor, key],
        )
      ).rows[0];
    if (!saved) return null;
    if (saved.payload_hash !== hash(fields))
      throw new ApiError(409, appText.collectorNamesChanged);
    return result(saved.response);
  }
  async change(raw: PublicNameChangeInput, key: string, signal: AbortSignal) {
    const fields = input(raw),
      saved = await this.replay(fields, key);
    if (saved) return saved;
    const settings = await this.names.settings();
    if (!settings.enabled) throw new ApiError(403, appText.publicNamesDisabled);
    const source = (
      await this.pool.query<{ id: string }>(
        'SELECT id FROM collectors WHERE merged_into IS NULL AND normalized_name=$1',
        [normalizePlayerName(fields.oldName)],
      )
    ).rows[0];
    const preview = source
      ? await this.names.preview(source.id, fields.newName, publicNameActor)
      : undefined;
    const checked = await this.verify(fields.oldName, fields.newName, signal);
    if (signal.aborted)
      throw new ApiError(503, appText.publicNamesStaffRequired);
    if (checked.kind !== 'verified')
      throw new ApiError(
        422,
        checked.kind === 'wom_first'
          ? appText.publicNamesWomFirst
          : appText.publicNamesStaffRequired,
      );
    if (
      !preview ||
      preview.operation === 'noop' ||
      preview.modeResolutionRequired
    )
      throw new ApiError(422, appText.publicNamesStaffRequired);
    const changed = await this.names.apply(
      preview.token,
      key,
      publicNameActor,
      appText.publicNamesActor,
      {
        hash: hash(fields),
        settingsRevision: settings.revision,
        evidence: checked.evidence,
      },
    );
    return result(changed);
  }
}
