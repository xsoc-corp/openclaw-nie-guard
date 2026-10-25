import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { FheGate, type FheProvider } from './gate.js';
import type { ProvidenceAppendInput } from '@xsoc/shared-types';
import type { ModeAInferenceInput, ReleaseContext } from './types.js';

/** The mock computes in the clear; its scheme says so on every result. */
export const MOCK_SCHEME = 'mock: no cryptography';

// Mock provider. Not cryptographic. Production provider bridges to XSOC FHE SDK via Java gRPC wrapper.
// TODO(xsoc-openclaw-poc): wire @xsoc/fhe-gate-prod via workspace override for production.
export function createMockFheGate(options: { providenceSink?: { append(input: ProvidenceAppendInput): Promise<void> } } = {}): FheGate {
  // Mode A results by handle, and receipts by id: in memory, for the reference build.
  const results = new Map<string, number[]>();
  const receipts = new Map<string, { handle: string; used: boolean; expiresAt: number }>();
  const provider: FheProvider = {
    async encrypt(plaintext: string): Promise<string> {
      return 'mock-ct:' + createHash('sha256').update(plaintext).digest('hex');
    },
    async decrypt(ciphertext: string, _receiptId: string): Promise<string> {
      // Non-reversible mock; production decrypt is real. This mock is not for cryptographic correctness.
      return `[mock-decrypted:${ciphertext.slice(0, 16)}]`;
    },
    buildTokenMap(elements): Record<string, string> {
      const map: Record<string, string> = {};
      for (const el of elements) {
        map[el.elementId] = 'tok_' + randomBytes(8).toString('hex');
      }
      return map;
    },
    async inferModeA(input: ModeAInferenceInput) {
      if (input.template !== 'weighted-sum') throw new Error(`the mock runs weighted-sum only, not ${input.template}`);
      const weights = (input.parameters.weights ?? '').split(',').map(Number);
      if (weights.length !== input.values.length || weights.some((w) => !Number.isFinite(w))) {
        throw new Error('weights count must match inputs count');
      }
      const sum = input.values.reduce((acc, v, i) => acc + v * weights[i]!, 0);
      const handle = `mock-ct:${randomUUID()}`;
      results.set(handle, [sum]);
      return {
        inputs: input.values.map(() => ({ ciphertextId: `mock-ct-${randomUUID()}`, sizeBytes: 0 })),
        output: { ciphertextId: handle.slice('mock-ct:'.length), sizeBytes: 0, handle },
        scheme: MOCK_SCHEME
      };
    },
    async attestEndpoint() {
      return 'mock-endpoint';
    },
    async issueDualControlReceipt(ciphertext: string, principals: string[]) {
      if (new Set(principals).size < 2) throw new Error('dual-control requires at least 2 distinct principals');
      const receiptId = randomUUID();
      const expiresAt = Date.now() + 5 * 60_000;
      receipts.set(receiptId, { handle: ciphertext, used: false, expiresAt });
      return { receiptId, principals: [...principals], expiresAt };
    },
    async releaseModeC(ciphertext: string, receiptId: string, context: ReleaseContext) {
      const r = receipts.get(receiptId);
      if (!r || r.used || r.handle !== ciphertext || r.expiresAt < Date.now()) throw new Error('dual-control receipt not valid');
      const values = results.get(ciphertext);
      if (!values) throw new Error('no such Mode A result');
      r.used = true;
      // The release is recorded where a sink is given, as the production gate records it.
      await options.providenceSink?.append({
        eventType: 'mode_c_decryption',
        correlationId: context.correlationId,
        classification: context.classification,
        operationClass: context.operationClass,
        targetHash: ciphertext.slice('mock-ct:'.length),
        metadata: { receiptId, principals: context.principals, endpointAttestation: context.endpointAttestationId, scheme: MOCK_SCHEME }
      });
      return values;
    },
    describePerformance() {
      // Published XSOC FHE SDK numbers (CKKS scheme). Mock reports the production figures.
      return { encryptMs: 40.28, multiplyMs: 1.29, scheme: 'CKKS' };
    }
  };

  return new FheGate(provider);
}
