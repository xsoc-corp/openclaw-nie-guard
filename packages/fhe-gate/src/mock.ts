import { createHash, randomBytes } from 'node:crypto';
import { FheGate, type FheProvider } from './gate.js';

// Mock provider. Not cryptographic. Production provider bridges to XSOC FHE SDK via Java gRPC wrapper.
// TODO(xsoc-openclaw-poc): wire @xsoc/fhe-gate-prod via workspace override for production.
export function createMockFheGate(): FheGate {
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
    describePerformance() {
      // Published XSOC FHE SDK numbers (CKKS scheme). Mock reports the production figures.
      return { encryptMs: 40.28, multiplyMs: 1.29, scheme: 'CKKS' };
    }
  };

  return new FheGate(provider);
}
