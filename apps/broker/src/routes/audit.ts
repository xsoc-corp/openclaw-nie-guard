import type { FastifyInstance } from 'fastify';

export async function registerAuditRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/audit/:correlationId', async (req, reply) => {
    const { correlationId } = req.params as { correlationId: string };
    // TODO(xsoc-openclaw-poc): index chain by correlationId and return events.
    return reply.code(501).send({ correlationId, status: 'not-implemented' });
  });
}
