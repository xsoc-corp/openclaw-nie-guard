import type { FastifyInstance } from 'fastify';
import { InvokeRequest } from '@xsoc/shared-types';
import { randomUUID } from 'node:crypto';

export async function registerInvokeRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/invoke', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = InvokeRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid invoke request shape.', correlationId });
    }

    // TODO(xsoc-openclaw-poc): wire full pipeline:
    //   1. verifyToken via bindings
    //   2. validate TSTL envelope
    //   3. evaluate policy
    //   4. route through fhe-gate per classification
    //   5. forward via openclaw-adapter
    //   6. emit providence event
    return reply.code(501).send({ code: 'ERR_OPENCLAW_FORWARD_FAILED', message: 'Invoke pipeline not wired in skeleton.', correlationId });
  });
}
