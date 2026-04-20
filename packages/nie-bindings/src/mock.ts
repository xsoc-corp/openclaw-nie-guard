import { randomUUID, createHash } from 'node:crypto';
import type { NieBindings, AttestationResult, TokenVerificationResult, RevocationInput, RevocationResult, VersionInfo } from './interface.js';
import type { AdmissionRequest, CapabilityToken, DerivationRequest, SealedEnvelope, TstlEnvelope } from '@xsoc/shared-types';

// Mock implementation for the public repo. Deterministic enough for testing.
// NOT cryptographically secure. Production bindings are substituted from the private repo.
//
// TODO(xsoc-openclaw-poc): replace with production binding via workspace override
// when @xsoc/nie-bindings-prod is linked in the private deployment repo.

interface MockState {
  revokedSubjects: Set<string>;
  revokedSessions: Set<string>;
  revokedDevices: Set<string>;
  seenNonces: Set<string>;
  activeTokens: Map<string, { sessionId: string; subjectId: string; deviceFingerprint: string; expiresAt: number }>;
}

export function createMockBindings(): NieBindings {
  const state: MockState = {
    revokedSubjects: new Set(),
    revokedSessions: new Set(),
    revokedDevices: new Set(),
    seenNonces: new Set(),
    activeTokens: new Map()
  };

  const hash = (s: string) => createHash('sha256').update(s).digest('hex');

  return {
    async attest(request: AdmissionRequest): Promise<AttestationResult> {
      const subjectId = hash(request.attestationPackage).slice(0, 16);
      const deviceFingerprint = request.clientMetadata.deviceFingerprint;

      if (state.revokedSubjects.has(subjectId) || state.revokedDevices.has(deviceFingerprint)) {
        throw new Error('ERR_ATTESTATION_FAILED: subject or device revoked');
      }

      const now = Date.now();
      const sessionId = randomUUID();
      const correlationId = randomUUID();
      const expiresAt = now + 15 * 60 * 1000; // 15 minute TTL on mock capability
      const capabilityToken = hash(`${sessionId}:${subjectId}:${deviceFingerprint}:${now}`);

      state.activeTokens.set(capabilityToken, { sessionId, subjectId, deviceFingerprint, expiresAt });

      return {
        subjectId,
        deviceFingerprint,
        attestationFloor: 'software-min',
        validatedAt: now,
        admission: {
          sessionId,
          capabilityToken,
          profile: 'standard',
          issuedAt: now,
          expiresAt,
          correlationId
        }
      };
    },

    async verifyToken(token: CapabilityToken): Promise<TokenVerificationResult> {
      const entry = state.activeTokens.get(token);
      if (!entry) return { valid: false, reasonCode: 'ERR_SESSION_REVOKED' };
      if (entry.expiresAt < Date.now()) return { valid: false, reasonCode: 'ERR_SESSION_EXPIRED' };
      if (state.revokedSessions.has(entry.sessionId)) return { valid: false, reasonCode: 'ERR_SESSION_REVOKED' };
      return { valid: true, ...entry };
    },

    async deriveScopedCapability(input: DerivationRequest): Promise<CapabilityToken> {
      const parent = state.activeTokens.get(input.parentCapability);
      if (!parent) throw new Error('ERR_SCOPE_DENIED: parent capability not found');
      const now = Date.now();
      const expiresAt = now + Math.min(input.scopeRestriction.ttlSeconds * 1000, parent.expiresAt - now);
      if (expiresAt <= now) throw new Error('ERR_SESSION_EXPIRED: parent already expired');
      const childToken = hash(`${input.parentCapability}:${now}:${randomUUID()}`);
      state.activeTokens.set(childToken, { ...parent, expiresAt });
      return childToken;
    },

    async sealEnvelope(envelope: TstlEnvelope): Promise<SealedEnvelope> {
      return Buffer.from(JSON.stringify(envelope)).toString('base64');
    },

    async validateContinuityEnvelope(sealed: SealedEnvelope): Promise<TstlEnvelope> {
      try {
        const decoded = Buffer.from(sealed, 'base64').toString('utf8');
        return JSON.parse(decoded) as TstlEnvelope;
      } catch {
        throw new Error('ERR_CONTINUITY_FAILED: envelope decode failure');
      }
    },

    async revokeSubject(input: RevocationInput): Promise<RevocationResult> {
      const sets: Record<string, Set<string>> = {
        subject: state.revokedSubjects,
        session: state.revokedSessions,
        device: state.revokedDevices
      };
      sets[input.kind]?.add(input.id);
      for (const [tok, entry] of state.activeTokens) {
        if (input.kind === 'session' && entry.sessionId === input.id) state.activeTokens.delete(tok);
        if (input.kind === 'subject' && entry.subjectId === input.id) state.activeTokens.delete(tok);
        if (input.kind === 'device' && entry.deviceFingerprint === input.id) state.activeTokens.delete(tok);
      }
      return {
        acknowledged: true,
        channelsNotified: ['local', 'redis-mock', 'event-bus-mock'],
        propagationTimestamp: Date.now()
      };
    },

    getVersion(): VersionInfo {
      return {
        bindingVersion: '0.1.0',
        mode: 'mock',
        nieCoreVersion: 'mock'
      };
    }
  };
}
