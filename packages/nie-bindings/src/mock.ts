import { randomUUID, createHash } from 'node:crypto';
import type { NieBindings, AttestationResult, TokenVerificationResult, RevocationInput, RevocationResult, VersionInfo, NonceConsumeResult } from './interface.js';
import type { AdmissionRequest, CapabilityToken, DerivationRequest, SealedEnvelope, TstlEnvelope, OperationClass } from '@xsoc/shared-types';

interface TokenState {
  sessionId: string;
  subjectId: string;
  deviceFingerprint: string;
  role: string;
  requestedOperationSet: OperationClass[];
  expiresAt: number;
}

interface MockState {
  revokedSubjects: Set<string>;
  revokedSessions: Set<string>;
  revokedDevices: Set<string>;
  seenNonces: Map<string, Set<string>>;  // sessionId -> set of nonces
  activeTokens: Map<string, TokenState>;
}

export function createMockBindings(): NieBindings {
  const state: MockState = {
    revokedSubjects: new Set(),
    revokedSessions: new Set(),
    revokedDevices: new Set(),
    seenNonces: new Map(),
    activeTokens: new Map()
  };

  const hash = (s: string) => createHash('sha256').update(s).digest('hex');

  return {
    async attest(request: AdmissionRequest): Promise<AttestationResult> {
      const subjectId = hash(request.attestationPackage).slice(0, 16);
      const deviceFingerprint = request.clientMetadata.deviceFingerprint;

      // Attestation floor check: empty or obviously-malformed packages fail.
      // This is the hook for scenario 22 (browser pivot with missing attestation).
      if (request.attestationPackage.length < 8 || request.attestationPackage.startsWith('browser-pivot-')) {
        throw new Error('ERR_ATTESTATION_FAILED: attestation floor not met');
      }

      if (state.revokedSubjects.has(subjectId) || state.revokedDevices.has(deviceFingerprint)) {
        throw new Error('ERR_ATTESTATION_FAILED: subject or device revoked');
      }

      const now = Date.now();
      const sessionId = randomUUID();
      const correlationId = randomUUID();
      const expiresAt = now + 15 * 60 * 1000;
      const capabilityToken = hash(`${sessionId}:${subjectId}:${deviceFingerprint}:${now}`);

      state.activeTokens.set(capabilityToken, {
        sessionId,
        subjectId,
        deviceFingerprint,
        role: request.requestedRole,
        requestedOperationSet: request.requestedOperationSet,
        expiresAt
      });
      state.seenNonces.set(sessionId, new Set());

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
      return {
        valid: true,
        sessionId: entry.sessionId,
        subjectId: entry.subjectId,
        deviceFingerprint: entry.deviceFingerprint,
        role: entry.role,
        requestedOperationSet: entry.requestedOperationSet,
        expiresAt: entry.expiresAt
      };
    },

    async deriveScopedCapability(input: DerivationRequest): Promise<CapabilityToken> {
      const parent = state.activeTokens.get(input.parentCapability);
      if (!parent) throw new Error('ERR_SCOPE_DENIED: parent capability not found');
      const now = Date.now();
      const expiresAt = now + Math.min(input.scopeRestriction.ttlSeconds * 1000, parent.expiresAt - now);
      if (expiresAt <= now) throw new Error('ERR_SESSION_EXPIRED: parent already expired');

      // Child cannot widen: operation subset must be strictly contained in parent's set.
      for (const op of input.scopeRestriction.operationClassSubset) {
        if (!parent.requestedOperationSet.includes(op)) {
          throw new Error(`ERR_SCOPE_DENIED: child operation ${op} not in parent scope`);
        }
      }

      const childToken = hash(`${input.parentCapability}:${now}:${randomUUID()}`);
      state.activeTokens.set(childToken, {
        ...parent,
        requestedOperationSet: input.scopeRestriction.operationClassSubset,
        expiresAt
      });
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

    async consumeNonce(nonce: string, sessionId: string): Promise<NonceConsumeResult> {
      let set = state.seenNonces.get(sessionId);
      if (!set) {
        set = new Set();
        state.seenNonces.set(sessionId, set);
      }
      if (set.has(nonce)) {
        return { firstUse: false, reasonCode: 'ERR_NONCE_REPLAY' };
      }
      set.add(nonce);
      return { firstUse: true };
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
