import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const RevokeBody = z.object({
  kind: z.enum(['subject', 'session', 'device']),
  id: z.string().min(1),
  reason: z.string().min(1)
});

export async function registerRevokeRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/revoke', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = RevokeBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid revoke request.', correlationId });
    }
    const result = await app.services.bindings.revokeSubject(parsed.data);
    app.services.providence.append({
      eventType: 'revoke',
      correlationId,
      reasonCode: parsed.data.reason,
      metadata: { kind: parsed.data.kind, id: parsed.data.id, channelsNotified: result.channelsNotified }
    });
    return reply.code(200).send({ ...result, correlationId });
  });
}
