// @xsoc/providence-signer
//
// The signer AIDA-Guard Providence anchors are signed through. This package is
// the public build's: Ed25519 (RFC 8032) through Node's built-in crypto, with the
// algorithm recorded in every anchor. The production deployment replaces it,
// through a workspace alias, with an ML-DSA-65 signer over AWS-LC that never
// resolves from this repository. There is no mock signer.
//
// The key: PROVIDENCE_ED25519_SEED_B64, a 32-byte Ed25519 seed in standard
// base64, when the chain must verify across restarts under one pinned key; an
// ephemeral key otherwise. Either way the public key is the signer's to
// publish, and a verifier pins it with xsoc-audit-verify --anchor-key.

import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from 'node:crypto';
import { keyIdOf, type ProvidenceSigner } from '@xsoc/providence-log';

export const ED25519_SEED_ENV = 'PROVIDENCE_ED25519_SEED_B64';

/**
 * The anchor algorithms a broker built with this package accepts from its
 * signer at startup. The production package names ML-DSA-65 alone, which is how
 * the production build refuses any other algorithm.
 */
export const ALLOWED_ANCHOR_ALGORITHMS = ['Ed25519'] as const;

/**
 * The build this signer belongs to. The production package says production,
 * under which the broker requires PROVIDENCE_CHAIN_ID.
 */
export const BUILD_PROFILE: 'public' | 'production' = 'public';

// DER prefix of a PKCS#8 Ed25519 private key; the 32-byte seed follows it.
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

class Ed25519Signer implements ProvidenceSigner {
  readonly algorithm = 'Ed25519' as const;
  readonly publicKey: Uint8Array;
  readonly keyId: string;

  constructor(
    private readonly privateKey: KeyObject,
    private readonly publicKeyObject: KeyObject
  ) {
    const spki = publicKeyObject.export({ format: 'der', type: 'spki' });
    this.publicKey = new Uint8Array(spki.subarray(spki.length - 32));
    this.keyId = keyIdOf(this.publicKey);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(sign(null, message, this.privateKey));
  }

  async verify(message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    try {
      return verify(null, message, this.publicKeyObject, signature);
    } catch {
      return false;
    }
  }
}

/** An Ed25519 signer from a 32-byte seed. The seed buffer is zeroed after import. */
export function signerFromSeed(seed: Buffer): ProvidenceSigner {
  if (seed.length !== 32) throw new Error('an Ed25519 seed is 32 bytes');
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  try {
    const privateKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    return new Ed25519Signer(privateKey, createPublicKey(privateKey));
  } finally {
    der.fill(0);
    seed.fill(0);
  }
}

/** A signer under a fresh key, for a process that must not read the deployment's. */
export async function ephemeralSigner(): Promise<ProvidenceSigner> {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return new Ed25519Signer(privateKey, publicKey);
}

/**
 * The signer for this process: from PROVIDENCE_ED25519_SEED_B64 when it is set,
 * which must then be standard base64 of exactly 32 bytes, or ephemeral.
 */
export async function createProvidenceSigner(env: NodeJS.ProcessEnv = process.env): Promise<ProvidenceSigner> {
  const raw = env[ED25519_SEED_ENV];
  if (raw !== undefined && raw !== '') {
    if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) throw new Error(`${ED25519_SEED_ENV} is not standard base64 of 32 bytes`);
    return signerFromSeed(Buffer.from(raw, 'base64'));
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return new Ed25519Signer(privateKey, publicKey);
}
