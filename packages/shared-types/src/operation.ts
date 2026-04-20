import { z } from 'zod';

// Operation classes correspond to the allowlist enforced by the OpenClaw adapter.
export const OperationClass = z.enum([
  'operator.read',
  'operator.write',
  'tool.invoke',
  'node.invoke',
  'file.read',
  'file.write',
  'export.data',
  'exec.run',
  'admin.control'
]);
export type OperationClass = z.infer<typeof OperationClass>;

// Continuity policy profile. Determines enforcement strictness.
export const PolicyProfile = z.enum(['relaxed', 'standard', 'strict', 'scif']);
export type PolicyProfile = z.infer<typeof PolicyProfile>;

// Request for a mediated OpenClaw invocation. All fields are required.
export const InvokeRequest = z.object({
  capabilityToken: z.string().min(1),
  envelope: z.string().min(1),
  operationClass: OperationClass,
  targetId: z.string().min(1),
  targetClass: z.string().min(1),
  intentHash: z.string().length(64),
  contextManifestHash: z.string().length(64),
  nonce: z.string().min(16),
  correlationId: z.string().uuid()
});
export type InvokeRequest = z.infer<typeof InvokeRequest>;

export const InvokeResponse = z.object({
  correlationId: z.string().uuid(),
  result: z.unknown(),
  providenceEventId: z.string().min(1)
});
export type InvokeResponse = z.infer<typeof InvokeResponse>;
