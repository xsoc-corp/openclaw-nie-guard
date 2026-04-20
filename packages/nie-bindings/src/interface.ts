import type {
  AdmissionRequest,
  AdmissionResponse,
  CapabilityToken,
  DerivationRequest,
  SealedEnvelope,
  TstlEnvelope
} from '@xsoc/shared-types';

// Full public contract for NIE bindings. Implementations in this repo are mock.
// Production implementation lives in @xsoc/nie-bindings-prod.
export interface NieBindings {
  // Verify a client-submitted attestation package. Returns a normalized subject identity
  // and admission response if attestation passes.
  attest(request: AdmissionRequest): Promise<AttestationResult>;

  // Verify a scoped capability token. Returns token metadata if valid.
  verifyToken(token: CapabilityToken): Promise<TokenVerificationResult>;

  // Derive a new scoped capability from an admitted session. Used at admission time
  // and for Capability Derivation Tree child scopes.
  deriveScopedCapability(input: DerivationRequest): Promise<CapabilityToken>;

  // Seal a TSTL envelope for transport. Opaque return value carried by the client.
  sealEnvelope(envelope: TstlEnvelope): Promise<SealedEnvelope>;

  // Validate a sealed TSTL envelope. Returns the envelope content on success.
  validateContinuityEnvelope(sealed: SealedEnvelope): Promise<TstlEnvelope>;

  // Revoke a subject, session, or device. Propagates through all revocation channels.
  revokeSubject(input: RevocationInput): Promise<RevocationResult>;

  // Return the binding implementation version and mode.
  getVersion(): VersionInfo;
}

export interface AttestationResult {
  subjectId: string;
  deviceFingerprint: string;
  attestationFloor: 'software-min' | 'tpm' | 'secure-enclave' | 'strongbox' | 'hsm';
  validatedAt: number;
  admission: AdmissionResponse;
}

export interface TokenVerificationResult {
  valid: boolean;
  sessionId?: string;
  subjectId?: string;
  deviceFingerprint?: string;
  expiresAt?: number;
  reasonCode?: string;
}

export interface RevocationInput {
  kind: 'subject' | 'session' | 'device';
  id: string;
  reason: string;
}

export interface RevocationResult {
  acknowledged: boolean;
  channelsNotified: string[];
  propagationTimestamp: number;
}

export interface VersionInfo {
  bindingVersion: string;
  mode: 'mock' | 'wasm' | 'ffi' | 'prod';
  nieCoreVersion?: string;
}
