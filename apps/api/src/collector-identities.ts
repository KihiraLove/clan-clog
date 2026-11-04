import { randomUUID } from 'node:crypto';
import { normalizePlayerName } from '@clog/domain';
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
export async function resolveCollector(client: pg.PoolClient, name: string) {
  const key = normalizePlayerName(name);
  await client.query(
    'INSERT INTO collectors(id,display_name,normalized_name) VALUES($1,$2,$3) ON CONFLICT(normalized_name) WHERE merged_into IS NULL DO NOTHING',
    [randomUUID(), name.trim().replace(/\s+/gu, ' '), key],
  );
  return (
    await client.query<{ id: string }>(
      'SELECT id FROM collectors WHERE normalized_name=$1 AND merged_into IS NULL',
      [key],
    )
  ).rows[0]!.id;
}
export const currentCollectorName =
  'COALESCE((SELECT current.display_name FROM collectors original JOIN collectors current ON current.id=COALESCE(original.merged_into,original.id) WHERE original.id=submissions.collector_id),collector_name)';
export const collectorVersionDelta =
  'COALESCE((SELECT version-1 FROM collectors WHERE id=submissions.collector_id),0)';
