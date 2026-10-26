// The transport is labeled where it was used: the record of an operation forwarded
// through it carries metadata transport: <its name> (and transport_version when it
// reports one); admissions, malformed requests and everything else that forwards
// nothing carry no transport field, under the scaffolding transport or any other.

import { describe, it, expect } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockBindings } from '@xsoc/nie-bindings';
import type { OpenClawTransport } from '@xsoc/openclaw-adapter';
import { testFheGate } from './helpers/fhe.js';
import { OPERATOR_HEADERS, testOperatorAuth } from './helpers/operator.js';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
type Rec = { event_type: string; reason_code: string; metadata: Record<string, unknown> | null };

async function chainAfterTraffic(transport?: OpenClawTransport): Promise<{ records: Rec[]; exportStatus: number; exportBody: Record<string, unknown> }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'broker-transport-'));
  process.env.PROVIDENCE_DATA_DIR = dataDir;
  process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
  process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-transport-test';
  process.env.LOG_LEVEL = 'silent';
  // The scaffolding transport, admitted explicitly as the production build requires.
  process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
  const bindings = createMockBindings();
  const { buildServer } = await import('../src/server.js');
  const app = await buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), fheGate: testFheGate(), bindings, transport });
  const post = (url: string, payload: unknown) => app.inject({ method: 'POST', url, payload: payload as object, headers: OPERATOR_HEADERS });
  let exportStatus = 0;
  let exportBody: Record<string, unknown> = {};
  try {
    // A malformed invoke: refused at the shape, before any transport.
    await post('/v1/invoke', {});
    // A clean export, which the broker forwards.
    const admit = (await post('/v1/admit', {
      attestationPackage: 'mock-attestation-' + randomUUID(), requestedRole: 'egress_agent', requestedOperationSet: ['export.data'],
      clientMetadata: { deviceFingerprint: 'dev-transport', userAgent: 'test', sdkVersion: '0' }
    })).json();
    const now = Date.now();
    const sealed = await bindings.sealEnvelope({
      deviceFingerprint: 'dev-transport', sessionId: admit.sessionId, sessionNonceLineage: ['n0'], roleScopeHash: sha('export.data'),
      operationType: 'export.data', targetHash: sha('target'), directionality: 'outbound', brokerPathId: 'test',
      contextManifestHash: '0'.repeat(64), intentHash: '0'.repeat(64), intentClass: 'export', classification: 'sensitive',
      issuedAt: now, expiresAt: now + 60_000, counter: 0
    });
    const inv = await post('/v1/invoke', {
      capabilityToken: admit.capabilityToken, envelope: sealed, operationClass: 'export.data', targetId: 'target', targetClass: 'generic',
      intentHash: '0'.repeat(64), contextManifestHash: '0'.repeat(64), nonce: randomUUID() + randomUUID(), correlationId: randomUUID()
    });
    exportStatus = inv.statusCode;
    exportBody = inv.json();
  } finally {
    await app.close();
  }
  return { records: readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)), exportStatus, exportBody };
}

const supplied = (name: string, answer: () => Promise<{ ok: boolean; result?: unknown; error?: { code: string; message: string } }>, version?: string): OpenClawTransport => ({
  name, ...(version ? { version } : {}),
  getStatus: answer, invokeTool: answer, invokeNode: answer, readResource: answer, writeResource: answer, executeRestricted: answer
});

describe('OpenClaw transport', () => {
  it('under the scaffolding transport, only the forwarded export\'s record carries transport: scaffolding', async () => {
    const { records, exportStatus } = await chainAfterTraffic();
    expect(exportStatus).toBe(200);
    expect(records.map((r) => r.event_type)).toEqual(['deny', 'admit', 'invoke']);
    expect(records[2]!.metadata).toMatchObject({ transport: 'scaffolding' });
    expect(records[2]!.metadata).toHaveProperty('bindingHash');
    expect(records[2]!.metadata).not.toHaveProperty('brokerSignature');
    for (const r of records.slice(0, 2)) expect(r.metadata?.transport, r.event_type).toBeUndefined();
  });

  it('a supplied transport names itself, with its version, on the forwarded record only', async () => {
    const { records } = await chainAfterTraffic(supplied('test-transport', async () => ({ ok: true, result: {} }), '9.9.9'));
    expect(records[2]!.metadata).toMatchObject({ transport: 'test-transport', transport_version: '9.9.9' });
    for (const r of records.slice(0, 2)) expect(r.metadata?.transport).toBeUndefined();
  });

  it('a transport\'s refusal is a forwarded operation: its tool_block carries the transport', async () => {
    const { records, exportStatus, exportBody } = await chainAfterTraffic(supplied('test-transport', async () => ({ ok: false, error: { code: 'ERR_OPENCLAW_404', message: 'tool not available' } })));
    expect(exportStatus).toBe(403);
    expect(exportBody.code).toBe('ERR_OPENCLAW_404');
    const block = records[records.length - 1]!;
    expect(block).toMatchObject({ event_type: 'tool_block', reason_code: 'ERR_OPENCLAW_404', metadata: { stage: 'adapter', transport: 'test-transport' } });
  });
});
