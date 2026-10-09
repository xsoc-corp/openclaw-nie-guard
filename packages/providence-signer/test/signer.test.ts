import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { anchorMessage, signerSelfTest } from '@xsoc/providence-log';
import { createProvidenceSigner, signerFromSeed, ED25519_SEED_ENV } from '../src/index.js';

const vectors = JSON.parse(
  readFileSync(new URL('../../providence-log/test/vectors/guard-providence-v3.json', import.meta.url), 'utf8')
);

describe('Ed25519 Providence signer', () => {
  it('reproduces the vector anchor signature from the vector seed', async () => {
    const signer = signerFromSeed(Buffer.from(vectors.anchor_ed25519_seed, 'hex'));
    const a = vectors.anchor;
    expect(Buffer.from(signer.publicKey).toString('base64')).toBe(a.public_key);
    expect(signer.keyId).toBe(a.key_id);
    const msg = anchorMessage(Buffer.from(a.commitment, 'hex'), a.timestamp_ms, a.algorithm, a.key_id, signer.publicKey);
    expect(msg.toString('hex')).toBe(vectors.anchor_message);
    // Ed25519 is deterministic, so the signature is the vector's exactly.
    expect(Buffer.from(await signer.sign(msg)).toString('base64')).toBe(a.signature);
  });

  it('passes the startup self-test, ephemeral or seeded', async () => {
    await signerSelfTest(await createProvidenceSigner({}));
    const seed = Buffer.alloc(32, 7).toString('base64');
    await signerSelfTest(await createProvidenceSigner({ [ED25519_SEED_ENV]: seed }));
  });

  it('refuses a seed that is not 32 bytes of standard base64', async () => {
    for (const bad of ['AAAA', Buffer.alloc(31).toString('base64'), Buffer.alloc(33).toString('base64'), '!'.repeat(44)]) {
      await expect(createProvidenceSigner({ [ED25519_SEED_ENV]: bad })).rejects.toThrow();
    }
  });

  it('zeroes the seed it imports', () => {
    const seed = Buffer.alloc(32, 9);
    signerFromSeed(seed);
    expect(seed.every((b) => b === 0)).toBe(true);
  });

  it('records its algorithm, and the self-test refuses it where only ML-DSA-65 is allowed', async () => {
    const signer = await createProvidenceSigner({});
    expect(signer.algorithm).toBe('Ed25519');
    await expect(signerSelfTest(signer, ['ML-DSA-65'])).rejects.toThrow(/not one of ML-DSA-65/);
  });
});
