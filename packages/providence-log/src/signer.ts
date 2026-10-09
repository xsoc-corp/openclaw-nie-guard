import type { AnchorSignatureAlgorithm } from '@xsoc/shared-types';
import { keyIdOf } from './encoding.js';

// The surface a Providence anchor is signed through. @xsoc/providence-signer
// provides it: an Ed25519 signer in this repository, replaced in the production
// deployment by an ML-DSA-65 signer through the same workspace alias seam used
// for @xsoc/nie-bindings and @xsoc/fhe-gate. There is no mock.
export interface ProvidenceSigner {
  readonly algorithm: AnchorSignatureAlgorithm;
  /** The raw public key anchors embed and a verifier pins. */
  readonly publicKey: Uint8Array;
  /** First 16 lowercase hex of SHA-256(publicKey). */
  readonly keyId: string;
  sign(message: Uint8Array): Promise<Uint8Array>;
  verify(message: Uint8Array, signature: Uint8Array): Promise<boolean>;
}

export class SignerSelfTestFailed extends Error {
  constructor(reason: string) {
    super(`Providence signer self-test failed: ${reason}`);
    this.name = 'SignerSelfTestFailed';
  }
}

const SELF_TEST_MESSAGE = Buffer.from('xsoc-aida-guard:providence-signer:self-test:v1', 'utf8');

/**
 * Run at startup, before any anchor is written: the key id must be the id of
 * the public key, a signature over a fixed message must verify, and the same
 * signature must not verify over a different message. Throws on any failure, so
 * a process holding a signer that cannot sign does not start. The test lives
 * here rather than in the signer, so a signer does not vouch for itself.
 */
export async function signerSelfTest(signer: ProvidenceSigner, allowed?: readonly AnchorSignatureAlgorithm[]): Promise<void> {
  if (allowed && !allowed.includes(signer.algorithm)) {
    throw new SignerSelfTestFailed(`algorithm ${signer.algorithm} is not one of ${allowed.join(', ')}`);
  }
  if (signer.keyId !== keyIdOf(signer.publicKey)) {
    throw new SignerSelfTestFailed(`key id ${signer.keyId} is not the id of the public key`);
  }
  let signature: Uint8Array;
  try {
    signature = await signer.sign(SELF_TEST_MESSAGE);
  } catch (err) {
    throw new SignerSelfTestFailed(`sign threw: ${(err as Error).message}`);
  }
  if (!(await signer.verify(SELF_TEST_MESSAGE, signature))) {
    throw new SignerSelfTestFailed('a fresh signature does not verify');
  }
  const altered = Buffer.from(SELF_TEST_MESSAGE);
  altered[0] = (altered[0] ?? 0) ^ 0x01;
  if (await signer.verify(altered, signature)) {
    throw new SignerSelfTestFailed('a signature verifies over a different message');
  }
}
