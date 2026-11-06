import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import * as appText from '@clog/domain';
import {
  collectionHiScoreMetrics,
  normalizePlayerName,
  parseCollectionHiScoreQuery,
} from '@clog/domain';
import type { BackendStore } from './types.js';
import { ApiError } from './types.js';
import { matchesEtag } from './projection-cache.js';

export function collectionHiScoresRoutes(
  app: FastifyInstance,
  store?: Pick<BackendStore, 'collectionHiScores'>,
) {
  app.get<{ Querystring: { metric?: string; page?: string; player?: string } }>(
    '/api/v1/collections/hiscores',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            metric: { type: 'string', enum: [...collectionHiScoreMetrics] },
            page: { type: 'string', pattern: '^[1-9][0-9]{0,8}$' },
            player: { type: 'string', minLength: 1, maxLength: 80 },
          },
        },
      },
    },
    async (request, reply) => {
      let query;
      try {
        query = parseCollectionHiScoreQuery(request.query);
      } catch (error) {
        throw new ApiError(400, (error as Error).message);
      }
      if (!store?.collectionHiScores)
        throw new ApiError(503, appText.hiscoresUnavailable);
      const snapshot = await store.collectionHiScores(query);
      const etag =
        '"' +
        createHash('sha256')
          .update(
            JSON.stringify([
              snapshot.revision,
              query.metric,
              snapshot.page,
              query.player ? normalizePlayerName(query.player) : null,
            ]),
          )
          .digest('hex') +
        '"';
      reply
        .header('ETag', etag)
        .header('Cache-Control', 'public, max-age=0, must-revalidate');
      if (matchesEtag(request.headers['if-none-match'], etag))
        return reply.code(304).send();
      return snapshot;
    },
  );
}
