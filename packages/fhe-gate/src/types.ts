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

/** A Mode A inference: the payload's values, each sealed as its own ciphertext, and
 * a server-side template run on them with plaintext parameters. */
export interface ModeAInferenceInput {
  values: number[];
  template: string;
  parameters: Record<string, string>;
}

/** A ciphertext the FHE service holds, by its id, with its serialized size. */
export interface CiphertextRef {
  ciphertextId: string;
  sizeBytes: number;
}

export interface ModeAInference {
  /** One per input value, in order. */
  inputs: CiphertextRef[];
  /** The template's result, still ciphertext; `handle` is what a release names. */
  output: CiphertextRef & { handle: string };
  /** The scheme and parameters the ciphertexts are under. */
  scheme: string;
  polyModulusDegree?: number;
  securityLevel?: number;
}

/** A dual-control receipt for one release of one ciphertext. */
export interface DualControlGrant {
  receiptId: string;
  principals: string[];
  expiresAt: number;
}

/** What a Mode C release record carries beside the provider's own fields. */
export interface ReleaseContext {
  correlationId: string;
  classification: string;
  operationClass: string;
  endpointAttestationId: string;
  principals: string[];
}

/** A pre-flight of the gate's dependencies, read-only: its endpoint attestation and its FHE service. */
export interface FhePreflight {
  /** A fresh endpoint attestation; for the production gate, a reauth of its NIE device. */
  device: { ok: boolean; id?: string; error?: string };
  /** The FHE service's health check, as the gate's own calls reach it. */
  service: { ok: boolean; status?: string; version?: string; error?: string };
}
