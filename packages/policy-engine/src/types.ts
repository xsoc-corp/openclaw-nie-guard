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
}

export interface PolicyDecision {
  allowed: boolean;
  profile: PolicyProfile;
  requiresDualControl: boolean;
  requiresEndpointAttestation: boolean;
  allowedFheModes: ('A' | 'B' | 'C')[];
  denyReasonCode?: string;
  denyReason?: string;
}
