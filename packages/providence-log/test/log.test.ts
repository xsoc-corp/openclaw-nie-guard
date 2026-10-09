import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign, verify, createPublicKey } from 'node:crypto';
import { ProvidenceRecord } from '@xsoc/shared-types';
import {
  ProvidenceLog,
  ProvidenceUnavailable,
  AnchorScheduler,
  anchorIntervalSeconds,
  recordDigest,
  headCommitment,
  anchorMessage,
  keyIdOf,
  CHAIN_FILE,
  HEAD_FILE,
  type ProvidenceSigner
} from '../src/index.js';

const CHAIN_ID = 'aida-guard/test';
const FP = 'd1'.repeat(32);
const HANDLE = '5e'.repeat(32);

function dir(): string {
  return mkdtempSync(join(tmpdir(), 'providence-v3-'));
}

function testSigner(): ProvidenceSigner {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' });
  const raw = new Uint8Array(spki.subarray(spki.length - 32));
  return {
    algorithm: 'Ed25519',
    publicKey: raw,
    keyId: keyIdOf(raw),
    sign: async (m) => new Uint8Array(sign(null, m, privateKey)),
    verify: async (m, s) => verify(null, m, publicKey, s)
  };
}

function records(d: string): ProvidenceRecord[] {
  const text = readFileSync(join(d, CHAIN_FILE), 'utf8');
  return text.trimEnd().split('\n').map((l) => ProvidenceRecord.parse(JSON.parse(l)));
}

describe('ProvidenceLog v3', () => {
  it('appends linked records and advances the head', () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    const a = log.append({ eventType: 'admit', sessionId: HANDLE, deviceFingerprint: FP });
    const b = log.append({ eventType: 'invoke', sessionId: HANDLE, payloadDigest: 'c1'.repeat(32), metadata: { n: 1 } });
    const rs = records(d);
    expect(rs.map((r) => r.seq)).toEqual([0, 1]);
    expect(rs[0]!.prev_digest).toBe('0'.repeat(64));
    expect(rs[1]!.prev_digest).toBe(a.digest);
    expect(recordDigest(rs[1]!).toString('hex')).toBe(b.digest);
    const head = JSON.parse(readFileSync(join(d, HEAD_FILE), 'utf8'));
    expect(head).toEqual({ chain_id: CHAIN_ID, seq: 2, head_digest: b.digest });
  });

  it('a record line carries exactly the hashed fields', () => {
    const d = dir();
    new ProvidenceLog({ dir: d, chainId: CHAIN_ID }).append({ eventType: 'deny', reasonCode: 'ERR_X' });
    const line = JSON.parse(readFileSync(join(d, CHAIN_FILE), 'utf8'));
    expect(Object.keys(line)).toEqual([
      'domain', 'kind', 'seq', 'timestamp_ms', 'event_type', 'correlation_id', 'device_fingerprint',
      'session_handle', 'payload_digest', 'subject_id', 'operation_class', 'target_hash',
      'classification', 'reason_code', 'payload', 'metadata', 'prev_digest'
    ]);
  });

  it('metadata is inside the digest: changing it changes the digest', () => {
    const d = dir();
    new ProvidenceLog({ dir: d, chainId: CHAIN_ID }).append({ eventType: 'deny', metadata: { stage: 'a' } });
    const r = records(d)[0]!;
    const changed = { ...r, metadata: { stage: 'b' } };
    expect(recordDigest(changed).equals(recordDigest(r))).toBe(false);
  });

  it('refuses an append it cannot encode, and writes nothing', () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    expect(() => log.append({ eventType: 'deny', metadata: { x: 1.5 } })).toThrow();
    expect(() => log.append({ eventType: 'deny', sessionId: 'not-a-handle' })).toThrow();
    expect(existsSync(join(d, CHAIN_FILE))).toBe(false);
    expect(log.getHead().seq).toBe(0);
  });

  it('reopens at the head it left', () => {
    const d = dir();
    const first = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    first.append({ eventType: 'admit' });
    const last = first.append({ eventType: 'invoke' });
    const again = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    expect(again.refusal).toBeUndefined();
    expect(again.getHead()).toEqual({ chain_id: CHAIN_ID, seq: 2, head_digest: last.digest });
    expect(again.append({ eventType: 'revoke' }).record.prev_digest).toBe(last.digest);
  });

  it('refuses every append when the last record disagrees with the head', () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    log.append({ eventType: 'admit', subjectId: 'alice' });
    const p = join(d, CHAIN_FILE);
    writeFileSync(p, readFileSync(p, 'utf8').replace('alice', 'mallory'));
    const reopened = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    expect(reopened.refusal).toMatch(/computes to/);
    expect(() => reopened.append({ eventType: 'admit' })).toThrow(ProvidenceUnavailable);
  });

  it('refuses a chain written for another deployment', () => {
    const d = dir();
    new ProvidenceLog({ dir: d, chainId: CHAIN_ID }).append({ eventType: 'admit' });
    const other = new ProvidenceLog({ dir: d, chainId: 'aida-guard/other' });
    expect(other.refusal).toMatch(/not aida-guard\/other/);
  });

  it('refuses records with no head, a partial last line, and a malformed chain id', () => {
    const d = dir();
    new ProvidenceLog({ dir: d, chainId: CHAIN_ID }).append({ eventType: 'admit' });
    rmSync(join(d, HEAD_FILE));
    expect(new ProvidenceLog({ dir: d, chainId: CHAIN_ID }).refusal).toMatch(/is missing/);

    const e = dir();
    new ProvidenceLog({ dir: e, chainId: CHAIN_ID }).append({ eventType: 'admit' });
    appendFileSync(join(e, CHAIN_FILE), '{"domain":');
    expect(new ProvidenceLog({ dir: e, chainId: CHAIN_ID }).refusal).toMatch(/partial line/);

    expect(() => new ProvidenceLog({ dir: dir(), chainId: 'guard' })).toThrow(/aida-guard/);
  });

  it('replaces the head only if it is still the one it wrote', () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    log.append({ eventType: 'admit' });
    // Another writer moves the head under this one.
    writeFileSync(join(d, HEAD_FILE), JSON.stringify({ chain_id: CHAIN_ID, seq: 7, head_digest: 'ab'.repeat(32) }));
    expect(() => log.append({ eventType: 'invoke' })).toThrow(ProvidenceUnavailable);
    expect(log.refusal).toMatch(/not the one this writer last wrote/);
    expect(() => log.append({ eventType: 'invoke' })).toThrow(ProvidenceUnavailable);
  });

  it('carries the earlier chain head on the first v3 record, as a reference', () => {
    const d = dir();
    const legacy = join(d, 'chain.jsonl');
    writeFileSync(legacy, JSON.stringify({ eventHash: 'ee'.repeat(32) }) + '\n');
    const log = new ProvidenceLog({ dir: join(d, 'v3'), chainId: CHAIN_ID, legacyChainFile: legacy });
    const first = log.append({ eventType: 'admit' });
    const second = log.append({ eventType: 'invoke' });
    expect(first.record.prev_digest).toBe('0'.repeat(64));
    expect(first.record.metadata).toEqual({ legacy_chain_head: 'ee'.repeat(32) });
    expect(second.record.metadata).toBeNull();
  });

  it('signs an anchor over the head commitment', async () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    const last = log.append({ eventType: 'admit' });
    const signer = testSigner();
    const a = await log.exportAnchor(signer);
    const commitment = headCommitment(1, Buffer.from(last.digest, 'hex'), CHAIN_ID);
    expect(a.commitment).toBe(commitment.toString('hex'));
    const msg = anchorMessage(commitment, a.timestamp_ms, 'Ed25519', signer.keyId, signer.publicKey);
    expect(await signer.verify(msg, Buffer.from(a.signature, 'base64'))).toBe(true);
    expect(log.anchorFiles()).toHaveLength(1);
  });
});

