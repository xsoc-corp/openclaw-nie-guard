import { z } from 'zod';

// TSTL continuity envelope (application schema; cryptographic sealing is a separate private primitive).
// Every field documented here is part of the public interface. The sealing construction itself
// is documented by stated security properties, not internals. See docs/disclosure-policy.md.
export const TstlEnvelope = z.object({
  deviceFingerprint: z.string().min(1),
  sessionId: z.string().uuid(),
  sessionNonceLineage: z.array(z.string()).min(1),
  roleScopeHash: z.string().length(64),
  operationType: z.string().min(1),
  targetHash: z.string().length(64),
  directionality: z.enum(['inbound', 'outbound', 'bidirectional']),
  brokerPathId: z.string().min(1),
  processContextFingerprint: z.string().optional(),
  networkPathFingerprint: z.string().optional(),
  contextManifestHash: z.string().length(64),
  intentHash: z.string().length(64),
  intentClass: z.enum(['read', 'write', 'analyze', 'export', 'execute', 'escalate']),
  classification: z.enum(['public', 'sensitive', 'regulated', 'classified-adjacent']),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  counter: z.number().int().nonnegative()
});
export type TstlEnvelope = z.infer<typeof TstlEnvelope>;

// Sealed envelope is the opaque form carried over the wire.
// The seal() and verify() primitives live in the NIE bindings and are opaque to callers.
export const SealedEnvelope = z.string().min(1);
export type SealedEnvelope = z.infer<typeof SealedEnvelope>;
