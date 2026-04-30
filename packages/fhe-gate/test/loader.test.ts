import { describe, it, expect } from 'vitest';
import { loadFheGate, FheGate } from '../src/index.js';

describe('loadFheGate', () => {
  it('is exported as an async function', () => {
    expect(typeof loadFheGate).toBe('function');
  });

  it('resolves to a defined gate', async () => {
    const gate = await loadFheGate();
    expect(gate).toBeDefined();
    expect(gate).not.toBeNull();
  });

  it('returns an FheGate instance', async () => {
    const gate = await loadFheGate();
    expect(gate).toBeInstanceOf(FheGate);
  });
});