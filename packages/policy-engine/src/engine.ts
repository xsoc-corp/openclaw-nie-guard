import type { PolicyBundle, FheMode } from '@xsoc/shared-types';
import { MODE_COMPATIBILITY, OPERATION_TO_INTENT, isTainted } from '@xsoc/shared-types';
import type { PolicyDecision, PolicyEvaluationInput } from './types.js';
import { DEFAULT_ROLE_MATRIX, type RoleDefinition } from './default-roles.js';

export class PolicyEngine {
  private bundle: PolicyBundle | null = null;

  loadBundle(bundle: PolicyBundle): void {
    // Bundle signature verification happens in the loader before this call.
    // TODO(xsoc-openclaw-poc): add rotation audit hook that emits a Providence event.
    this.bundle = bundle;
  }

  evaluate(input: PolicyEvaluationInput): PolicyDecision {
    const role = this.resolveRole(input.role);
    if (!role) {
      return this.deny('ERR_ROLE_INVALID', `Role "${input.role}" not defined.`, input);
    }

    if (!role.allowedOperations.includes(input.operationClass)) {
      return this.deny('ERR_SCOPE_DENIED', `Role "${input.role}" cannot perform ${input.operationClass}.`, input);
    }

    const allowedIntentClasses = OPERATION_TO_INTENT[input.operationClass];
    if (!allowedIntentClasses || !allowedIntentClasses.includes(input.intentClass)) {
      return this.deny('ERR_INTENT_DRIFT', `Intent ${input.intentClass} not permitted for ${input.operationClass}.`, input);
    }

    // Taint gate. A session that has taken in attacker-controllable material may
    // not carry it outward or use it to raise its own authority.
    //
    // This is the control that bounds Cryptographic Context Injection. That
    // attack launders untrusted content through the agent's own runtime, so the
    // instruction that reaches this point looks first-party and the agent making
    // it is honest and deceived rather than hostile. Content inspection loses by
    // construction, since the payload is ciphertext on the way in and can be
    // re-encrypted on the way out. What does not lose is the observation that
    // this session took in untrusted material and is now asking to move data out.
    //
    // Scoped to export and escalate deliberately. Denying every operation in a
    // tainted session would make any session that fetched a page useless
    // afterward, which produces a control operators disable. Read and analyze
    // continue to work; the two intent classes that move data outward or raise
    // authority do not.
    if (input.sessionLabel && isTainted(input.sessionLabel)) {
      if (input.intentClass === 'export' || input.intentClass === 'escalate') {
        return this.deny(
          'ERR_SCOPE_DENIED',
          `Intent ${input.intentClass} is not permitted in a session carrying untrusted context (origins: ${input.sessionLabel.origins.join(', ')}).`,
          input
        );
      }
    }

    const allowedFheModes = MODE_COMPATIBILITY[input.classification];
    if (allowedFheModes.length === 0) {
      return this.deny('ERR_CLASSIFICATION_VIOLATION', `Classification ${input.classification} has no valid FHE mode.`, input);
    }

    const profile = input.requestedProfile ?? role.defaultProfile;
    const requiresDualControl = role.requiresDualControl.includes(input.operationClass);
    const requiresEndpointAttestation = input.classification === 'regulated' || input.classification === 'classified-adjacent';

    // scif profile additionally forbids the lethal trifecta interaction. Enforced at envelope level
    // in the adapter; policy engine permits admission but signals the constraint.
    return {
      allowed: true,
      profile,
      requiresDualControl,
      requiresEndpointAttestation,
      allowedFheModes: allowedFheModes as FheMode[]
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

  private deny(code: string, reason: string, _input: PolicyEvaluationInput): PolicyDecision {
    return {
      allowed: false,
      profile: 'strict',
      requiresDualControl: false,
      requiresEndpointAttestation: false,
      allowedFheModes: [],
      denyReasonCode: code,
      denyReason: reason
    };
  }
}
