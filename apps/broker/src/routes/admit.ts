import type { FastifyInstance } from 'fastify';
import { AdmissionRequest } from '@xsoc/shared-types';
import { randomUUID } from 'node:crypto';

export async function registerAdmitRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/admit', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = AdmissionRequest.safeParse(req.body);
    if (!parsed.success) {
      app.services.providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: 'ERR_ATTESTATION_FAILED',
        metadata: { validation: parsed.error.flatten() }
      });
      return reply.code(400).send({ code: 'ERR_ATTESTATION_FAILED', message: 'Invalid admission request shape.', correlationId });
    }

    try {
      const result = await app.services.bindings.attest(parsed.data);
      app.services.providence.append({
        eventType: 'admit',
        correlationId,
        sessionId: result.admission.sessionId,
        subjectId: result.subjectId,
        deviceFingerprint: result.deviceFingerprint,
        metadata: { profile: result.admission.profile, attestationFloor: result.attestationFloor }
      });
      return reply.code(200).send({ ...result.admission, correlationId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'attestation failed';
      app.services.providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: 'ERR_ATTESTATION_FAILED',
        metadata: { error: message }
      });
      return reply.code(401).send({ code: 'ERR_ATTESTATION_FAILED', message, correlationId });
    }
  });
}
