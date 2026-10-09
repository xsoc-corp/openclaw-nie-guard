// The broker's Providence chain at startup: a real signer, proved before
// serving, anchors on the first record and at shutdown, and a chain that fails
// its integrity check leaves every recorded action denied.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { anchorMessage, headCommitment, recordDigest } from '@xsoc/providence-log';
import { ProvidenceRecord } from '@xsoc/shared-types';
import { ephemeralSigner } from '@xsoc/providence-signer';

const dataDir = mkdtempSync(join(tmpdir(), 'broker-providence-'));

let buildServer: typeof import('../src/server.js').buildServer;

beforeAll(async () => {
  process.env.PROVIDENCE_DATA_DIR = dataDir;
  process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
  process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-test';
  delete process.env.PROVIDENCE_ED25519_SEED_B64;
  process.env.LOG_LEVEL = 'silent';
  ({ buildServer } = await import('../src/server.js'));
});

describe('broker Providence startup', () => {
  it('starts with a fresh-key signer, records, and anchors on the first record and at close', async () => {
    const signer = await ephemeralSigner();
    const app = await buildServer({ signer });
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);

    const r = await app.inject({ method: 'POST', url: '/v1/invoke', payload: {} });
    expect(r.statusCode).toBe(400);
    await new Promise((res) => setTimeout(res, 50));
    expect(readdirSync(join(dataDir, 'anchors'))).toHaveLength(1);

    await app.inject({ method: 'POST', url: '/v1/invoke', payload: { x: 1 } });
    await app.close();
    const anchors = readdirSync(join(dataDir, 'anchors')).sort();
    expect(anchors).toHaveLength(2);

    const lines = readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trimEnd().split('\n');
    const records = lines.map((l) => ProvidenceRecord.parse(JSON.parse(l)));
    expect(records.map((x) => x.event_type)).toEqual(['deny', 'deny']);
    const last = JSON.parse(readFileSync(join(dataDir, 'anchors', anchors[1]!), 'utf8'));
    expect(last.head_seq).toBe(2);
    const commitment = headCommitment(2, recordDigest(records[1]!), 'aida-guard/broker-test');
    expect(last.commitment).toBe(commitment.toString('hex'));
    const msg = anchorMessage(commitment, last.timestamp_ms, last.algorithm, last.key_id, Buffer.from(last.public_key, 'base64'));
    expect(last.algorithm).toBe(signer.algorithm);
    expect(last.public_key).toBe(Buffer.from(signer.publicKey).toString('base64'));
    expect(await signer.verify(msg, Buffer.from(last.signature, 'base64'))).toBe(true);
  });

  it('a chain whose last record disagrees with its head leaves every recorded action denied', async () => {
    // Startup checks the last record against the head; a rewrite further back
    // is the offline verifier's to find.
    const p = join(dataDir, 'chain-v3.jsonl');
    const lines = readFileSync(p, 'utf8').trimEnd().split('\n');
    lines[lines.length - 1] = lines[lines.length - 1]!.replace('"stage":"shape"', '"stage":"shapf"');
    writeFileSync(p, lines.join('\n') + '\n');
    const app = await buildServer({ signer: await ephemeralSigner() });
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(503);
    expect(health.json().status).toBe('providence-unavailable');
    const r = await app.inject({ method: 'POST', url: '/v1/invoke', payload: {} });
    expect(r.statusCode).toBe(500);
    await app.close();
  });
});
