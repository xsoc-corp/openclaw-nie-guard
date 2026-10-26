// The broker closes the FHE gate it serves when its server closes, and the close
// finishes before app.close() resolves: the signal handler exits only after that,
// so a stop releases the gate's service-side keys and context first.

import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FheGate } from '@xsoc/fhe-gate';
import { ephemeralSigner } from '@xsoc/providence-signer';
// Bindings are not under test; the mock bindings let the broker build.
import { createMockBindings } from '@xsoc/nie-bindings';
import { testOperatorAuth } from './helpers/operator.js';

describe('broker FHE gate close', () => {
  it('closes the gate, provider first and then its owner, before the server close resolves', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'broker-fhe-close-'));
    process.env.PROVIDENCE_DATA_DIR = dataDir;
    process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
    process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-fhe-close-test';
    process.env.LOG_LEVEL = 'silent';
    process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
    const calls: string[] = [];
    const gate = new FheGate({
      async encrypt() { return 'x'; }, async decrypt() { return 'x'; },
      buildTokenMap() { return {}; }, describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'test double' }; },
      // Slower than a tick, as a destroy call to the service is.
      async close() { await new Promise((ok) => setTimeout(ok, 50)); calls.push('provider'); }
    }, { onClose: async () => { calls.push('owner'); } });
    const { buildServer } = await import('../src/server.js');
    const app = await buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), fheGate: gate, bindings: createMockBindings() });
    expect(calls).toEqual([]);
    await app.close();
    expect(calls).toEqual(['provider', 'owner']);
  });
});
