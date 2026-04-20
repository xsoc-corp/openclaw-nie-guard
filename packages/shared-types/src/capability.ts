import { z } from 'zod';
import { OperationClass, PolicyProfile } from './operation.js';

// Short-TTL scoped capability issued at admission. Opaque string on the wire;
// the broker validates it via the NIE bindings on every /v1/invoke.
export const CapabilityToken = z.string().min(1);
export type CapabilityToken = z.infer<typeof CapabilityToken>;

// Admission request. Client submits device attestation, requested role, and requested operation set.
export const AdmissionRequest = z.object({
  attestationPackage: z.string().min(1),
  requestedRole: z.string().min(1),
  requestedOperationSet: z.array(OperationClass).min(1),
  clientMetadata: z.object({
    deviceFingerprint: z.string().min(1),
    userAgent: z.string().optional(),
    sdkVersion: z.string().optional(),
    processContextFingerprint: z.string().optional()
  })
});
export type AdmissionRequest = z.infer<typeof AdmissionRequest>;

export const AdmissionResponse = z.object({
  sessionId: z.string().uuid(),
  capabilityToken: CapabilityToken,
  profile: PolicyProfile,
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  correlationId: z.string().uuid()
});
export type AdmissionResponse = z.infer<typeof AdmissionResponse>;

// Derived child capability for sub-agent flows (Capability Derivation Tree).
export const DerivationRequest = z.object({
  parentCapability: CapabilityToken,
  scopeRestriction: z.object({
    operationClassSubset: z.array(OperationClass).min(1),
    targetClass: z.string().optional(),
    ttlSeconds: z.number().int().positive().max(900)
  })
});
export type DerivationRequest = z.infer<typeof DerivationRequest>;
