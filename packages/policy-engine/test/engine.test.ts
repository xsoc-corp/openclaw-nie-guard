import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/engine.js';
import type { PolicyEvaluationInput } from '../src/types.js';

function input(overrides: Partial<PolicyEvaluationInput> = {}): PolicyEvaluationInput {
  return {
    subjectId: 'subj-1',
    role: 'operator',
    operationClass: 'tool.invoke',
    targetClass: 'generic',
    classification: 'sensitive',
    intentClass: 'read',
    ...overrides
  };
}

describe('PolicyEngine.evaluate', () => {
  const engine = new PolicyEngine();

  it('allows a permitted operation for a known role', () => {
    const d = engine.evaluate(input());
    expect(d.allowed).toBe(true);
    expect(d.profile).toBe('standard');
  });

  it('denies an unknown role with ERR_ROLE_INVALID', () => {
    const d = engine.evaluate(input({ role: 'ghost' }));
    expect(d.allowed).toBe(false);
    expect(d.denyReasonCode).toBe('ERR_ROLE_INVALID');
  });

  it('denies scope widening by the viewer role attempting exec.run', () => {
    const d = engine.evaluate(input({ role: 'viewer', operationClass: 'exec.run', intentClass: 'execute' }));
    expect(d.allowed).toBe(false);
    expect(d.denyReasonCode).toBe('ERR_SCOPE_DENIED');
  });

  it('denies intent drift when declared intent does not match operation', () => {
    // tool.invoke permits read, analyze, write; but not export.
    const d = engine.evaluate(input({ intentClass: 'export' }));
    expect(d.allowed).toBe(false);
    expect(d.denyReasonCode).toBe('ERR_INTENT_DRIFT');
  });

  it('flags admin operations for dual-control', () => {
    const d = engine.evaluate(input({ role: 'admin', operationClass: 'admin.control', intentClass: 'escalate', classification: 'regulated' }));
    expect(d.allowed).toBe(true);
    expect(d.requiresDualControl).toBe(true);
  });

  it('restricts classified-adjacent to Mode A only', () => {
    const d = engine.evaluate(input({ classification: 'classified-adjacent' }));
    expect(d.allowed).toBe(true);
    expect(d.allowedFheModes).toEqual(['A']);
  });

  it('requires endpoint attestation for regulated classification', () => {
    const d = engine.evaluate(input({ classification: 'regulated' }));
    expect(d.allowed).toBe(true);
    expect(d.requiresEndpointAttestation).toBe(true);
  });
});
