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

describe('PolicyEngine taint gate', () => {
  // No default role permits export.data or admin.control, so a taint test against
  // the default matrix would deny at the scope check and prove nothing about the
  // label. These tests load a bundle granting those operations, which is the only
  // construction that actually exercises the gate.
  //
  // loadBundle documents that signature verification happens in the loader before
  // this call, so building a bundle here is not bypassing a check.
  function bundleEngine(): PolicyEngine {
    const e = new PolicyEngine();
    e.loadBundle({
      version: '1.0.0',
      bundleId: '11111111-1111-4111-8111-111111111111',
      effectiveFrom: 1,
      signerKeyId: 'test-signer',
      signature: 'test-signature',
      payload: {
        roles: {
          exporter: {
            description: 'Test role permitting export and escalate.',
            allowedOperations: ['operator.read', 'file.read', 'export.data', 'admin.control'],
            defaultProfile: 'standard',
            requiresDualControl: []
          }
        },
        mcpServers: [],
        skills: []
      }
    });
    return e;
  }

  const tainted = { classification: 'sensitive' as const, origins: ['user', 'external-channel'] as const };
  const clean = { classification: 'sensitive' as const, origins: ['user'] as const };

  function exportInput(overrides: Partial<PolicyEvaluationInput> = {}): PolicyEvaluationInput {
    return input({
      role: 'exporter',
      operationClass: 'export.data',
      intentClass: 'export',
      ...overrides
    });
  }

  it('denies export from a session carrying untrusted context', () => {
    // The CCI case. The agent is honest and has been convinced by laundered
    // content; the request itself looks entirely legitimate at this point.
    const d = bundleEngine().evaluate(exportInput({ sessionLabel: { ...tainted, origins: [...tainted.origins] } }));
    expect(d.allowed).toBe(false);
    expect(d.denyReasonCode).toBe('ERR_SCOPE_DENIED');
  });

  it('allows the same export from a clean session', () => {
    // The negative control, and the more important of the pair: it shows the
    // control is the label rather than a blanket deny on export intent.
    const d = bundleEngine().evaluate(exportInput({ sessionLabel: { ...clean, origins: [...clean.origins] } }));
    expect(d.allowed).toBe(true);
  });

  it('allows the same export when no label is present at all', () => {
    // A session that registered no context is untainted, not an error state.
    const d = bundleEngine().evaluate(exportInput());
    expect(d.allowed).toBe(true);
  });

  it('denies escalate from a tainted session', () => {
    const d = bundleEngine().evaluate(
      exportInput({ operationClass: 'admin.control', intentClass: 'escalate', sessionLabel: { ...tainted, origins: [...tainted.origins] } })
    );
    expect(d.allowed).toBe(false);
    expect(d.denyReasonCode).toBe('ERR_SCOPE_DENIED');
  });

  it('still allows read and analyze in a tainted session', () => {
    // Scoping. Denying every operation under taint would make any session that
    // fetched a page useless afterward, which produces a control operators turn
    // off. Read and analyze continue to work.
    const e = bundleEngine();
    for (const intentClass of ['read', 'analyze'] as const) {
      const d = e.evaluate(
        input({ role: 'exporter', operationClass: 'file.read', intentClass, sessionLabel: { ...tainted, origins: [...tainted.origins] } })
      );
      expect(d.allowed, `intent ${intentClass} should remain permitted`).toBe(true);
    }
  });

  it('names the origins that caused the denial', () => {
    // An operator reading the audit entry should see which origin class tripped
    // it, not a bare refusal.
    const d = bundleEngine().evaluate(exportInput({ sessionLabel: { ...tainted, origins: [...tainted.origins] } }));
    expect(d.denyReason).toContain('external-channel');
  });

  it('treats every untrusted origin as tainting', () => {
    const e = bundleEngine();
    for (const origin of ['external-channel', 'mcp-response', 'rag'] as const) {
      const d = e.evaluate(exportInput({ sessionLabel: { classification: 'public', origins: [origin] } }));
      expect(d.allowed, `origin ${origin} should taint`).toBe(false);
    }
  });

  it('does not taint on trusted origins', () => {
    const e = bundleEngine();
    for (const origin of ['user', 'system', 'tool-output'] as const) {
      const d = e.evaluate(exportInput({ sessionLabel: { classification: 'public', origins: [origin] } }));
      expect(d.allowed, `origin ${origin} should not taint`).toBe(true);
    }
  });
});

describe('PolicyEngine decision record', () => {
  it('records every predicate on an allowed decision', () => {
    const d = new PolicyEngine().evaluate(input());
    expect(d.allowed).toBe(true);
    expect(d.predicates.map((p) => p.name)).toEqual(['role', 'scope', 'intent', 'taint', 'classification']);
    expect(d.predicates.every((p) => p.passed)).toBe(true);
  });

  it('records the taint result even when the decision fails at scope first', () => {
    // The point of evaluating all predicates. A laundered instruction reaching
    // for scope the agent does not hold would, under short-circuit evaluation,
    // deny at scope and never record that the session was carrying untrusted
    // material. That reads as misconfiguration while an attack is in progress.
    const d = new PolicyEngine().evaluate(
      input({
        role: 'viewer',
        operationClass: 'exec.run',
        intentClass: 'execute',
        sessionLabel: { classification: 'sensitive', origins: ['user', 'external-channel'] },
        sessionAncestors: ['a'.repeat(64)]
      })
    );

    expect(d.allowed).toBe(false);
    // Caller-facing code is still the first failure, so responses do not change.
    expect(d.denyReasonCode).toBe('ERR_SCOPE_DENIED');

    // But the record carries the taint result, and the ancestor that caused it.
    const taint = d.predicates.find((p) => p.name === 'taint');
    expect(taint).toBeDefined();
    expect(taint?.ancestors).toEqual(['a'.repeat(64)]);
  });

  it('records a predicate whose prerequisite failed as failed, never as passed', () => {
    // Scope cannot be evaluated without a role. Fail closed: recorded as failed
    // with the prerequisite named, not omitted and not assumed to pass.
    const d = new PolicyEngine().evaluate(input({ role: 'ghost' }));
    const scope = d.predicates.find((p) => p.name === 'scope');
    expect(scope?.passed).toBe(false);
    expect(scope?.reason).toContain('role did not resolve');
  });

  it('carries ancestors on a taint denial', () => {
    const e = new PolicyEngine();
    e.loadBundle({
      version: '1.0.0',
      bundleId: '22222222-2222-4222-8222-222222222222',
      effectiveFrom: 1,
      signerKeyId: 'test-signer',
      signature: 'test-signature',
      payload: {
        roles: {
          exporter: {
            description: 'Test role permitting export.',
            allowedOperations: ['export.data'],
            defaultProfile: 'standard',
            requiresDualControl: []
          }
        },
        mcpServers: [],
        skills: []
      }
    });

    const ancestor = 'b'.repeat(64);
    const d = e.evaluate(
      input({
        role: 'exporter',
        operationClass: 'export.data',
        intentClass: 'export',
        sessionLabel: { classification: 'sensitive', origins: ['external-channel'] },
        sessionAncestors: [ancestor]
      })
    );

    expect(d.allowed).toBe(false);
    const taint = d.predicates.find((p) => p.name === 'taint');
    expect(taint?.passed).toBe(false);
    expect(taint?.ancestors).toEqual([ancestor]);
  });
});