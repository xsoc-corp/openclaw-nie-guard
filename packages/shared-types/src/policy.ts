import { z } from 'zod';
import { OperationClass, PolicyProfile } from './operation.js';

// Policy bundle format. Bundles are signed artifacts; the signature scheme lives in NIE bindings.
// See docs/disclosure-policy.md for public/private boundary on the signing primitive.
export const PolicyBundle = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  bundleId: z.string().uuid(),
  effectiveFrom: z.number().int().positive(),
  effectiveUntil: z.number().int().positive().optional(),
  signerKeyId: z.string().min(1),
  signature: z.string().min(1),
  payload: z.object({
    roles: z.record(z.string(), z.object({
      description: z.string(),
      allowedOperations: z.array(OperationClass),
      defaultProfile: PolicyProfile,
      requiresDualControl: z.array(OperationClass).default([]),
      skillAllowlist: z.array(z.string()).optional()
    })),
    mcpServers: z.array(z.object({
      serverId: z.string(),
      trustLevel: z.enum(['trusted', 'sanitized', 'blocked']),
      sanitizationProfile: z.string().optional()
    })).default([]),
    skills: z.array(z.object({
      skillId: z.string(),
      signerKeyId: z.string(),
      classification: z.enum(['trusted', 'community', 'blocked']),
      allowedInProfiles: z.array(PolicyProfile)
    })).default([])
  })
});
export type PolicyBundle = z.infer<typeof PolicyBundle>;
