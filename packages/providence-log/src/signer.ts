import { createHash, timingSafeEqual } from 'node:crypto';
import type { AnchorSignatureAlgorithm } from '@xsoc/shared-types';

// Signing surface for Providence anchors. The production implementation is
// substituted from the private deployment repo via pnpm workspace override, the
// same seam used for @xsoc/nie-bindings and @xsoc/fhe-gate. This repository ships
// a non-cryptographic mock only, per docs/disclosure-policy.md.
export interface ProvidenceSigner {
  readonly algorithm: AnchorSignatureAlgorithm;
  readonly keyId: string;
  sign(canonicalAnchor: string): Promise<string>;
  verify(canonicalAnchor: string, signature: string): Promise<boolean>;
}

// Constant-time hex comparison. Used so mock verification does not introduce a
// timing side channel pattern that would be copied into a real implementation.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// MOCK. NOT CRYPTOGRAPHIC. A deterministic digest with no key material and no
// unforgeability property. Anyone can recompute it. It exists so the anchor path
// is exercisable in this repository without production bindings. Its algorithm
// identifier is mock-unsigned and that value is written into every anchor it
// produces, so a mock anchor is always distinguishable from a signed one.
export class MockProvidenceSigner implements ProvidenceSigner {
  readonly algorithm: AnchorSignatureAlgorithm = 'mock-unsigned';
  readonly keyId = 'mock-key';

  async sign(canonicalAnchor: string): Promise<string> {
    return createHash('sha256').update(`mock:${canonicalAnchor}`).digest('hex');
  }

  async verify(canonicalAnchor: string, signature: string): Promise<boolean> {
    return timingSafeEqualHex(await this.sign(canonicalAnchor), signature);
  }
}

// Fail-closed deployment guard. Call during startup anywhere unsigned anchors are
// unacceptable. Throws rather than warning: a deployment that reaches production
// on the mock signer has no non-repudiation at all, and that must stop the process
// rather than be logged and ignored.
export function assertRealSigner(signer: ProvidenceSigner): void {
  if (signer.algorithm === 'mock-unsigned') {
    throw new Error(
      'ProvidenceSigner is the non-cryptographic mock. Anchors would carry no real ' +
      'signature. Supply a production signer via workspace override before serving.'
    );
  }
}