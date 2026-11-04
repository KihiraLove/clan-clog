import type { FastifyInstance, FastifyRequest } from 'fastify';
import * as appText from '@clog/domain';
import { gameModes, type CollectorGameModeChange } from '@clog/domain';
import type { ReviewRouteStore } from './route-services.js';
import { ApiError } from './types.js';
export function collectorGameModeRoutes(
  app: FastifyInstance,
  store: ReviewRouteStore,
  authorize: (
    r: FastifyRequest,
    write?: boolean,
  ) => Promise<{ id: string; displayName: string }>,
) {
  const params = {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  };
  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/submissions/:id/game-mode',
    {
      schema: { params },
      preHandler: async (r) => {
        await authorize(r);
      },
    },
    async (r, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      if (!store.collectorGameMode)
        throw new ApiError(503, appText.gameModeUnavailable);
      return store.collectorGameMode(r.params.id);
    },
  );
  app.put<{ Params: { id: string }; Body: CollectorGameModeChange }>(
    '/api/v1/admin/submissions/:id/game-mode',
    {
      schema: {
        params,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['collectorId', 'expectedRevision', 'gameMode'],
          properties: {
            collectorId: { type: 'string', format: 'uuid' },
            expectedRevision: { type: 'string', minLength: 1, maxLength: 160 },
            gameMode: { enum: [null, ...gameModes] },
          },
        },
        headers: {
          type: 'object',
          required: ['idempotency-key'],
          properties: { 'idempotency-key': { type: 'string', format: 'uuid' } },
        },
      },
      preHandler: async (r) => {
        await authorize(r, true);
      },
    },
    async (r, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const actor = await authorize(r, true);
      if (!store.saveCollectorGameMode)
        throw new ApiError(503, appText.gameModeUnavailable);
      return store.saveCollectorGameMode(
        r.params.id,
        r.body,
        r.headers['idempotency-key'] as string,
        actor.id,
        actor.displayName,
      );
    },
  );
}
