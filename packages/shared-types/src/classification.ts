import { z } from 'zod';

// Context classification governs FHE Context Gate mode selection and profile compatibility.
// See docs/architecture.md section on FHE Context Gate.
export const Classification = z.enum(['public', 'sensitive', 'regulated', 'classified-adjacent']);
export type Classification = z.infer<typeof Classification>;

export const FheMode = z.enum(['A', 'B', 'C']);
export type FheMode = z.infer<typeof FheMode>;

// Classification to mode compatibility. Enforced by fhe-gate.
export const MODE_COMPATIBILITY: Record<Classification, FheMode[]> = {
  'public': ['A', 'B', 'C'],
  'sensitive': ['A', 'B', 'C'],
  'regulated': ['A', 'B', 'C'],
  'classified-adjacent': ['A']
};

// Context element describes a single piece of material entering the model context.
export const ContextElement = z.object({
  elementId: z.string().uuid(),
  provenance: z.enum(['user', 'system', 'rag', 'tool-output', 'mcp-response', 'external-channel']),
  classification: Classification,
  contentHash: z.string().length(64),
  sentinelMarkId: z.string().optional(),
  registeredAt: z.number().int().positive()
});
export type ContextElement = z.infer<typeof ContextElement>;

export const ContextManifest = z.object({
  manifestId: z.string().uuid(),
  elements: z.array(ContextElement),
  manifestHash: z.string().length(64),
  builtAt: z.number().int().positive()
});
export type ContextManifest = z.infer<typeof ContextManifest>;
