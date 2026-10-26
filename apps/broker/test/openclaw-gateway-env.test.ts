// The broker's OpenClaw gateway transport from its environment: the token file must be
// owner-only with one link, every setting is required, the scaffolding flag cannot
// be set beside it, and startup waits for the gateway to be live, then gives up.
import { describe, it, expect } from 'vitest';
import { chmodSync, linkSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openClawGatewayFromEnv } from '../src/lib/openclaw-gateway.js';

const dir = mkdtempSync(join(tmpdir(), 'broker-openclaw-env-'));
const token = join(dir, 'token');
writeFileSync(token, 'gateway-token\n', { mode: 0o600 });
const targets = join(dir, 'targets.json');
writeFileSync(targets, JSON.stringify({ targets: { 'customer-records-export': { tool: 'memory_get', path: 'memory/customer-records-export.md' } } }));
const env = { BROKER_OPENCLAW_GATEWAY_URL: 'http://127.0.0.1:18789', BROKER_OPENCLAW_TOKEN_FILE: token, BROKER_OPENCLAW_TARGETS_FILE: targets, BROKER_OPENCLAW_VERSION: '2026.10.7', BROKER_OPENCLAW_WAIT_S: '2' };
const live = (async () => new Response(JSON.stringify({ ok: true, status: 'live' }), { status: 200 })) as typeof fetch;
const noSleep = async () => undefined;

describe('the OpenClaw gateway transport from the environment', () => {
  it('builds the transport once the gateway is live', async () => {
    let n = 0;
    const slow = (async () => (++n < 3 ? Promise.reject(new TypeError('fetch failed')) : new Response(JSON.stringify({ ok: true, status: 'live' }), { status: 200 }))) as typeof fetch;
    const t = await openClawGatewayFromEnv(env, { fetchImpl: slow, sleep: noSleep });
    expect([t.name, t.version, n]).toEqual(['openclaw-gateway', '2026.10.7', 3]);
  });

  it('gives up on a gateway that is not live within the wait', async () => {
    const dead = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    await expect(openClawGatewayFromEnv({ ...env, BROKER_OPENCLAW_WAIT_S: '0' }, { fetchImpl: dead, sleep: noSleep })).rejects.toThrow(/not live after 0 s: ERR_OPENCLAW_UNREACHABLE/);
  });

  it('refuses a token file open beyond its owner, or with a second link, and a missing setting', async () => {
    chmodSync(token, 0o640);
    await expect(openClawGatewayFromEnv(env, { fetchImpl: live, sleep: noSleep })).rejects.toThrow(/mode 640; it must be 600/);
    chmodSync(token, 0o600);
    linkSync(token, join(dir, 'token-link'));
    await expect(openClawGatewayFromEnv(env, { fetchImpl: live, sleep: noSleep })).rejects.toThrow(/2 hard links/);
    const { BROKER_OPENCLAW_VERSION: _v, ...noVersion } = env;
    await expect(openClawGatewayFromEnv(noVersion, { fetchImpl: live, sleep: noSleep })).rejects.toThrow();
  });

  it('the broker refuses the gateway URL beside the scaffolding flag', async () => {
    process.env.PROVIDENCE_DATA_DIR = mkdtempSync(join(tmpdir(), 'broker-openclaw-both-'));
    process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-openclaw-both';
    process.env.LOG_LEVEL = 'silent';
    process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
    process.env.BROKER_OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789';
    const { buildServer } = await import('../src/server.js');
    const { ephemeralSigner } = await import('@xsoc/providence-signer');
    const { createMockBindings } = await import('@xsoc/nie-bindings');
    const { testFheGate } = await import('./helpers/fhe.js');
    const { testOperatorAuth } = await import('./helpers/operator.js');
    try {
      await expect(buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), fheGate: testFheGate(), bindings: createMockBindings() }))
        .rejects.toThrow(/both set: the broker takes one OpenClaw transport/);
    } finally {
      delete process.env.BROKER_OPENCLAW_GATEWAY_URL;
    }
  });
});
