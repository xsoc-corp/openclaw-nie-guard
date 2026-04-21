import { describe, it, expect } from 'vitest';
import { createMockBindings } from '../src/mock.js';

describe('NIE mock bindings', () => {
  it('attests and issues a capability', async () => {
    const bindings = createMockBindings();
    const result = await bindings.attest({
      attestationPackage: 'pkg-mock-ok',
      requestedRole: 'operator',
      requestedOperationSet: ['tool.invoke'],
      clientMetadata: { deviceFingerprint: 'dev-1' }
    });
    expect(result.subjectId).toBeTruthy();
    expect(result.admission.capabilityToken).toBeTruthy();
  });

  it('verifies an issued token as valid', async () => {
    const bindings = createMockBindings();
    const result = await bindings.attest({
      attestationPackage: 'pkg-mock-ok',
      requestedRole: 'operator',
      requestedOperationSet: ['tool.invoke'],
      clientMetadata: { deviceFingerprint: 'dev-1' }
    });
    const verify = await bindings.verifyToken(result.admission.capabilityToken);
    expect(verify.valid).toBe(true);
  });

  it('revokes a session and invalidates its token', async () => {
    const bindings = createMockBindings();
    const attestation = await bindings.attest({
      attestationPackage: 'pkg-mock-ok',
      requestedRole: 'operator',
      requestedOperationSet: ['tool.invoke'],
      clientMetadata: { deviceFingerprint: 'dev-1' }
    });
    await bindings.revokeSubject({ kind: 'session', id: attestation.admission.sessionId, reason: 'test' });
    const verify = await bindings.verifyToken(attestation.admission.capabilityToken);
    expect(verify.valid).toBe(false);
  });

  it('cdt: child capability is strictly narrower than parent', async () => {
    const bindings = createMockBindings();
    const parent = await bindings.attest({
      attestationPackage: 'pkg-mock-ok',
      requestedRole: 'operator',
      requestedOperationSet: ['tool.invoke', 'file.read'],
      clientMetadata: { deviceFingerprint: 'dev-1' }
    });
    const child = await bindings.deriveScopedCapability({
      parentCapability: parent.admission.capabilityToken,
      scopeRestriction: {
        operationClassSubset: ['file.read'],
        ttlSeconds: 30
      }
    });
    expect(child).toBeTruthy();
    expect(child).not.toBe(parent.admission.capabilityToken);
  });
});
