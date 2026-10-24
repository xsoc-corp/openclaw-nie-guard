// The scaffolding transport is labeled in the chain: with it, every record carries
// metadata transport: scaffolding; with a transport supplied, no record does.

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockBindings } from '@xsoc/nie-bindings';
import type { OpenClawTransport } from '@xsoc/openclaw-adapter';
import { testFheGate } from './helpers/fhe.js';
import { OPERATOR_HEADERS, testOperatorAuth } from './helpers/operator.js';

async function chainAfterTraffic(transport?: OpenClawTransport): Promise<Array<{ event_type: string; metadata: Record<string, unknown> | null }>> {
  const dataDir = mkdtempSync(join(tmpdir(), 'broker-transport-'));
  process.env.PROVIDENCE_DATA_DIR = dataDir;
  process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
  process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-transport-test';
  process.env.LOG_LEVEL = 'silent';
  // The scaffolding transport, admitted explicitly as the production build requires.
  process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
  const { buildServer } = await import('../src/server.js');
  const app = await buildServer({
    operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), fheGate: testFheGate(), bindings: createMockBindings(), transport
  });
  try {
    await app.inject({
      method: 'POST', url: '/v1/admit', headers: OPERATOR_HEADERS,
      payload: { attestationPackage: 'mock-attestation-' + randomUUID(), requestedRole: 'operator', requestedOperationSet: ['tool.invoke'],
        clientMetadata: { deviceFingerprint: 'dev-transport', userAgent: 'test', sdkVersion: '0' } }
    });
    await app.inject({ method: 'POST', url: '/v1/invoke', headers: OPERATOR_HEADERS, payload: {} });
  } finally {
    await app.close();
  }
  return readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
}

describe('OpenClaw transport', () => {
  it('under the scaffolding transport, every record carries transport: scaffolding', async () => {
    const records = await chainAfterTraffic();
    expect(records.map((r) => r.event_type)).toEqual(['admit', 'deny']);
    for (const r of records) expect(r.metadata).toMatchObject({ transport: 'scaffolding' });
  });

  it('with a transport supplied, no record carries the stamp', async () => {
    const answer = async () => ({ ok: true, result: {} });
    const supplied: OpenClawTransport = {
      getStatus: answer, invokeTool: answer, invokeNode: answer, readResource: answer, writeResource: answer, executeRestricted: answer
    };
    const records = await chainAfterTraffic(supplied);
    expect(records).toHaveLength(2);
    for (const r of records) expect(r.metadata?.transport).toBeUndefined();
  });
});
