import type { PolicyBundle, FheMode } from '@xsoc/shared-types';
import { MODE_COMPATIBILITY, OPERATION_TO_INTENT, isTainted } from '@xsoc/shared-types';
import type { PolicyDecision, PolicyEvaluationInput, PredicateResult } from './types.js';
import { DEFAULT_ROLE_MATRIX, type RoleDefinition } from './default-roles.js';

export class PolicyEngine {
  private bundle: PolicyBundle | null = null;

  loadBundle(bundle: PolicyBundle): void {
    // Bundle signature verification happens in the loader before this call.
    // TODO(xsoc-openclaw-poc): add rotation audit hook that emits a Providence event.
    this.bundle = bundle;
  }

  /**
   * Evaluates every predicate and denies if any fails.
   *
   * Deliberately not short-circuiting. Under short-circuit evaluation the first
   * failure is the only thing recorded, and in a live injection attempt the
   * laundered instruction frequently reaches for a scope the agent does not
   * hold. That denies at scope and reads as routine misconfiguration while an
   * attack is in progress, with the taint result never appearing anywhere. The
   * taint predicate belongs on every decision, including decisions that fail
   * elsewhere, because that is the chain signal detection keys on.
   *
   * The caller-facing error code remains the first failure in evaluation order,
   * so response bodies and their codes are unchanged.
   */
  evaluate(input: PolicyEvaluationInput): PolicyDecision {
    const predicates: PredicateResult[] = [];

    // Role. The only predicate others depend on.
    const role = this.resolveRole(input.role);
    predicates.push(
      role
        ? { name: 'role', passed: true }
        : {
            name: 'role',
            passed: false,
            reason: `Role "${input.role}" not defined.`,
            code: 'ERR_ROLE_INVALID'
          }
    );

    // Scope. Cannot be evaluated without a role. Recorded as failed with the
    // prerequisite named rather than omitted or assumed to pass.
    if (!role) {
      predicates.push({
        name: 'scope',
        passed: false,
        reason: 'Not evaluated: role did not resolve.',
        code: 'ERR_SCOPE_DENIED'
      });
    } else if (!role.allowedOperations.includes(input.operationClass)) {
      predicates.push({
        name: 'scope',
        passed: false,
        reason: `Role "${input.role}" cannot perform ${input.operationClass}.`,
        code: 'ERR_SCOPE_DENIED'
      });
    } else {
      predicates.push({ name: 'scope', passed: true });
    }

    // Intent. Independent of role, so a role failure does not suppress it.
    const allowedIntentClasses = OPERATION_TO_INTENT[input.operationClass];
    if (!allowedIntentClasses || !allowedIntentClasses.includes(input.intentClass)) {
      predicates.push({
        name: 'intent',
        passed: false,
        reason: `Intent ${input.intentClass} not permitted for ${input.operationClass}.`,
        code: 'ERR_INTENT_DRIFT'
      });
    } else {
      predicates.push({ name: 'intent', passed: true });
    }

    // Taint. Independent of role and scope. A session that has taken in
    // attacker-controllable material may not carry it outward or use it to
    // raise its own authority. Carries the ancestor hashes so the record can
    // answer what the agent had read before it acted.
    const tainted = input.sessionLabel ? isTainted(input.sessionLabel) : false;
    const outwardIntent = input.intentClass === 'export' || input.intentClass === 'escalate';
    if (tainted && outwardIntent) {
      predicates.push({
        name: 'taint',
        passed: false,
        reason: `Intent ${input.intentClass} is not permitted in a session carrying untrusted context (origins: ${input.sessionLabel?.origins.join(', ')}).`,
        code: 'ERR_SCOPE_DENIED',
        ancestors: input.sessionAncestors ?? []
      });
    } else {
      predicates.push({
        name: 'taint',
        passed: true,
        ancestors: tainted ? (input.sessionAncestors ?? []) : undefined
      });
    }

    // Classification. Independent.
    const allowedFheModes = MODE_COMPATIBILITY[input.classification] ?? [];
    if (allowedFheModes.length === 0) {
      predicates.push({
        name: 'classification',
        passed: false,
        reason: `Classification ${input.classification} has no valid FHE mode.`,
        code: 'ERR_CLASSIFICATION_VIOLATION'
      });
    } else {
      predicates.push({ name: 'classification', passed: true });
    }

    const firstFailure = predicates.find((p) => !p.passed);
    if (firstFailure) {
      return {
        allowed: false,
        profile: 'strict',
        requiresDualControl: false,
        requiresEndpointAttestation: false,
        allowedFheModes: [],
        denyReasonCode: firstFailure.code,
        denyReason: firstFailure.reason,
        predicates
      };
    }

    // Every predicate passed, so role is defined.
    const resolved = role as RoleDefinition;
    const profile = input.requestedProfile ?? resolved.defaultProfile;
    const requiresDualControl = resolved.requiresDualControl.includes(input.operationClass);
    const requiresEndpointAttestation =
      input.classification === 'regulated' || input.classification === 'classified-adjacent';

    // scif profile additionally forbids the lethal trifecta interaction. Enforced at envelope level
    // in the adapter; policy engine permits admission but signals the constraint.
    return {
      allowed: true,
      profile,
      requiresDualControl,
      requiresEndpointAttestation,
      allowedFheModes: allowedFheModes as FheMode[],
      predicates
    };
  }

  private resolveRole(roleName: string): RoleDefinition | undefined {
    if (this.bundle) {
      const r = this.bundle.payload.roles[roleName];
      if (!r) return undefined;
      return {
        description: r.description,
        allowedOperations: r.allowedOperations,
        defaultProfile: r.defaultProfile,
        requiresDualControl: r.requiresDualControl
      };
    }
    return DEFAULT_ROLE_MATRIX[roleName];
  }
}