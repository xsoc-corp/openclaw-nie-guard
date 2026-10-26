import { describe, it, expect } from 'vitest';
import { FheGate, type FheProvider } from '../src/gate.js';

function provider(calls: string[], fail = false): FheProvider {
  return {
    async encrypt() { return 'x'; }, async decrypt() { return 'x'; },
    buildTokenMap() { return {}; }, describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'x' }; },
    async close() {
      calls.push('provider');
      if (fail) throw new Error('destroy failed');
    }
  };
}

describe('FheGate.close', () => {
  it('closes the provider, then runs the owner\'s close, once', async () => {
    const calls: string[] = [];
    const gate = new FheGate(provider(calls), { onClose: async () => { calls.push('owner'); } });
    await Promise.all([gate.close(), gate.close()]);
    await gate.close();
    expect(calls).toEqual(['provider', 'owner']);
  });

  it('runs the owner\'s close when the provider\'s fails, and reports the failure', async () => {
    const calls: string[] = [];
    const gate = new FheGate(provider(calls, true), { onClose: async () => { calls.push('owner'); } });
    await expect(gate.close()).rejects.toThrow(/destroy failed/);
    expect(calls).toEqual(['provider', 'owner']);
  });

  it('closes a provider with nothing to release', async () => {
    const gate = new FheGate({
      async encrypt() { return 'x'; }, async decrypt() { return 'x'; },
      buildTokenMap() { return {}; }, describePerformance() { return { encryptMs: 0, multiplyMs: 0, scheme: 'x' }; }
    });
    await expect(gate.close()).resolves.toBeUndefined();
  });
});
