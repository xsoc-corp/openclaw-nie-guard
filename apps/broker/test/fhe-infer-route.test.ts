// POST /v1/fhe/infer: a Mode A inference on ciphertext, then the gated Mode C release
// of its result. Every outcome is a record on the broker chain, and every answer names
// its records. The FHE gate here is a double over the real FheGate class, whose
// provider computes in the clear and records the release through the sink the broker
// hands the gate, as the production gate does.

import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { ProvidenceAppendInput } from '@xsoc/shared-types';
import { ephemeralSigner } from '@xsoc/providence-signer';
import { createMockBindings } from '@xsoc/nie-bindings';
import { jcs } from '@xsoc/providence-log';
import { OPERATOR_HEADERS, testOperatorAuth } from './helpers/operator.js';

type Sink = { append(input: ProvidenceAppendInput): Promise<void> };
const behavior = { inferFails: false, attestFails: false, recordRelease: true };

vi.mock('@xsoc/fhe-gate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xsoc/fhe-gate')>();
  return {
    ...actual,
    loadFheGate: async (options: { providenceSink?: Sink } = {}) => {
      const sink = options.providenceSink!;
      const results = new Map<string, number[]>();
      const receipts = new Map<string, string>();
      return new actual.FheGate({
        async encrypt() { return 'test-ct'; },
        async decrypt() { return 'test-plaintext'; },
        buildTokenMap() { return {}; },
        describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'test double' }; },
        async inferModeA(input) {
          if (behavior.inferFails) throw new Error('UNAVAILABLE: the service did not answer');
          const w = input.parameters.weights!.split(',').map(Number);
          const id = `ct-out-${randomUUID()}`;
          results.set(id, [input.values.reduce((a, v, i) => a + v * w[i]!, 0)]);
          return {
            inputs: input.values.map((_, i) => ({ ciphertextId: `ct-in-${i}`, sizeBytes: 1000 + i })),
            output: { ciphertextId: id, sizeBytes: 2000, handle: id },
            scheme: 'CKKS', polyModulusDegree: 8192, securityLevel: 128
          };
        },
        async attestEndpoint() {
          if (behavior.attestFails) throw new Error('the gateway refused reauth');
          return 'nie-device:' + 'd'.repeat(64);
        },
        async issueDualControlReceipt(ciphertext, principals) {
          const receiptId = randomUUID();
          receipts.set(receiptId, ciphertext);
          return { receiptId, principals, expiresAt: Date.now() + 60_000 };
        },
        async releaseModeC(ciphertext, receiptId, context) {
          if (receipts.get(receiptId) !== ciphertext) throw new Error('dual-control receipt not valid');
          receipts.delete(receiptId);
          if (behavior.recordRelease) {
            await sink.append({
              eventType: 'mode_c_decryption', correlationId: context.correlationId, classification: context.classification,
              operationClass: context.operationClass, targetHash: ciphertext,
              metadata: { receiptId, principals: context.principals, endpointAttestation: context.endpointAttestationId }
            });
          }
          return results.get(ciphertext)!;
        }
      });
    }
  };
});

const dataDir = mkdtempSync(join(tmpdir(), 'broker-fhe-infer-'));
let app: FastifyInstance;

