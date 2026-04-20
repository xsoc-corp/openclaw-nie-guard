import type { OperationClass, PolicyProfile, Classification, IntentClass } from '@xsoc/shared-types';

export interface PolicyEvaluationInput {
  subjectId: string;
  role: string;
  operationClass: OperationClass;
  targetClass: string;
  classification: Classification;
  intentClass: IntentClass;
  requestedProfile?: PolicyProfile;
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
