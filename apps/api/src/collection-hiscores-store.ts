import type pg from 'pg';
import * as appText from '@clog/domain';
import {
  normalizePlayerName,
  type CollectionHiScoreQuery,
  type CollectionHiScores,
} from '@clog/domain';
import { transaction } from './transaction.js';
import { ProjectionCache } from './projection-cache.js';
import { ApiError } from './types.js';

// One submission contributes once. Neither page membership nor alias/display
// grouping participates in this read. Current identity normalization is already
// stored using the shared JavaScript normalizer by intake and migration 007.
export const collectionHiScoresSql = `WITH obtains AS (
  SELECT s.collector_id,s.item_id,count(*) AS obtains
  FROM submissions s JOIN items i ON i.id=s.item_id AND i.active
  WHERE s.status='approved' AND s.hardcore=($1='hardcore')
    AND ($1<>'event' OR s.collection_type='event')
  GROUP BY s.collector_id,s.item_id
), scores AS (
  SELECT c.id,c.display_name AS name,c.normalized_name,
    CASE WHEN $1='unique' THEN count(DISTINCT o.item_id) ELSE sum(o.obtains)::bigint END AS score
  FROM obtains o JOIN collectors original ON original.id=o.collector_id
  JOIN collectors c ON c.id=COALESCE(original.merged_into,original.id)
  GROUP BY c.id
), ranked AS MATERIALIZED (
  SELECT *,row_number() OVER(ORDER BY score DESC,normalized_name COLLATE "C",id) AS position FROM scores
), totals AS (
  SELECT count(*) AS players,max(position) FILTER(WHERE normalized_name=$3) AS found FROM ranked
), navigation AS (
  SELECT *,GREATEST(1,(players+24)/25) AS pages,
    CASE WHEN found IS NOT NULL THEN (found-1)/25+1 ELSE LEAST($2::bigint,GREATEST(1,(players+24)/25)) END AS page FROM totals
)
SELECT players::text AS total,page::text,pages::text,
  (SELECT jsonb_build_object('name',name,'rank',position) FROM ranked WHERE position=n.found) AS match,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('rank',position,'name',name,'score',score::text) ORDER BY position)
    FROM ranked WHERE position BETWEEN (n.page-1)*25+1 AND n.page*25),'[]'::jsonb) AS rows
FROM navigation n`;

export class PgCollectionHiScores {
  private readonly cache = new ProjectionCache<CollectionHiScores>();
  constructor(private readonly pool: pg.Pool) {}
  read(query: CollectionHiScoreQuery): Promise<CollectionHiScores> {
    return transaction(this.pool, 'snapshot', async (client) => {
      await client.query("SET LOCAL statement_timeout='5s'");
      const revision = (
        await client.query<{
          version: string;
          settings: string;
          enabled: boolean;
        }>(
          "SELECT p.version::text,s.version::text AS settings,s.hardcore_enabled AS enabled FROM projection_state p CROSS JOIN site_settings s WHERE p.resource='collections' AND s.singleton",
        )
      ).rows[0];
      if (!revision) throw new ApiError(503, appText.hiscoresUnavailable);
      const key =
        'hiscores-' +
        revision.version +
        '-' +
        revision.settings +
        '-' +
        (revision.enabled ? '1' : '0');
      const cached = await this.cache.read(
        JSON.stringify([
          key,
          query.metric,
          query.page,
          query.player ? normalizePlayerName(query.player) : null,
        ]),
        async () => {
          const base = {
            revision: key,
            metric: query.metric,
            pageSize: 25 as const,
            hardcoreEnabled: revision.enabled,
          };
          if (query.metric === 'hardcore' && !revision.enabled)
            return {
              ...base,
              page: 1,
              totalPages: 1,
              totalPlayers: 0,
              players: [],
              match: null,
            };
          const result = (
            await client.query<{
              total: string;
              page: string;
              pages: string;
              rows: CollectionHiScores['players'];
              match: CollectionHiScores['match'];
            }>(collectionHiScoresSql, [
              query.metric,
              query.page,
              query.player ? normalizePlayerName(query.player) : null,
            ])
          ).rows[0]!;
          const totalPlayers = Number(result.total);
          if (!Number.isSafeInteger(totalPlayers))
            throw new ApiError(503, appText.hiscoresUnavailable);
          return {
            ...base,
            page: Number(result.page),
            totalPages: Number(result.pages),
            totalPlayers,
            players: result.rows,
            match: result.match,
          };
        },
      );
      return cached.data;
    });
  }
}
