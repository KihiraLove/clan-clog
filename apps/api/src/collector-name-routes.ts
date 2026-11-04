import type { FastifyInstance, FastifyRequest } from 'fastify';
import * as appText from '@clog/domain';
import { ApiError } from './types.js';
import type { ReviewRouteStore } from './route-services.js';
export function collectorNameRoutes(
  app: FastifyInstance,
  store: ReviewRouteStore,
  authorize: (
    r: FastifyRequest,
    write?: boolean,
  ) => Promise<{
    id: string;
    displayName: string;
    role?: 'admin' | 'moderator';
  }>,
) {
  const owner = async (r: FastifyRequest, write = false) => {
    const actor = await authorize(r, write);
    if (actor.role !== 'admin')
      throw new ApiError(403, appText.collectorNamesAdminOnly);
    return actor;
  };
  app.get<{ Querystring: { search?: string } }>(
    '/api/v1/admin/collectors',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { search: { type: 'string', maxLength: 80 } },
        },
      },
      preHandler: async (r) => {
        await owner(r);
      },
    },
    async (r) => {
      if (!store.collectors)
        throw new ApiError(503, appText.collectorNamesUnavailable);
      return store.collectors(r.query.search ?? '');
    },
  );
  app.post<{ Body: { sourceId: string; newName: string } }>(
    '/api/v1/admin/collector-name-changes/preview',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['sourceId', 'newName'],
          properties: {
            sourceId: { type: 'string', format: 'uuid' },
            newName: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
      preHandler: async (r) => {
        await owner(r, true);
      },
    },
    async (r) => {
      const actor = await owner(r, true);
      if (!store.previewCollectorName)
        throw new ApiError(503, appText.collectorNamesUnavailable);
      return store.previewCollectorName(
        r.body.sourceId,
        r.body.newName,
        actor.id,
      );
    },
  );
  app.post<{ Body: { token: string } }>(
    '/api/v1/admin/collector-name-changes/apply',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['token'],
          properties: { token: { type: 'string', format: 'uuid' } },
        },
        headers: {
          type: 'object',
          required: ['idempotency-key'],
          properties: { 'idempotency-key': { type: 'string', format: 'uuid' } },
        },
      },
      preHandler: async (r) => {
        await owner(r, true);
      },
    },
    async (r) => {
      const actor = await owner(r, true),
        key = r.headers['idempotency-key'];
      if (!store.applyCollectorName || typeof key !== 'string')
        throw new ApiError(503, appText.collectorNamesUnavailable);
      return store.applyCollectorName(
        r.body.token,
        key,
        actor.id,
        actor.displayName,
      );
    },
  );
}
