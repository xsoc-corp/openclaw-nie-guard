// Test scaffolding: an FHE gate double for broker tests that are not about FHE. It is
// built on the FheGate class @xsoc/fhe-gate exports in either workspace, with a
// provider that does no cryptography, so it never resolves to a mock in product code.

import { createHash } from 'node:crypto';
import { FheGate } from '@xsoc/fhe-gate';

export function testFheGate(): FheGate {
  return new FheGate({
    async encrypt(plaintext: string) { return 'test-ct:' + createHash('sha256').update(plaintext).digest('hex'); },
    async decrypt(ciphertext: string) { return `[test-plaintext:${ciphertext.slice(0, 16)}]`; },
    buildTokenMap(elements) { return Object.fromEntries(elements.map((e) => [e.elementId, 'tok_' + e.contentHash.slice(0, 16)])); },
    describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'test double' }; }
  });
}
