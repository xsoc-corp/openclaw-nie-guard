// Structured error codes enforced across the broker, adapter, and SDK.
// Every deny or failure path MUST emit one of these codes; there are no ad-hoc error strings.

export const ErrorCodes = {
  ATTESTATION_FAILED: 'ERR_ATTESTATION_FAILED',
  SCOPE_DENIED: 'ERR_SCOPE_DENIED',
  ROLE_INVALID: 'ERR_ROLE_INVALID',
  NONCE_REPLAY: 'ERR_NONCE_REPLAY',
  SESSION_EXPIRED: 'ERR_SESSION_EXPIRED',
  SESSION_REVOKED: 'ERR_SESSION_REVOKED',
  CONTINUITY_FAILED: 'ERR_CONTINUITY_FAILED',
  TARGET_MISMATCH: 'ERR_TARGET_MISMATCH',
  OPERATION_BLOCKED: 'ERR_OPERATION_BLOCKED',
  POLICY_VIOLATION: 'ERR_POLICY_VIOLATION',
  OPENCLAW_FORWARD_FAILED: 'ERR_OPENCLAW_FORWARD_FAILED',
  INTENT_DRIFT: 'ERR_INTENT_DRIFT',
  CONTEXT_MANIFEST_INVALID: 'ERR_CONTEXT_MANIFEST_INVALID',
  CLASSIFICATION_VIOLATION: 'ERR_CLASSIFICATION_VIOLATION',
  MCP_SERVER_BLOCKED: 'ERR_MCP_SERVER_BLOCKED',
  MCP_RESPONSE_TAINTED: 'ERR_MCP_RESPONSE_TAINTED',
  SKILL_UNSIGNED: 'ERR_SKILL_UNSIGNED',
  SKILL_BLOCKED: 'ERR_SKILL_BLOCKED',
  POLICY_BUNDLE_INVALID: 'ERR_POLICY_BUNDLE_INVALID',
  DUAL_CONTROL_REQUIRED: 'ERR_DUAL_CONTROL_REQUIRED',
  DUAL_CONTROL_TIMEOUT: 'ERR_DUAL_CONTROL_TIMEOUT',
  MODE_C_UNAUTHORIZED: 'ERR_MODE_C_UNAUTHORIZED',
  ENDPOINT_ATTESTATION_FAILED: 'ERR_ENDPOINT_ATTESTATION_FAILED'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface StructuredError {
  code: ErrorCode;
  message: string;
  correlationId?: string;
  providenceEventId?: string;
  retryable: boolean;
}

export function structuredError(code: ErrorCode, message: string, opts: Partial<StructuredError> = {}): StructuredError {
  return {
    code,
    message,
    correlationId: opts.correlationId,
    providenceEventId: opts.providenceEventId,
    retryable: opts.retryable ?? false
  };
}
