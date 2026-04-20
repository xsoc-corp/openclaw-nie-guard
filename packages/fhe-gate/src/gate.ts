import { MODE_COMPATIBILITY } from '@xsoc/shared-types';
import type { GateDecision, GateInput, ModeDenied } from './types.js';

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
}
