import { z } from 'zod';

// Providence event types. Every security-relevant decision produces one of these.
export const ProvidenceEventType = z.enum([
  'admit',
  'deny',
  'invoke',
  'revoke',
  'continuity_fail',
  'envelope_rejected',
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

const hex64 = z.string().regex(/^[0-9a-f]{64}$/);
const hex64OrEmpty = z.union([hex64, z.literal('')]);
const safeInt = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

// The typed Guard payload of a Providence record (docs/providence-record-v3.md,
// section 2). Only these four fields; a record carrying any other is refused.
export const GuardPayload = z
  .object({
    decision_vector: z.array(z.object({ check: z.string(), result: z.string() }).strict()).optional(),
    argument_digest: hex64.optional(),
    ancestor_hashes: z.array(hex64).optional(),
    matched_grant_index: safeInt.optional()
  })
  .strict();
export type GuardPayload = z.infer<typeof GuardPayload>;

// What a caller hands the Providence log. The log assigns the position, the
// time and the link to the previous record.
export const ProvidenceAppendInput = z.object({
  eventType: ProvidenceEventType,
  correlationId: z.string().optional(),
  // The NIE session handle: 64 lowercase hex (32 bytes).
  sessionId: hex64.optional(),
  subjectId: z.string().optional(),
  deviceFingerprint: hex64.optional(),
  // SHA-256 of what the decision was about. For a continuity envelope, the
  // digest of its canonical readable copy, never of its sealed bytes.
  payloadDigest: hex64.optional(),
  operationClass: z.string().optional(),
  targetHash: z.string().optional(),
  classification: z.string().optional(),
  reasonCode: z.string().optional(),
  payload: GuardPayload.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type ProvidenceAppendInput = z.infer<typeof ProvidenceAppendInput>;

// One record of the AIDA-Guard Providence chain, encoding v3, exactly as it
// sits on its line: these fields and no others, every one present.
export const ProvidenceRecord = z
  .object({
    domain: z.literal('xsoc-aida-guard:providence-record:v3'),
    kind: z.literal(2),
    seq: safeInt,
    timestamp_ms: safeInt,
    event_type: ProvidenceEventType,
    correlation_id: z.string(),
    device_fingerprint: hex64OrEmpty,
    // The NIE session handle, 64 lowercase hex, or empty.
    session_handle: hex64OrEmpty,
    payload_digest: hex64OrEmpty,
    subject_id: z.string(),
    operation_class: z.string(),
    target_hash: z.string(),
    classification: z.string(),
    reason_code: z.string(),
    payload: GuardPayload.nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    prev_digest: hex64
  })
  .strict();
export type ProvidenceRecord = z.infer<typeof ProvidenceRecord>;

// Signature algorithm binding a Providence anchor. ML-DSA-65 (FIPS 204) is the
// production deployment's, through AWS-LC; Ed25519 is the public build's.
export const AnchorSignatureAlgorithm = z.enum(['ML-DSA-65', 'Ed25519']);
export type AnchorSignatureAlgorithm = z.infer<typeof AnchorSignatureAlgorithm>;

// A signed anchor over a head commitment of the chain (section 5).
export const ProvidenceAnchor = z
  .object({
    chain_id: z.string().regex(/^aida-guard\/.+$/),
    head_seq: safeInt,
    head_digest: hex64,
    commitment: hex64,
    timestamp_ms: safeInt,
    algorithm: AnchorSignatureAlgorithm,
    key_id: z.string().regex(/^[0-9a-f]{16}$/),
    public_key: z.string().min(1),
    signature: z.string().min(1)
  })
  .strict();
export type ProvidenceAnchor = z.infer<typeof ProvidenceAnchor>;