const records = () => readFileSync(join(dataDir, 'chain-v3.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const byCorrelation = (id: string) => records().filter((r) => r.correlation_id === id);
const VALUES = [1200, 180, 35, 6];
const post = (body: unknown, headers: Record<string, string> = OPERATOR_HEADERS) =>
  app.inject({ method: 'POST', url: '/v1/fhe/infer', headers, payload: body as object });

beforeEach(() => { behavior.inferFails = false; behavior.attestFails = false; behavior.recordRelease = true; });
afterAll(async () => { await app?.close(); });

describe('POST /v1/fhe/infer', () => {
  it('computes on ciphertext, releases with an attested endpoint and two approvers, and names both records', async () => {
    process.env.PROVIDENCE_DATA_DIR = dataDir;
    process.env.PROVIDENCE_CHAIN_FILE = join(dataDir, 'chain.jsonl');
    process.env.PROVIDENCE_CHAIN_ID = 'aida-guard/broker-fhe-infer-test';
    process.env.LOG_LEVEL = 'silent';
    process.env.BROKER_SCAFFOLDING_TRANSPORT = '1';
    const { buildServer } = await import('../src/server.js');
    app = await buildServer({ operatorAuth: testOperatorAuth(), signer: await ephemeralSigner(), bindings: createMockBindings() });

    const comps = await app.inject({ method: 'GET', url: '/v1/fhe/computations' });
    expect(comps.json().computations[0]).toMatchObject({ name: 'q3-risk-score', template: 'weighted-sum', classification: 'regulated', weights: [-0.02, 0.15, 0.8, 2] });

    const r = await post({ computation: 'q3-risk-score', values: VALUES, approvers: ['Ada Lovelace', 'Grace Hopper'] });
    expect(r.statusCode).toBe(200);
    const a = r.json();
    expect(a).toMatchObject({ classification: 'regulated', mode: 'A', modesAllowed: ['A', 'B', 'C'] });
    expect(a.inference.inputs.map((c: { sizeBytes: number }) => c.sizeBytes)).toEqual([1000, 1001, 1002, 1003]);
    expect(a.release).toMatchObject({ outcome: 'released', principals: ['Ada Lovelace', 'Grace Hopper'], endpointAttestationId: 'nie-device:' + 'd'.repeat(64) });
    expect(a.release.result).toBeCloseTo(-24 + 27 + 28 + 12, 9);

    const [inf, rel] = byCorrelation(a.correlationId);
    expect(inf.seq).toBe(a.inference.record.seq);
    expect(rel.seq).toBe(a.release.record.seq);
    expect(inf).toMatchObject({
      event_type: 'mode_a_inference', classification: 'regulated', operation_class: 'fhe.infer',
      payload_digest: createHash('sha256').update(jcs(VALUES)).digest('hex'), target_hash: a.inference.output.ciphertextId
    });
    expect(inf.metadata).toMatchObject({
      outcome: 'computed', mode: 'A', computation: 'q3-risk-score', template: 'weighted-sum', scheme: 'CKKS',
      parameters_sha256: createHash('sha256').update(jcs({ weights: '-0.02,0.15,0.8,2' })).digest('hex'),
      output: { ciphertext_id: a.inference.output.ciphertextId, size_bytes: 2000 }
    });
    expect(inf.metadata.inputs).toHaveLength(4);
    expect(rel).toMatchObject({ event_type: 'mode_c_decryption', classification: 'regulated' });
    // The released value is on the card, never on the chain.
    expect(JSON.stringify([inf, rel])).not.toContain(String(a.release.result));
  });

  it('records a malformed request, and the same approver twice', async () => {
    const r = await post({ computation: 'q3-risk-score', values: VALUES, approvers: ['Ada', 'ada'] });
    expect(r.statusCode).toBe(400);
    expect(byCorrelation(r.json().correlationId)[0]).toMatchObject({ event_type: 'deny', reason_code: 'ERR_POLICY_VIOLATION', metadata: { stage: 'shape', problem: 'the two approvers are the same' } });
    const short = await post({ computation: 'q3-risk-score', values: [1, 2], approvers: ['A', 'B'] });
    expect(short.statusCode).toBe(400);
    expect(byCorrelation(short.json().correlationId)).toHaveLength(1);
  });

  it('records a service error at the inference, and returns nothing computed', async () => {
    behavior.inferFails = true;
    const r = await post({ computation: 'q3-risk-score', values: VALUES, approvers: ['A', 'B'] });
    expect(r.statusCode).toBe(502);
    const [rec] = byCorrelation(r.json().correlationId);
    expect(rec).toMatchObject({ event_type: 'mode_a_inference', reason_code: 'ERR_FHE_SERVICE', metadata: { outcome: 'service_error' } });
    expect(r.json().release).toBeUndefined();
  });

  it('refuses the release without an endpoint attestation, and records it; the result stays sealed', async () => {
    behavior.attestFails = true;
    const r = await post({ computation: 'q3-risk-score', values: VALUES, approvers: ['A', 'B'] });
    expect(r.statusCode).toBe(200);
    expect(r.json().release).toMatchObject({ outcome: 'refused', step: 'endpoint-attestation', reasonCode: 'ERR_ENDPOINT_ATTESTATION_FAILED' });
    expect(r.json().release.result).toBeUndefined();
    const recs = byCorrelation(r.json().correlationId);
    expect(recs.map((x) => x.event_type)).toEqual(['mode_a_inference', 'endpoint_attestation_fail']);
  });

  it('refuses to answer a release the gate did not record', async () => {
    behavior.recordRelease = false;
    const r = await post({ computation: 'q3-risk-score', values: VALUES, approvers: ['A', 'B'] });
    expect(r.statusCode).toBe(500);
    expect(r.json().release).toMatchObject({ outcome: 'refused', step: 'record' });
    expect(r.json().release.result).toBeUndefined();
  });

  it('answers 401 without the operator bearer, before the route runs', async () => {
    const before = records().length;
    const r = await post({ computation: 'q3-risk-score', values: VALUES, approvers: ['A', 'B'] }, {});
    expect(r.statusCode).toBe(401);
    expect(records().length).toBe(before);
  });
});
