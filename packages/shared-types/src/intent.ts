import { z } from 'zod';

// Agent Intent Envelope (AIE). Binds the agent's stated intent for a step into TSTL.
// A prompt-injected agent with a valid capability cannot invoke an allowed tool on
// an allowed target for the wrong purpose, because intent_class and intent_hash are
// bound into the envelope and verified at the adapter boundary.
export const IntentClass = z.enum(['read', 'write', 'analyze', 'export', 'execute', 'escalate']);
export type IntentClass = z.infer<typeof IntentClass>;

export const AgentIntent = z.object({
  intentId: z.string().uuid(),
  intentClass: IntentClass,
  planSummary: z.string().min(1).max(2000),
  expectedEffectHash: z.string().length(64),
  toolSelection: z.object({
    toolId: z.string().min(1),
    rationale: z.string().min(1).max(1000)
  }),
  declaredAt: z.number().int().positive()
});
export type AgentIntent = z.infer<typeof AgentIntent>;

// Mapping from operation class to permitted intent classes.
// Adapter rejects invocations where the declared intent class is not in the allowed set.
export const OPERATION_TO_INTENT: Record<string, IntentClass[]> = {
  'operator.read': ['read', 'analyze'],
  'operator.write': ['write'],
  'tool.invoke': ['read', 'analyze', 'write'],
  'node.invoke': ['read', 'analyze', 'write', 'execute'],
  'file.read': ['read', 'analyze'],
  'file.write': ['write'],
  'export.data': ['export'],
  'exec.run': ['execute'],
  'admin.control': ['escalate']
};
