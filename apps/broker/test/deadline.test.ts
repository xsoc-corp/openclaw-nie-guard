import { describe, it, expect } from 'vitest';
import { withDeadline, DeadlineExceeded, DEADLINES } from '../src/lib/deadline.js';

describe('withDeadline', () => {
  it('resolves when the work finishes inside the budget', async () => {
    const r = await withDeadline('fast', 100, Promise.resolve('ok'));
    expect(r).toBe('ok');
  });

  it('rejects with DeadlineExceeded when the work hangs', async () => {
    const hung = new Promise<never>(() => { /* never settles */ });
    await expect(withDeadline('hung', 20, hung)).rejects.toBeInstanceOf(DeadlineExceeded);
  });

  it('carries the stage and budget on the error, so Providence can record which stage timed out', async () => {
    const hung = new Promise<never>(() => {});
    try {
      await withDeadline('adapter', 15, hung);
      expect.unreachable('should have timed out');
    } catch (err) {
      expect(err).toBeInstanceOf(DeadlineExceeded);
      expect((err as DeadlineExceeded).stage).toBe('adapter');
      expect((err as DeadlineExceeded).budgetMs).toBe(15);
    }
  });

  it('propagates a real rejection rather than masking it as a timeout', async () => {
    const boom = Promise.reject(new Error('upstream exploded'));
    await expect(withDeadline('boom', 500, boom)).rejects.toThrow('upstream exploded');
  });

  it('does not hold the event loop open after a fast resolve', async () => {
    const start = Date.now();
    await withDeadline('quick', 10_000, Promise.resolve(1));
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('every stage has a positive budget', () => {
    for (const [stage, ms] of Object.entries(DEADLINES)) {
      expect(ms, `${stage} budget`).toBeGreaterThan(0);
    }
  });
});