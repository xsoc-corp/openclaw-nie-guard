import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Dual-control cosign endpoint. A second attested principal submits a cosign receipt
// referencing the original correlationId. The broker emits dual_control_granted.
//
// The cosign receipt format mirrors the admission capability and is validated by the
// same NIE bindings. This endpoint does not itself perform the invoke; the client retries
// /v1/invoke with the cosign receipt once granted.

const CosignRequest = z.object({
  targetCorrelationId: z.string().uuid(),
  cosignCapabilityToken: z.string().min(1),
  cosignEnvelope: z.string().min(1),
  decision: z.enum(['grant', 'deny']),
  reason: z.string().min(1)
});

export async function registerCosignRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/cosign', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = CosignRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid cosign request.', correlationId });
    }

    // Verify cosign token belongs to a distinct principal.
    const verification = await app.services.bindings.verifyToken(parsed.data.cosignCapabilityToken);
    if (!verification.valid) {
      app.services.providence.append({
        eventType: 'dual_control_denied',
        correlationId,
        reasonCode: verification.reasonCode,
        metadata: { stage: 'cosign-token' }
      });
      return reply.code(401).send({ code: verification.reasonCode, message: 'Cosign token invalid.', correlationId });
    }

    const eventType = parsed.data.decision === 'grant' ? 'dual_control_granted' : 'dual_control_denied';
    const event = app.services.providence.append({
      eventType,
      correlationId,
      subjectId: verification.subjectId,
      metadata: {
        targetCorrelationId: parsed.data.targetCorrelationId,
        decision: parsed.data.decision,
        reason: parsed.data.reason
      }
    });

    return reply.code(200).send({
      correlationId,
      decision: parsed.data.decision,
      providenceEventId: event.eventId
    });
  });
}
