/** Migration 007 data step. It runs inside migrate()'s existing transaction. */
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { normalizePlayerName } from '@clog/domain';
export async function backfillCollectorIdentities(client: pg.Client) {
  let cursor: string | null = null;
  for (;;) {
    const rows: Array<{ id: string; name: string; original: string }> = (
      await client.query<{ id: string; name: string; original: string }>(
        "SELECT s.id::text,s.collector_name AS name,COALESCE((SELECT a.old_values->>'collectorName' FROM audit_events a WHERE a.submission_id=s.id AND jsonb_typeof(a.old_values->'collectorName')='string' AND length(a.old_values->>'collectorName')>0 ORDER BY a.id LIMIT 1),s.collector_name) AS original FROM submissions s WHERE ($1::uuid IS NULL OR s.id>$1) ORDER BY s.id LIMIT 1000",
        [cursor],
      )
    ).rows;
    if (!rows.length) break;
    const input = JSON.stringify(
      rows.map((row) => ({
        ...row,
        name: row.name.trim().replace(/\s+/gu, ' ') || row.name,
        key: normalizePlayerName(row.name),
        identity: randomUUID(),
      })),
    );
    await client.query(
      'INSERT INTO collectors(id,display_name,normalized_name) SELECT DISTINCT ON(key) identity,name,key FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,name text,key text,identity uuid) ORDER BY key,id ON CONFLICT(normalized_name) WHERE merged_into IS NULL DO NOTHING',
      [input],
    );
    await client.query(
      'UPDATE submissions s SET collector_id=c.id,original_collector_name=x.original FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,name text,key text,identity uuid,original text) JOIN collectors c ON c.normalized_name=x.key AND c.merged_into IS NULL WHERE s.id=x.id',
      [input],
    );
    cursor = rows.at(-1)!.id;
  }
}
