// GET /v1/preflight: the FHE gate's pre-flight, the known devices' reauths and the
// chain's state, for operators only, appending nothing. The gate is a double over the
// real FheGate class; the bindings are the mock with a known-device pre-flight added.

import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { FheGate } from '@xsoc/fhe-gate';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockBindings } from '@xsoc/nie-bindings';
import { OPERATOR_HEADERS, testOperatorAuth } from './helpers/operator.js';

const dataDir = mkdtempSync(join(tmpdir(), 'broker-preflight-'));
let app: FastifyInstance;
let serviceDown = false;
let agentDown = false;
const FP = 'a'.repeat(64);
const bindings = {
  ...createMockBindings(),
  async preflightKnownDevices() {
    return [
      { label: 'scene1-clean-hosted', ok: true, deviceFingerprint: FP },
      agentDown
        ? { label: 'scene1-tainted-hosted', ok: false, error: 'attestation failed: device not paired' }
        : { label: 'scene1-tainted-hosted', ok: true, deviceFingerprint: FP }
    ];
  }
};
afterAll(async () => { await app?.close(); });

const gate = new FheGate({
  async encrypt() { return 'x'; }, async decrypt() { return 'x'; },
  buildTokenMap() { return {}; }, describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'test double' }; },
  async preflight() {
    return serviceDown
      ? { device: { ok: true, id: 'nie-device:' + 'd'.repeat(64) }, service: { ok: false, error: 'UNAVAILABLE' } }
      : { device: { ok: true, id: 'nie-device:' + 'd'.repeat(64) }, service: { ok: true, status: 'HEALTHY', version: '3.0.0.0' } };
  }
});

describe('GET /v1/preflight', () => {
  it('reports the gate\'s pre-flight and the chain, to an operator, and appends nothing', async () => {
    process.env.PROVIDENCE_DATA_DIR = dataDir;
    process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
    process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-preflight-test';
    process.env.LOG_LEVEL = 'silent';
    process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
    const { buildServer } = await import('../src/server.js');
    app = await buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), bindings, fheGate: gate });
    const r = await app.inject({ method: 'GET', url: '/v1/preflight', headers: OPERATOR_HEADERS });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({
      chain: { chainId: 'aida-guard/broker-preflight-test', seq: 0, refusal: null },
      fhe: { device: { ok: true, id: 'nie-device:' + 'd'.repeat(64) }, service: { ok: true, status: 'HEALTHY', version: '3.0.0.0' } },
      nie: { knownDevices: [
        { label: 'scene1-clean-hosted', ok: true, deviceFingerprint: FP },
        { label: 'scene1-tainted-hosted', ok: true, deviceFingerprint: FP }
      ] }
    });
    serviceDown = true;
    expect((await app.inject({ method: 'GET', url: '/v1/preflight', headers: OPERATOR_HEADERS })).json().fhe.service).toEqual({ ok: false, error: 'UNAVAILABLE' });
    agentDown = true;
    expect((await app.inject({ method: 'GET', url: '/v1/preflight', headers: OPERATOR_HEADERS })).json().nie.knownDevices[1])
      .toEqual({ label: 'scene1-tainted-hosted', ok: false, error: 'attestation failed: device not paired' });
    const chain = join(dataDir, 'chain-v3.jsonl');
    expect(existsSync(chain) ? readFileSync(chain, 'utf8') : '').toBe('');
  });

  it('reports no known devices for bindings that hold none, and a failure as an error', async () => {
    const { registerPreflightRoute } = await import('../src/routes/preflight.js');
    const fastify = (await import('fastify')).default;
    for (const [b, want] of [
      [createMockBindings(), { knownDevices: [] }],
      [{ ...createMockBindings(), preflightKnownDevices: async () => { throw new Error('identity store unreadable'); } }, { knownDevices: [], error: 'identity store unreadable' }]
    ] as const) {
      const f = fastify();
      f.decorate('services', { bindings: b, fheGate: gate, providence: (app as any).services.providence } as any);
      await registerPreflightRoute(f, testOperatorAuth());
      expect((await f.inject({ method: 'GET', url: '/v1/preflight', headers: OPERATOR_HEADERS })).json().nie).toEqual(want);
      await f.close();
    }
  });

  it('answers 401 without the operator bearer', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/preflight' })).statusCode).toBe(401);
  });
});
