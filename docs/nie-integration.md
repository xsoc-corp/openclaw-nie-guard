# NIE Integration Contract

Interface and stated security properties for the XSOC NIE primitives consumed by
OPENCLAW-NIE-GUARD. This document describes only the public contract. Construction
details are not present here and are not disclosed outside the private deployment
repo and internal XSOC engineering.

## Interface surface (from `@xsoc/nie-bindings`)

```ts
interface NieBindings {
  attest(request: AdmissionRequest): Promise<AttestationResult>;
  verifyToken(token: CapabilityToken): Promise<TokenVerificationResult>;
  deriveScopedCapability(input: DerivationRequest): Promise<CapabilityToken>;
  sealEnvelope(envelope: TstlEnvelope): Promise<SealedEnvelope>;
  validateContinuityEnvelope(sealed: SealedEnvelope): Promise<TstlEnvelope>;
  revokeSubject(input: RevocationInput): Promise<RevocationResult>;
  getVersion(): VersionInfo;
}
```

## Stated security properties

### attest

- Validates a device attestation package against the configured attestation floor
- Returns a subject identity, device fingerprint, and admission response on success
- Throws if the attestation floor is not met, if the subject or device is revoked,
  or if the package is malformed
- Does not leak attestation material to callers

### verifyToken

- Validates a capability token for structure, signature, and expiration
- Returns session and subject metadata on success
- Token validity window is short (default 15 minutes)
- Token is bound to session, subject, device fingerprint, role hash, operation class,
  target class, and continuity profile

### deriveScopedCapability (Capability Derivation Tree)

- Produces a child capability strictly narrower than the parent
- Child inherits parent's subject, device, and session
- Child TTL is bounded by parent's remaining TTL
- Child operation set must be a subset of parent's operation set
- Revoking the parent cascades to all children in sub-millisecond time

### sealEnvelope and validateContinuityEnvelope

- Seal produces an opaque sealed envelope from a TstlEnvelope
- Validate returns the envelope on success, throws on tamper or expiry
- Sealed envelope is bound to device fingerprint, session, counter sequence,
  target hash, role scope hash, context manifest hash, intent hash, and
  classification
- Cryptographic construction of the seal is a black-box primitive; not documented here

### revokeSubject

- Acknowledges a revocation for subject, session, or device
- Propagates to in-process cache, Redis mirror, and event fan-out bus
- Revocation is effective on the next `verifyToken` call across all brokers in the fleet

## Performance envelope

Production binding performance targets (from published NIE benchmarks):

- attest: < 50ms p95 on TPM-attested desktop
- verifyToken: < 2ms p95
- deriveScopedCapability: < 5ms p95
- sealEnvelope: < 3ms p95
- validateContinuityEnvelope: < 3ms p95
- revokeSubject acknowledgment: < 10ms p95; propagation < 200ms intra-region

Mock binding performance in this repo is O(microseconds) and not representative.

## Disclosure boundary

Under no circumstances does this document or any file in the public repository
describe:

- Key schedule or derivation path of DSKAG
- Cipher or permutation construction
- Internal state machines of any cryptographic primitive
- Parameter selection for ML-KEM, CKKS, or any other scheme
- Wave modulation parameters
- Any detail that would enable reimplementation without licensing

See `docs/disclosure-policy.md`.
