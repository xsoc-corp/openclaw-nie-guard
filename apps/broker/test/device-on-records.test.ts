// Every record written after the capability token verifies names the agent's device:
// a denial is as strong a record as an allow. Under the mock bindings the device is a
// label, which the broker files as metadata device_label; under the production
// bindings it is the 64-hex NIE fingerprint in device_fingerprint.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockBindings } from '@xsoc/nie-bindings';
import { testFheGate } from './helpers/fhe.js';
import { OPERATOR_HEADERS, testOperatorAuth } from './helpers/operator.js';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const bindings = createMockBindings();
const dataDir = mkdtempSync(join(tmpdir(), 'broker-device-'));
let app: FastifyInstance;

beforeAll(async () => {
  process.env.PROVIDENCE_DATA_DIR = dataDir;
  process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
  process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-device-test';
  process.env.LOG_LEVEL = 'silent';
  process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
  const { buildServer } = await import('../src/server.js');
  app = await buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), fheGate: testFheGate(), bindings });
});

afterAll(async () => {
  await app.close();
});

const post = (url: string, payload: unknown) => app.inject({ method: 'POST', url, payload, headers: OPERATOR_HEADERS });

describe('the device on every post-token record', () => {
  it('a taint denial and the context registration before it carry the device, as the allow does', async () => {
    const admit = (await post('/v1/admit', {
      attestationPackage: 'mock-attestation-' + randomUUID(), requestedRole: 'egress_agent', requestedOperationSet: ['export.data'],
      clientMetadata: { deviceFingerprint: 'dev-tainted', userAgent: 'test', sdkVersion: '0' }
    })).json();
    expect((await post('/v1/context/register', {
      capabilityToken: admit.capabilityToken,
      elements: [{ elementId: randomUUID(), provenance: 'external-channel', classification: 'sensitive', contentHash: sha('injected') }]
    })).statusCode).toBe(200);
    const now = Date.now();
    const sealed = await bindings.sealEnvelope({
      deviceFingerprint: 'dev-tainted', sessionId: admit.sessionId, sessionNonceLineage: ['n0'], roleScopeHash: sha('export.data'),
      operationType: 'export.data', targetHash: sha('target'), directionality: 'outbound', brokerPathId: 'test',
      contextManifestHash: '0'.repeat(64), intentHash: '0'.repeat(64), intentClass: 'export', classification: 'sensitive',
      issuedAt: now, expiresAt: now + 60_000, counter: 0
    });
    const inv = await post('/v1/invoke', {
      capabilityToken: admit.capabilityToken, envelope: sealed, operationClass: 'export.data', targetId: 'target', targetClass: 'generic',
      intentHash: '0'.repeat(64), contextManifestHash: '0'.repeat(64), nonce: randomUUID() + randomUUID(), correlationId: randomUUID()
    });
    expect(inv.statusCode).toBe(403);
    const records = readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const [admitted, registered, denied] = records.slice(-3);
    expect(denied.event_type).toBe('scope_fail');
    for (const r of [admitted, registered, denied]) {
      expect(r.metadata.device_label ?? r.device_fingerprint, r.event_type).toBe(admitted.metadata.device_label ?? admitted.device_fingerprint);
      expect(r.metadata.device_label ?? r.device_fingerprint).toBeTruthy();
    }
  });
});
