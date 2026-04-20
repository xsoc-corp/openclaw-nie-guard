import type {
  AdmissionRequest,
  AdmissionResponse,
  CapabilityToken,
  DerivationRequest,
  SealedEnvelope,
  TstlEnvelope,
  OperationClass
} from '@xsoc/shared-types';

// Full public contract for NIE bindings. Implementations in this repo are mock.
// Production implementation lives in @xsoc/nie-bindings-prod.
export interface NieBindings {
  attest(request: AdmissionRequest): Promise<AttestationResult>;
  verifyToken(token: CapabilityToken): Promise<TokenVerificationResult>;
  deriveScopedCapability(input: DerivationRequest): Promise<CapabilityToken>;
  sealEnvelope(envelope: TstlEnvelope): Promise<SealedEnvelope>;
  validateContinuityEnvelope(sealed: SealedEnvelope): Promise<TstlEnvelope>;
  revokeSubject(input: RevocationInput): Promise<RevocationResult>;
  consumeNonce(nonce: string, sessionId: string): Promise<NonceConsumeResult>;
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
  role?: string;
  requestedOperationSet?: OperationClass[];
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

export interface NonceConsumeResult {
  firstUse: boolean;
  reasonCode?: string;
}

export interface VersionInfo {
  bindingVersion: string;
  mode: 'mock' | 'wasm' | 'ffi' | 'prod';
  nieCoreVersion?: string;
}
