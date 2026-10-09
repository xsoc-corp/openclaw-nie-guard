// envelope_rejected reaches the Providence chain as its own record: an
// envelope that does not authenticate is reason class unauthenticated, one that
// authenticates and has expired is reason class expired, and each keys on the
// readable copy's digest. A target refusal keeps target_mismatch.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { jcs } from '@xsoc/providence-log';
import { ProvidenceRecord } from '@xsoc/shared-types';
import { ephemeralSigner } from '@xsoc/providence-signer';

const dataDir = mkdtempSync(join(tmpdir(), 'broker-envelope-'));
let app: FastifyInstance;

beforeAll(async () => {
  process.env.PROVIDENCE_DATA_DIR = dataDir;
  process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
  process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-envelope-test';
  process.env.LOG_LEVEL = 'silent';
  const { buildServer } = await import('../src/server.js');
  app = await buildServer({ signer: await ephemeralSigner() });
});

afterAll(async () => {
  await app.close();
});

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

async function admit(): Promise<{ sessionId: string; capabilityToken: string }> {
  const r = await app.inject({
    method: 'POST',
    url: '/v1/admit',
    payload: {
      attestationPackage: 'mock-attestation-' + randomUUID(),
      requestedRole: 'operator',
      requestedOperationSet: ['tool.invoke'],
      clientMetadata: { deviceFingerprint: 'dev-envelope-test', userAgent: 'test', sdkVersion: '0' }
    }
  });
  expect(r.statusCode).toBe(200);
  return r.json();
}

function envelope(sessionId: string, expiresAt: number) {
  return {
    deviceFingerprint: 'dev-envelope-test',
    sessionId,
    sessionNonceLineage: ['nonce-0'],
    roleScopeHash: sha256('tool.invoke'),
    operationType: 'tool.invoke',
    targetHash: sha256('target-a'),
    directionality: 'outbound',
    brokerPathId: 'test',
    contextManifestHash: '0'.repeat(64),
    intentHash: '0'.repeat(64),
    intentClass: 'read',
    classification: 'sensitive',
    issuedAt: expiresAt - 60_000,
    expiresAt,
    counter: 0
  };
}

async function invoke(token: string, sealed: string, targetId = 'target-a') {
  return app.inject({
    method: 'POST',
    url: '/v1/invoke',
    payload: {
      capabilityToken: token, envelope: sealed, operationClass: 'tool.invoke', targetId,
      targetClass: 'generic', intentHash: '0'.repeat(64), contextManifestHash: '0'.repeat(64),
      nonce: randomUUID() + randomUUID(), correlationId: randomUUID()
    }
  });
}

function lastRecord(): ProvidenceRecord {
  const lines = readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trimEnd().split('\n');
  return ProvidenceRecord.parse(JSON.parse(lines[lines.length - 1]!));
}

describe('envelope_rejected', () => {
  it('an envelope that does not authenticate is unauthenticated', async () => {
    const adm = await admit();
    const r = await invoke(adm.capabilityToken, '%%% not an envelope %%%');
    expect(r.statusCode).toBe(403);
    const rec = lastRecord();
    expect(rec.event_type).toBe('envelope_rejected');
    expect(rec.metadata).toMatchObject({ stage: 'envelope', reason_class: 'unauthenticated' });
    expect(rec.reason_code).toBe('ERR_CONTINUITY_FAILED');
    expect(rec.session_handle).toBe(adm.sessionId);
    expect(rec.metadata).toMatchObject({ device_label: 'dev-envelope-test' });
  });

  it('an envelope that authenticates and has expired is expired, keyed on its readable copy', async () => {
    const adm = await admit();
    const env = envelope(adm.sessionId, Date.now() - 1000);
    const sealed = Buffer.from(JSON.stringify(env)).toString('base64');
    const r = await invoke(adm.capabilityToken, sealed);
    expect(r.statusCode).toBe(403);
    const rec = lastRecord();
    expect(rec.event_type).toBe('envelope_rejected');
    expect(rec.metadata).toMatchObject({ reason_class: 'expired' });
    expect(rec.reason_code).toBe('ERR_SESSION_EXPIRED');
    expect(rec.payload_digest).toBe(sha256(jcs(env)));
    expect(rec.payload_digest).not.toBe(sha256(sealed));
  });

  it('a target refusal keeps target_mismatch, and an allowed invoke keys on the envelope digest', async () => {
    const adm = await admit();
    const env = envelope(adm.sessionId, Date.now() + 60_000);
    const sealed = Buffer.from(JSON.stringify(env)).toString('base64');
    const denied = await invoke(adm.capabilityToken, sealed, 'target-b');
    expect(denied.statusCode).toBe(403);
    expect(lastRecord().event_type).toBe('target_mismatch');

    const ok = await invoke(adm.capabilityToken, sealed);
    expect(ok.statusCode).toBe(200);
    const rec = lastRecord();
    expect(rec.event_type).toBe('invoke');
    expect(rec.payload_digest).toBe(sha256(jcs(env)));
    expect(ok.json().providenceEventId).toMatch(/^[0-9a-f]{64}$/);
  });
});
