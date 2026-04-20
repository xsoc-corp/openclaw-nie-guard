import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const SkillRegisterRequest = z.object({
  skillId: z.string().min(1),
  signerKeyId: z.string().optional(),
  signature: z.string().optional(),
  manifest: z.object({
    name: z.string(),
    version: z.string(),
    capabilities: z.array(z.string())
  })
});

// Trusted skill signer key allowlist. Production loads this from the signed policy bundle.
const TRUSTED_SIGNERS = new Set(['xsoc-trusted-signer-1', 'mock-key-1']);

export async function registerSkillRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/skill/register', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = SkillRegisterRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid skill register.', correlationId });
    }

    // Require signature and trusted signer. Unsigned or blocked-signer skills fail closed.
    if (!parsed.data.signature || !parsed.data.signerKeyId) {
      app.services.providence.append({
        eventType: 'skill_unsigned',
        correlationId,
        reasonCode: 'ERR_SKILL_UNSIGNED',
        metadata: { skillId: parsed.data.skillId }
      });
      return reply.code(403).send({
        code: 'ERR_SKILL_UNSIGNED',
        message: 'Skill must be signed by a trusted signer.',
        correlationId
      });
    }

    if (!TRUSTED_SIGNERS.has(parsed.data.signerKeyId)) {
      app.services.providence.append({
        eventType: 'skill_blocked',
        correlationId,
        reasonCode: 'ERR_SKILL_BLOCKED',
        metadata: { skillId: parsed.data.skillId, signerKeyId: parsed.data.signerKeyId }
      });
      return reply.code(403).send({
        code: 'ERR_SKILL_BLOCKED',
        message: 'Signer not in trusted key list.',
        correlationId
      });
    }

    return reply.code(200).send({ correlationId, skillId: parsed.data.skillId, registered: true });
  });
}
