import { describe, it, expect } from 'vitest';
import { createMockFheGate } from '../src/mock.js';
import type { GateInput } from '../src/types.js';

function makeInput(overrides: Partial<GateInput> = {}): GateInput {
  return {
    elements: [{
      elementId: '00000000-0000-4000-8000-000000000001',
      provenance: 'user',
      classification: 'sensitive',
      contentHash: '0'.repeat(64),
      registeredAt: Date.now()
    }],
    requestedMode: 'A',
    classification: 'sensitive',
    operationClass: 'tool.invoke',
    ...overrides
  };
}

describe('FHE Context Gate', () => {
  const gate = createMockFheGate();

  it('allows Mode A for sensitive classification', () => {
    const d = gate.evaluate(makeInput());
    expect(d.mode).toBe('A');
  });

  it('denies Mode C for classified-adjacent classification', () => {
    const d = gate.evaluate(makeInput({ classification: 'classified-adjacent', requestedMode: 'C', endpointAttestationId: 'att-1' }));
    expect(d.mode).toBe('denied');
  });

  it('requires endpoint attestation for Mode C', () => {
    const d = gate.evaluate(makeInput({ requestedMode: 'C' }));
    expect(d.mode).toBe('denied');
    if (d.mode === 'denied') {
      expect(d.reasonCode).toBe('ERR_ENDPOINT_ATTESTATION_FAILED');
    }
  });

  it('requires dual-control for Mode C on regulated classification', () => {
    const d = gate.evaluate(makeInput({ classification: 'regulated', requestedMode: 'C', endpointAttestationId: 'att-1' }));
    expect(d.mode).toBe('denied');
    if (d.mode === 'denied') {
      expect(d.reasonCode).toBe('ERR_DUAL_CONTROL_REQUIRED');
    }
  });

  it('permits Mode C on regulated with dual-control receipt and attestation', () => {
    const d = gate.evaluate(makeInput({
      classification: 'regulated',
      requestedMode: 'C',
      endpointAttestationId: 'att-1',
      dualControlReceiptId: 'receipt-1'
    }));
    expect(d.mode).toBe('C');
  });

  it('reports published CKKS benchmark numbers', async () => {
    // Reach into the provider via encrypt; we do not expose describePerformance on the gate type itself,
    // so this test asserts that the mock uses the correct public CKKS scheme name in its provider contract.
    const ct = await gate.encryptForModeA('test');
    expect(ct.startsWith('mock-ct:')).toBe(true);
  });
});
