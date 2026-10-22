// The broker hands the FHE gate its Providence chain as the sink, so an FHE decision
// is a record on the same chain as every other decision. The production gate refuses to
// start without that sink; this checks the broker always passes it and that what the
// gate appends lands on the chain.

import { describe, it, expect, vi, afterAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { ProvidenceAppendInput } from '@xsoc/shared-types';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockBindings } from '@xsoc/nie-bindings';
import { OPERATOR_HEADERS, testOperatorAuth } from './helpers/operator.js';

type Sink = { append(input: ProvidenceAppendInput): Promise<void> };
const captured: { sink?: Sink } = {};

vi.mock('@xsoc/fhe-gate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xsoc/fhe-gate')>();
  return {
    ...actual,
    loadFheGate: async (options: { providenceSink?: Sink } = {}) => {
      captured.sink = options.providenceSink;
      return actual.createMockFheGate();
    }
  };
});

const dataDir = mkdtempSync(join(tmpdir(), 'broker-fhe-sink-'));
let app: FastifyInstance | undefined;

afterAll(async () => {
  await app?.close();
});

describe('FHE decisions reach the broker chain', () => {
  it('the broker passes its chain to the FHE gate, and an FHE record lands on it', async () => {
    process.env.PROVIDENCE_DATA_DIR = dataDir;
    process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
    process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-fhe-sink-test';
    process.env.LOG_LEVEL = 'silent';
    const { buildServer } = await import('../src/server.js');
    app = await buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), bindings: createMockBindings() });
    expect(typeof captured.sink?.append).toBe('function');

    await captured.sink!.append({
      eventType: 'mode_c_decryption',
      correlationId: 'fhe-sink-test',
      metadata: { receiptId: 'r-1', gateSessionId: 'session-X' }
    });
    const lines = readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trim().split('\n');
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.event_type).toBe('mode_c_decryption');
    expect(last.correlation_id).toBe('fhe-sink-test');
    expect(last.metadata).toMatchObject({ receiptId: 'r-1', gateSessionId: 'session-X' });
  });

  it('an append the chain refuses throws into the gate', async () => {
    await expect(captured.sink!.append({ eventType: 'mode_c_decryption', sessionId: 'not-a-handle' }))
      .rejects.toThrow();
  });
});
