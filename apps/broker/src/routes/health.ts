import type { FastifyInstance } from 'fastify';

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  // Not ok while the Providence chain refuses appends: every action the broker
  // records is denied in that state, so it does not report itself serving.
  app.get('/health', async (_req, reply) => {
    const refusal = app.services.providence.log.refusal;
    if (refusal) return reply.code(503).send({ status: 'providence-unavailable', reason: refusal });
    return { status: 'ok' };
  });
}
