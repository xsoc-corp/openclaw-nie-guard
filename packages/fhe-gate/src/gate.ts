import { MODE_COMPATIBILITY } from '@xsoc/shared-types';
import type {
  DualControlGrant, GateDecision, GateInput, ModeAInference, ModeAInferenceInput, ModeDenied, ReleaseContext
} from './types.js';

// Policy-aware mode enforcement. Cryptographic operations are delegated to a pluggable
// provider; the default mock provider in this repo is deterministic and non-cryptographic.
export class FheGate {
  private readonly provider: FheProvider;

  constructor(provider: FheProvider) {
    this.provider = provider;
  }

  evaluate(input: GateInput): GateDecision {
    const allowed = MODE_COMPATIBILITY[input.classification];
    if (!allowed.includes(input.requestedMode)) {
      return this.deny('ERR_CLASSIFICATION_VIOLATION', input);
    }

    if (input.requestedMode === 'C') {
      if (!input.endpointAttestationId) {
        return this.deny('ERR_ENDPOINT_ATTESTATION_FAILED', input);
      }
      if (input.classification === 'regulated' && !input.dualControlReceiptId) {
        return this.deny('ERR_DUAL_CONTROL_REQUIRED', input);
      }
      if (input.classification === 'classified-adjacent') {
        // classified-adjacent is Mode A only; defense in depth beyond the compatibility matrix.
        return this.deny('ERR_MODE_C_UNAUTHORIZED', input);
      }
      return {
        mode: 'C',
        elements: input.elements,
        endpointAttestationId: input.endpointAttestationId,
        dualControlReceiptId: input.dualControlReceiptId
      };
    }

    if (input.requestedMode === 'B') {
      return {
        mode: 'B',
        elements: input.elements,
        tokenMap: this.provider.buildTokenMap(input.elements)
      };
    }

    return {
      mode: 'A',
      elements: input.elements
    };
  }

  async encryptForModeA(plaintext: string): Promise<string> {
    return this.provider.encrypt(plaintext);
  }

  async decryptModeC(ciphertext: string, receiptId: string): Promise<string> {
    return this.provider.decrypt(ciphertext, receiptId);
  }

  /**
   * Seal each value under the provider's scheme and run a server-side template on the
   * ciphertexts. The result stays ciphertext; releasing it is a separate step.
   */
  async inferModeA(input: ModeAInferenceInput): Promise<ModeAInference> {
    if (!this.provider.inferModeA) throw new Error('this FHE provider runs no Mode A inference');
    return this.provider.inferModeA(input);
  }

  /** The endpoint attestation a Mode C release presents: an id, fresh for this release. */
  async attestEndpoint(): Promise<string> {
    if (!this.provider.attestEndpoint) throw new Error('this FHE provider attests no endpoint');
    return this.provider.attestEndpoint();
  }

  /** A dual-control receipt for one release of `ciphertext`, naming two principals or more. */
  async issueDualControlReceipt(ciphertext: string, principals: string[]): Promise<DualControlGrant> {
    if (!this.provider.issueDualControlReceipt) throw new Error('this FHE provider issues no dual-control receipt');
    return this.provider.issueDualControlReceipt(ciphertext, principals);
  }

  /**
   * Release a Mode A result as values, with a dual-control receipt. The caller has
   * already had the release decided by evaluate() with requestedMode 'C'; the provider
   * validates and consumes the receipt, and records the release.
   */
  async releaseModeC(ciphertext: string, receiptId: string, context: ReleaseContext): Promise<number[]> {
    if (!this.provider.releaseModeC) throw new Error('this FHE provider releases no Mode A result');
    return this.provider.releaseModeC(ciphertext, receiptId, context);
  }

  private deny(reasonCode: string, input: GateInput): ModeDenied {
    return {
      mode: 'denied',
      reasonCode,
      attemptedMode: input.requestedMode,
      classification: input.classification
    };
  }
}

export interface FheProvider {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string, receiptId: string): Promise<string>;
  buildTokenMap(elements: readonly { elementId: string; contentHash: string }[]): Record<string, string>;
  describePerformance(): { encryptMs: number; multiplyMs: number; scheme: string };
  inferModeA?(input: ModeAInferenceInput): Promise<ModeAInference>;
  attestEndpoint?(): Promise<string>;
  issueDualControlReceipt?(ciphertext: string, principals: string[]): Promise<DualControlGrant>;
  releaseModeC?(ciphertext: string, receiptId: string, context: ReleaseContext): Promise<number[]>;
}
