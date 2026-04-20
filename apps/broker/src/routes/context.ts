import type { FastifyInstance } from 'fastify';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';

// Register a content manifest in the Providence chain and the in-memory registry.
// Clients call this before an invoke that references sensitive context.
const RegisterRequest = z.object({
  capabilityToken: z.string().min(1),
  elements: z.array(z.object({
    elementId: z.string().uuid(),
    provenance: z.enum(['user', 'system', 'rag', 'tool-output', 'mcp-response', 'external-channel']),
    classification: z.enum(['public', 'sensitive', 'regulated', 'classified-adjacent']),
    contentHash: z.string().length(64)
  }))
});

export async function registerContextRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/context/register', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = RegisterRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid register request.', correlationId });
    }
    const tokenResult = await app.services.bindings.verifyToken(parsed.data.capabilityToken);
    if (!tokenResult.valid) {
      return reply.code(401).send({ code: tokenResult.reasonCode, message: 'Invalid token.', correlationId });
    }

    // Build the manifest hash over sorted element hashes.
    const sorted = [...parsed.data.elements].sort((a, b) => a.elementId.localeCompare(b.elementId));
    const manifestHash = createHash('sha256')
      .update(JSON.stringify(sorted.map((e) => `${e.elementId}:${e.contentHash}:${e.classification}:${e.provenance}`)))
      .digest('hex');

    app.services.registeredManifests.add(manifestHash);
    app.services.providence.append({
      eventType: 'invoke',
      correlationId,
      sessionId: tokenResult.sessionId,
      subjectId: tokenResult.subjectId,
      metadata: { stage: 'context-register', manifestHash, elementCount: sorted.length }
    });

    return reply.code(200).send({ correlationId, manifestHash, elementCount: sorted.length });
  });
}
