import type { FastifyInstance } from 'fastify';

export async function registerVersionRoute(app: FastifyInstance): Promise<void> {
  app.get('/version', async () => {
    const version = app.services.bindings.getVersion();
    return {
      broker: '0.1.0',
      bindings: version
    };
  });
}