describe('AnchorScheduler', () => {
  it('bounds the interval: 1 to 3600, default 300', () => {
    expect(anchorIntervalSeconds(undefined)).toBe(300);
    expect(anchorIntervalSeconds('3600')).toBe(3600);
    expect(anchorIntervalSeconds('1')).toBe(1);
    for (const bad of ['0', '3601', '-5', '1.5', 'x', ' 60']) expect(() => anchorIntervalSeconds(bad)).toThrow();
  });

  it('anchors on the first record after startup and at shutdown', async () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    const s = new AnchorScheduler(log, testSigner(), 3600);
    s.start();
    log.append({ eventType: 'admit' });
    await s.anchorNow(); // waits for the first-record anchor in flight
    expect(log.anchorFiles()).toHaveLength(1);
    log.append({ eventType: 'invoke' });
    await s.stop();
    const files = log.anchorFiles();
    expect(files).toHaveLength(2);
    expect(files[1]!.startsWith('000000000002-')).toBe(true);
    expect(readdirSync(join(d, 'anchors'))).toHaveLength(2);
  });

  it('a failed anchor leaves the log refusing appends', async () => {
    const d = dir();
    const log = new ProvidenceLog({ dir: d, chainId: CHAIN_ID });
    const broken: ProvidenceSigner = { ...testSigner(), sign: async () => { throw new Error('signer down'); } };
    const s = new AnchorScheduler(log, broken, 60);
    s.start();
    log.append({ eventType: 'admit' });
    await s.anchorNow();
    expect(log.refusal).toMatch(/signer down/);
    expect(() => log.append({ eventType: 'invoke' })).toThrow(ProvidenceUnavailable);
    await s.stop();
  });
});
