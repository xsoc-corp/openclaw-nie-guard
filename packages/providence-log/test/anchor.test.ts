import { describe, it, expect } from 'vitest';
import { mkdtempSync, appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProvidenceLog } from '../src/log.js';
import { verifyAnchor } from '../src/verifier.js';
import { MockProvidenceSigner, assertRealSigner } from '../src/signer.js';

function newChain(): string {
  return join(mkdtempSync(join(tmpdir(), 'prov-')), 'chain.jsonl');
}

function seed(path: string, n: number): ProvidenceLog {
  const log = new ProvidenceLog(path);
  for (let i = 0; i < n; i++) {
    log.append({ eventType: 'invoke', correlationId: crypto.randomUUID() });
  }
  return log;
}

describe('signed Providence anchors', () => {
  it('produces an anchor whose head and count match the chain', async () => {
    const path = newChain();
    const log = seed(path, 3);
    const anchor = await log.exportAnchor(new MockProvidenceSigner());
    expect(anchor.headHash).toBe(log.getHead());
    expect(anchor.eventCount).toBe(3);
    expect(anchor.signature).toBeTruthy();
  });

  it('rejects a mock-signed anchor as evidence, fail-closed', async () => {
    const path = newChain();
    const log = seed(path, 2);
    const signer = new MockProvidenceSigner();
    const anchor = await log.exportAnchor(signer);
    const result = await verifyAnchor(path, anchor, signer);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('mock');
  });

  it('detects a tampered signature', async () => {
    const path = newChain();
    const log = seed(path, 2);
    const signer = new MockProvidenceSigner();
    const anchor = await log.exportAnchor(signer);
    const forged = { ...anchor, algorithm: 'ML-DSA-65' as const, signature: 'ff'.repeat(32) };
    const result = await verifyAnchor(path, forged, signer);
    expect(result.valid).toBe(false);
  });

  it('detects a head-hash mismatch after the chain moves on', async () => {
    const path = newChain();
    const log = seed(path, 2);
    const signer = new MockProvidenceSigner();
    const anchor = await log.exportAnchor(signer);
    log.append({ eventType: 'deny', correlationId: crypto.randomUUID() });
    const stale = { ...anchor, algorithm: 'ML-DSA-65' as const };
    const result = await verifyAnchor(path, stale, signer);
    expect(result.valid).toBe(false);
  });

  it('assertRealSigner throws on the mock', () => {
    expect(() => assertRealSigner(new MockProvidenceSigner())).toThrow(/mock/i);
  });

  it('restores eventCount across a restart', async () => {
    const path = newChain();
    seed(path, 4);
    const reopened = new ProvidenceLog(path);
    const anchor = await reopened.exportAnchor(new MockProvidenceSigner());
    expect(anchor.eventCount).toBe(4);
  });
});