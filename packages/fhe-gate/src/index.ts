// @xsoc/fhe-gate
//
// FHE Context Gate. Mediates sensitive context between the agent and the model/OpenClaw.
// Three modes:
//   A - Full FHE. Operations run on ciphertext. Model never sees cleartext.
//   B - Tokenized substitution. Sensitive fields replaced with opaque tokens.
//   C - Attested cleartext. Cleartext released only with endpoint attestation, policy approval,
//       and Providence-logged decryption event.
//
// Public repo ships the mock gate. Production gate bridges to XSOC FHE SDK via the Java
// gRPC wrapper (5-10x faster than JNI path). Substitution happens via workspace override.

export { FheGate } from './gate.js';
export { createMockFheGate } from './mock.js';
export type { ModeASelection, ModeBSelection, ModeCSelection, GateDecision } from './types.js';
