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

import type { FheGate } from './gate.js';
import { createMockFheGate } from './mock.js';

export { FheGate } from './gate.js';
export { createMockFheGate } from './mock.js';
export type { ModeASelection, ModeBSelection, ModeCSelection, GateDecision } from './types.js';

/**
 * Async loader for the FHE gate.
 *
 * Public package returns the mock gate. The production package
 * (@xsoc/fhe-gate-prod) overrides this loader via the pnpm workspace
 * override and dispatches on XSOC_FHE_MODE to return a real gRPC-backed
 * gate. See PROD_INTERFACE.md section 2.2 in the private repo.
 *
 * The broker calls await loadFheGate() so the same boot path holds for
 * both the public reference build and the production override.
 */
export async function loadFheGate(): Promise<FheGate> {
  return createMockFheGate();
}