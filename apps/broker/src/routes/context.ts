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

    // A valid token with no session id cannot carry a label: the taint would be
    // filed under a key nothing can look up at authorization time, which is
    // worse than refusing. Deny rather than register unlabelled context.
    const sessionId = tokenResult.sessionId;
    if (!sessionId) {
      app.services.providence.append({
        eventType: 'deny',
        correlationId,
        subjectId: tokenResult.subjectId,
        reasonCode: 'ERR_POLICY_VIOLATION',
        metadata: { stage: 'context-register', reason: 'token carries no session id' }
      });
      return reply.code(403).send({
        code: 'ERR_POLICY_VIOLATION',
        message: 'Token carries no session identity; context cannot be labelled.',
        correlationId
      });
    }

    app.services.registeredManifests.add(manifestHash);

    // Join the declared origins of every registered element into the session
    // label. This is the step CCI has to cross: material fetched from an
    // untrusted page raises the label of the session that registered it, and the
    // raise survives any transform the agent performs afterwards, including a
    // decrypt inside its own runtime that the broker cannot observe.
    const sessionLabel = app.services.sessionLabels.joinElements(
      sessionId,
      parsed.data.elements,
      correlationId
    );
    app.services.providence.append({
      eventType: 'invoke',
      correlationId,
      sessionId: tokenResult.sessionId,
      subjectId: tokenResult.subjectId,
      metadata: {
        stage: 'context-register',
        manifestHash,
        elementCount: sorted.length,
        sessionLabel,
        sessionTainted: app.services.sessionLabels.isTainted(sessionId)
      }
    });

    return reply.code(200).send({ correlationId, manifestHash, elementCount: sorted.length });
  });
}
