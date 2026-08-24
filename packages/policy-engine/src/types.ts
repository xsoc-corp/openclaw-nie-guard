import type { OperationClass, PolicyProfile, Classification, IntentClass, Label } from '@xsoc/shared-types';

export interface PolicyEvaluationInput {
  subjectId: string;
  role: string;
  operationClass: OperationClass;
  targetClass: string;
  classification: Classification;
  intentClass: IntentClass;
  requestedProfile?: PolicyProfile;
  // Taint label of the session making the request, joined from the declared
  // origins of every context element it has registered. Absent means the
  // session has registered no context, which is untainted rather than an error.
  sessionLabel?: Label;
  /**
   * Content hashes of the untrusted ancestors carried by this session. Recorded
   * on the taint predicate so a decision can answer what the agent had read
   * before it acted, which a bare denial cannot.
   */
  sessionAncestors?: string[];
}

/**
 * Result of one authorization predicate.
 *
 * Every predicate is evaluated on every decision, including decisions that fail
 * elsewhere. Short-circuiting at the first failure loses the information that
 * matters most: in a live injection attempt the laundered instruction often
 * reaches for a scope the agent does not hold, so a scope denial is returned and
 * the taint result never appears. That reads as routine misconfiguration while an
 * attack is in progress.
 *
 * A predicate whose prerequisite failed is recorded as failed with the
 * prerequisite named. It is never recorded as passed and never omitted.
 */
export interface PredicateResult {
  /** Stable identifier. Rules key on this, so it must not drift with wording. */
  name: 'role' | 'scope' | 'intent' | 'taint' | 'classification';
  passed: boolean;
  /** Present when passed is false. */
  reason?: string;
  /** Error code this predicate contributes when it is the first to fail. */
  code?: string;
  /**
   * Content hashes of the ancestors that caused a taint failure. Answers what
   * the agent had read before it acted, which a bare denial cannot.
   */
  ancestors?: string[];
}

export interface PolicyDecision {
  allowed: boolean;
  profile: PolicyProfile;
  requiresDualControl: boolean;
  requiresEndpointAttestation: boolean;
  allowedFheModes: ('A' | 'B' | 'C')[];
  denyReasonCode?: string;
  denyReason?: string;
  /**
   * Every predicate and its result, in evaluation order. Goes to Providence.
   * The caller-facing HTTP body carries only the first failing code; this
   * record is the audit and detection surface.
   */
  predicates: PredicateResult[];
}
