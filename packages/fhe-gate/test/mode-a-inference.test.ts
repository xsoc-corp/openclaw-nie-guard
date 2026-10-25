import { describe, it, expect } from 'vitest';
import { createMockFheGate, MOCK_SCHEME } from '../src/mock.js';
import { FheGate } from '../src/gate.js';

const ctx = { correlationId: 'c-1', classification: 'regulated', operationClass: 'fhe.infer', endpointAttestationId: 'mock-endpoint', principals: ['a', 'b'] };

describe('Mode A inference and its release, on the reference gate', () => {
  it('runs weighted-sum, labels its scheme as no cryptography, and releases once with a two-principal receipt', async () => {
    const gate = createMockFheGate();
    const r = await gate.inferModeA({ values: [10, 20, 30], template: 'weighted-sum', parameters: { weights: '1,0.5,-1' } });
    expect(r.scheme).toBe(MOCK_SCHEME);
    expect(r.inputs).toHaveLength(3);
    expect(await gate.attestEndpoint()).toBe('mock-endpoint');
    await expect(gate.issueDualControlReceipt(r.output.handle, ['a', 'a'])).rejects.toThrow(/2 distinct principals/);
    const grant = await gate.issueDualControlReceipt(r.output.handle, ['a', 'b']);
    expect(await gate.releaseModeC(r.output.handle, grant.receiptId, ctx)).toEqual([-10]);
    await expect(gate.releaseModeC(r.output.handle, grant.receiptId, ctx)).rejects.toThrow(/receipt not valid/);
  });

  it('refuses each step on a provider that does not implement it', async () => {
    const gate = new FheGate({
      async encrypt() { return 'x'; }, async decrypt() { return 'x'; },
      buildTokenMap() { return {}; }, describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'x' }; }
    });
    await expect(gate.inferModeA({ values: [1], template: 'weighted-sum', parameters: { weights: '1' } })).rejects.toThrow(/no Mode A inference/);
    await expect(gate.attestEndpoint()).rejects.toThrow(/attests no endpoint/);
    await expect(gate.issueDualControlReceipt('h', ['a', 'b'])).rejects.toThrow(/no dual-control receipt/);
    await expect(gate.releaseModeC('h', 'r', ctx)).rejects.toThrow(/releases no Mode A result/);
    expect(await gate.preflight()).toEqual({ device: { ok: false, error: 'this FHE provider has no pre-flight' }, service: { ok: false, error: 'this FHE provider has no pre-flight' } });
  });

  it('reports the reference gate\'s pre-flight as the mock it is', async () => {
    expect(await createMockFheGate().preflight()).toEqual({ device: { ok: true, id: 'mock-endpoint' }, service: { ok: true, status: MOCK_SCHEME } });
  });
});
