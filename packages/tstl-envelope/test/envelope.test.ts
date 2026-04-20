import { describe, it, expect, beforeEach } from 'vitest';
import { createMockBindings, type NieBindings } from '@xsoc/nie-bindings';
import { buildEnvelope, validateEnvelope } from '../src/envelope.js';
import type { EnvelopeBuildInput } from '../src/envelope.js';

function makeInput(overrides: Partial<EnvelopeBuildInput> = {}): EnvelopeBuildInput {
  return {
    deviceFingerprint: 'dev-fp-1',
    sessionId: '00000000-0000-4000-8000-000000000001',
    sessionNonceLineage: ['nonce-0'],
    roleScope: 'tool.invoke',
    operationType: 'tool.invoke',
    targetId: 'target-alpha',
    directionality: 'outbound',
    brokerPathId: 'broker-1',
    contextManifestHash: '0'.repeat(64),
    intentHash: '0'.repeat(64),
    intentClass: 'read',
    classification: 'sensitive',
    ttlSeconds: 60,
    counter: 0,
    ...overrides
  };
}

describe('TSTL envelope', () => {
  let bindings: NieBindings;
  beforeEach(() => {
    bindings = createMockBindings();
  });

  it('round-trips a valid envelope', async () => {
    const sealed = await buildEnvelope(makeInput(), bindings);
    const result = await validateEnvelope(sealed, bindings, {
      targetId: 'target-alpha',
      roleScope: 'tool.invoke'
    });
    expect(result.valid).toBe(true);
    expect(result.envelope?.operationType).toBe('tool.invoke');
  });

  it('rejects target substitution with ERR_TARGET_MISMATCH', async () => {
    const sealed = await buildEnvelope(makeInput(), bindings);
    const result = await validateEnvelope(sealed, bindings, {
      targetId: 'target-beta',
      roleScope: 'tool.invoke'
    });
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('ERR_TARGET_MISMATCH');
  });

  it('rejects scope widening with ERR_SCOPE_DENIED', async () => {
    const sealed = await buildEnvelope(makeInput(), bindings);
    const result = await validateEnvelope(sealed, bindings, {
      targetId: 'target-alpha',
      roleScope: 'exec.run'
    });
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('ERR_SCOPE_DENIED');
  });

  it('rejects replay with lower counter', async () => {
    const sealed = await buildEnvelope(makeInput({ counter: 2 }), bindings);
    const result = await validateEnvelope(sealed, bindings, {
      targetId: 'target-alpha',
      roleScope: 'tool.invoke',
      minCounter: 5
    });
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('ERR_NONCE_REPLAY');
  });

  it('rejects tampered envelope', async () => {
    const result = await validateEnvelope('not-a-valid-sealed-envelope', bindings, {});
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('ERR_CONTINUITY_FAILED');
  });
});
