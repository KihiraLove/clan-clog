import { randomUUID } from 'node:crypto';
import {
  normalizePlayerName,
  isGameMode,
  gameModeInvalid,
  type GameMode,
} from '@clog/domain';
import { ApiError } from './types.js';
import type pg from 'pg';
/** Take after the catalog gate, before scheduling, submission or item locks. */
export async function lockCollectorNames(
  client: Pick<pg.PoolClient, 'query'>,
  exclusive = false,
) {
  await client.query(
    exclusive
      ? 'SELECT pg_advisory_xact_lock(74261020)'
      : 'SELECT pg_advisory_xact_lock_shared(74261020)',
  );
}
export async function resolveCollector(
  client: pg.PoolClient,
  name: string,
  gameMode?: GameMode,
) {
  if (gameMode !== undefined && !isGameMode(gameMode))
    throw new ApiError(422, gameModeInvalid);
  const key = normalizePlayerName(name);
  await client.query(
    'INSERT INTO collectors(id,display_name,normalized_name) VALUES($1,$2,$3) ON CONFLICT(normalized_name) WHERE merged_into IS NULL DO NOTHING',
    [randomUUID(), name.trim().replace(/\s+/gu, ' '), key],
  );
  const id = (
    await client.query<{ id: string }>(
      'SELECT id FROM collectors WHERE normalized_name=$1 AND merged_into IS NULL',
      [key],
    )
  ).rows[0]!.id;
  if (gameMode !== undefined) {
    // The predicate is rechecked after a competing initializer's row lock.
    const initialized = await client.query(
      'UPDATE collectors SET game_mode=$2,game_mode_version=game_mode_version+1,version=version+1 WHERE id=$1 AND game_mode IS NULL AND NOT game_mode_reviewed RETURNING id',
      [id, gameMode],
    );
    if (initialized.rowCount)
      await client.query(
        'UPDATE collectors SET version=version+1 WHERE merged_into=$1',
        [id],
      );
  }
  return id;
}
export async function collectorGameMode(client: pg.PoolClient, id: string) {
  return (
    await client.query<{ game_mode: GameMode | null }>(
      'SELECT game_mode FROM collectors WHERE id=$1',
      [id],
    )
  ).rows[0]!.game_mode;
}
export const currentCollectorId =
  '(SELECT COALESCE(merged_into,id)::text FROM collectors WHERE id=submissions.collector_id)';
export const currentCollectorGameMode =
  '(SELECT current.game_mode FROM collectors original JOIN collectors current ON current.id=COALESCE(original.merged_into,original.id) WHERE original.id=submissions.collector_id)';
export const currentCollectorName =
  'COALESCE((SELECT current.display_name FROM collectors original JOIN collectors current ON current.id=COALESCE(original.merged_into,original.id) WHERE original.id=submissions.collector_id),collector_name)';
export const collectorVersionDelta =
  'COALESCE((SELECT version-1 FROM collectors WHERE id=submissions.collector_id),0)';
