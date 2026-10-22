// GET /v1/audit: the Providence chain, read-only, by sequence, operators only. Each
// record is served as the chain file holds it, so what an operator downloads is what
// the offline verifier checks.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockFheGate } from '@xsoc/fhe-gate';
import { createMockBindings } from '@xsoc/nie-bindings';
import { OperatorAuth } from '../src/lib/operator-auth.js';

const TOKEN = 'operator-token-' + randomUUID();
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const dataDir = mkdtempSync(join(tmpdir(), 'broker-audit-'));
let app: FastifyInstance;

beforeAll(async () => {
  process.env.PROVIDENCE_DATA_DIR = dataDir;
  process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
  process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-audit-test';
  process.env.LOG_LEVEL = 'silent';
  const { buildServer } = await import('../src/server.js');
  app = await buildServer({
    signer: await ephemeralSigner(),
    fheGate: createMockFheGate(),
    bindings: createMockBindings(),
    operatorAuth: new OperatorAuth([sha256(TOKEN)])
  });
  // Seven admissions: seven records, and the scheduler's anchor on the first.
  for (let i = 0; i < 7; i++) {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/admit',
      payload: {
        attestationPackage: 'mock-attestation-' + randomUUID(),
        requestedRole: 'operator',
        requestedOperationSet: ['tool.invoke'],
        clientMetadata: { deviceFingerprint: 'dev-audit', userAgent: 'test', sdkVersion: '0' }
      }
    });
    expect(r.statusCode).toBe(200);
  }
});

afterAll(async () => {
  await app.close();
});

const get = (url: string, token: string | null = TOKEN) =>
  app.inject({ method: 'GET', url, headers: token === null ? {} : { authorization: `Bearer ${token}` } });

describe('GET /v1/audit', () => {
  it('refuses a request without an operator token, or with the wrong one', async () => {
    expect((await get('/v1/audit', null)).statusCode).toBe(401);
    expect((await get('/v1/audit', 'not-the-token')).statusCode).toBe(401);
    const basic = await app.inject({ method: 'GET', url: '/v1/audit', headers: { authorization: `Basic ${TOKEN}` } });
    expect(basic.statusCode).toBe(401);
  });

  it('serves every record line byte for byte, with the head and its commitment', async () => {
    const r = await get('/v1/audit');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.chain_id).toBe('aida-guard/broker-audit-test');
    const file = readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8');
    expect(body.records.map((x: { line: string }) => x.line + '\n').join('')).toBe(file);
    expect(body.head.seq).toBe(body.records.length);
    expect(body.head.head_digest).toBe(body.records[body.records.length - 1].digest);
    expect(body.head.commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(body.next).toBe(body.head.seq);
    expect(JSON.parse(readFileSync(join(dataDir, 'head-v3.json'), 'utf8'))).toEqual({
      chain_id: body.head.chain_id, seq: body.head.seq, head_digest: body.head.head_digest
    });
  });

  it('pages by sequence, and the pages rebuild the chain directory exactly', async () => {
    const lines: string[] = [];
    const anchors: unknown[] = [];
    let from = 0;
    let head;
    for (let guard = 0; guard < 20; guard++) {
      const body = (await get(`/v1/audit?from=${from}&limit=2`)).json();
      head = body.head;
      expect(body.records.length).toBeLessThanOrEqual(2);
      body.records.forEach((x: { seq: number; line: string }, i: number) => {
        expect(x.seq).toBe(from + i);
        lines.push(x.line);
      });
      anchors.push(...body.anchors);
      if (body.next === body.head.seq) break;
      from = body.next;
    }
    expect(lines.join('\n') + '\n').toBe(readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8'));
    const onDisk = readdirSync(join(dataDir, 'anchors')).sort()
      .map((f) => JSON.parse(readFileSync(join(dataDir, 'anchors', f), 'utf8')))
      .filter((a) => a.head_seq <= head.seq);
    expect(anchors).toEqual(onDisk);
    expect(anchors.length).toBeGreaterThan(0);
  });

  it('a page from the head is empty and names the head', async () => {
    const head = (await get('/v1/audit')).json().head;
    const body = (await get(`/v1/audit?from=${head.seq}`)).json();
    expect(body.records).toEqual([]);
    expect(body.next).toBe(head.seq);
  });

  it('refuses a malformed query', async () => {
    for (const q of ['from=-1', 'from=x', 'limit=0', 'limit=1001', 'from=1.5', 'after=3']) {
      expect((await get(`/v1/audit?${q}`)).statusCode).toBe(400);
    }
  });

  it('is read-only', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH'] as const) {
      const r = await app.inject({ method, url: '/v1/audit', headers: { authorization: `Bearer ${TOKEN}` } });
      expect(r.statusCode).toBe(404);
    }
  });
});

describe('OperatorAuth', () => {
  it('with no accepted token, refuses everything', async () => {
    const auth = new OperatorAuth([]);
    expect(auth.configured).toBe(false);
    expect(auth.authenticates({ headers: { authorization: 'Bearer anything' } } as never)).toBe(false);
  });

  it('accepts only the 64-hex form of a hash', () => {
    expect(() => new OperatorAuth(['ABC'])).toThrow();
    expect(() => OperatorAuth.fromEnv({ BROKER_OPERATOR_TOKEN_SHA256: `${sha256('a')}, ${sha256('b')}` })).not.toThrow();
    expect(() => OperatorAuth.fromEnv({ BROKER_OPERATOR_TOKEN_SHA256: sha256('a').toUpperCase() })).toThrow();
  });

  it('accepts any of several configured tokens', () => {
    const auth = OperatorAuth.fromEnv({ BROKER_OPERATOR_TOKEN_SHA256: `${sha256('a')},${sha256('b')}` });
    expect(auth.authenticates({ headers: { authorization: 'Bearer a' } } as never)).toBe(true);
    expect(auth.authenticates({ headers: { authorization: 'Bearer b' } } as never)).toBe(true);
    expect(auth.authenticates({ headers: { authorization: 'Bearer c' } } as never)).toBe(false);
    expect(auth.authenticates({ headers: { authorization: 'Bearer ' } } as never)).toBe(false);
  });
});
