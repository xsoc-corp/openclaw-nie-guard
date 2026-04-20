// @xsoc/policy-engine
//
// Deny-by-default policy evaluation. Loads signed policy bundles and evaluates admission,
// operation invocation, and dual-control requirements.

export { PolicyEngine } from './engine.js';
export { loadPolicyBundle } from './loader.js';
export { DEFAULT_ROLE_MATRIX } from './default-roles.js';
export type { PolicyDecision, PolicyEvaluationInput } from './types.js';
