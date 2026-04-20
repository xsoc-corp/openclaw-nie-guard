import type { Classification, FheMode, ContextElement } from '@xsoc/shared-types';

export interface ModeASelection {
  mode: 'A';
  elements: ContextElement[];
}

export interface ModeBSelection {
  mode: 'B';
  elements: ContextElement[];
  tokenMap: Record<string, string>;
}

export interface ModeCSelection {
  mode: 'C';
  elements: ContextElement[];
  endpointAttestationId: string;
  dualControlReceiptId?: string;
}

export type GateDecision = ModeASelection | ModeBSelection | ModeCSelection | ModeDenied;

export interface ModeDenied {
  mode: 'denied';
  reasonCode: string;
  attemptedMode: FheMode;
  classification: Classification;
}

export interface GateInput {
  elements: ContextElement[];
  requestedMode: FheMode;
  classification: Classification;
  operationClass: string;
  endpointAttestationId?: string;
  dualControlReceiptId?: string;
}
