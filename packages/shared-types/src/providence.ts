import { z } from 'zod';

// Providence event types. Every security-relevant decision produces one of these.
export const ProvidenceEventType = z.enum([
  'admit',
  'deny',
  'invoke',
  'revoke',
  'continuity_fail',
  'replay_fail',
  'scope_fail',
  'target_mismatch',
  'admin_attempt',
  'tool_block',
  'intent_drift',
  'classification_violation',
  'mcp_block',
  'mcp_tainted',
  'skill_unsigned',
  'skill_blocked',
  'policy_bundle_loaded',
  'policy_bundle_rejected',
  'dual_control_requested',
  'dual_control_granted',
  'dual_control_denied',
  'mode_c_decryption',
  'profile_escalated',
  'profile_deescalated',
  'endpoint_attestation_fail'
]);
export type ProvidenceEventType = z.infer<typeof ProvidenceEventType>;

export const ProvidenceEvent = z.object({
  eventId: z.string().uuid(),
  eventType: ProvidenceEventType,
  correlationId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  subjectId: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  operationClass: z.string().optional(),
  targetHash: z.string().optional(),
  classification: z.string().optional(),
  reasonCode: z.string().optional(),
  timestamp: z.number().int().positive(),
  previousEventHash: z.string().length(64),
  eventHash: z.string().length(64),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type ProvidenceEvent = z.infer<typeof ProvidenceEvent>;

// Signature algorithm binding a Providence anchor. ML-DSA-65 (FIPS 204) is the
// default for new deployments. XSOC-QSIG is selectable as an adjunct. The value
// mock-unsigned indicates the non-cryptographic mock signer and carries no
// unforgeability guarantee; it is visible in the anchor so a consumer can never
// mistake a mock anchor for a signed one.
export const AnchorSignatureAlgorithm = z.enum(['ML-DSA-65', 'XSOC-QSIG', 'mock-unsigned']);
export type AnchorSignatureAlgorithm = z.infer<typeof AnchorSignatureAlgorithm>;

// A signed anchor over the Providence chain head. The hash chain provides tamper
// evidence between anchors. The signature provides non-repudiation of the chain
// state at the anchor point.
export const SignedAnchor = z.object({
  anchorId: z.string().uuid(),
  headHash: z.string().length(64),
  eventCount: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
  algorithm: AnchorSignatureAlgorithm,
  keyId: z.string().min(1),
  signature: z.string().min(1)
});
export type SignedAnchor = z.infer<typeof SignedAnchor>;
