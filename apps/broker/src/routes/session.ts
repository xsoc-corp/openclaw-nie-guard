import type { FastifyInstance } from 'fastify';

export async function registerSessionRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/session/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    // TODO(xsoc-openclaw-poc): wire session state store.
    return reply.code(501).send({ sessionId: id, status: 'not-implemented' });
  });
}
