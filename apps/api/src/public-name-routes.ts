import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { WorkBudget, type PublicNameChangeInput } from '@clog/domain';
import * as appText from '@clog/domain';
import { ApiError } from './types.js';
import { PreviewWork } from './preview-work.js';
import type { PublicNameChangesService } from './public-collector-names.js';
export function publicNameRoutes(
  app: FastifyInstance,
  service: PublicNameChangesService | undefined,
  origin: string | undefined,
) {
  const work = new PreviewWork(
    new WorkBudget({ concurrent: 2, perMinute: 30 }, [
      { concurrent: 1, perMinute: 5 },
    ]),
  );
  app.addHook('onClose', async () => work.budget.close());
  app.get('/api/v1/collector-name-changes', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { enabled: service ? (await service.settings()).enabled : false };
  });
  app.post<{ Body: PublicNameChangeInput }>(
    '/api/v1/collector-name-changes',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['oldName', 'newName'],
          properties: {
            oldName: { type: 'string', minLength: 1, maxLength: 80 },
            newName: { type: 'string', minLength: 1, maxLength: 80 },
          },
        },
        headers: {
          type: 'object',
          required: ['idempotency-key'],
          properties: { 'idempotency-key': { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      if (!origin || request.headers.origin !== origin)
        throw new ApiError(403, appText.publicNamesDisabled);
      if (!service) throw new ApiError(503, appText.publicNamesStaffRequired);
      const key = request.headers['idempotency-key'] as string,
        prior = await service.replay(request.body, key);
      if (prior) return prior;
      const source = createHash('sha256').update(request.ip).digest('hex');
      return work.run(request, reply, source, (signal) =>
        service.change(request.body, key, signal),
      );
    },
  );
}
