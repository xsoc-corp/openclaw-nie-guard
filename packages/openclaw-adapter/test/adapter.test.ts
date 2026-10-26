import { describe, it, expect } from 'vitest';
import { OpenClawAdapter, type OpenClawTransport } from '../src/index.js';
import type { MediatedOperation } from '../src/types.js';

function transport() {
  const calls: string[] = [];
  const answer = (m: string) => async () => { calls.push(m); return { ok: true, result: { m } }; };
  const t: OpenClawTransport = {
    name: 'test', getStatus: answer('status'), invokeTool: answer('tool'), invokeNode: answer('node'),
    readResource: answer('read'), writeResource: answer('write'), executeRestricted: answer('exec')
  };
  return { t, calls };
}
const op = (operationClass: MediatedOperation['operationClass']): MediatedOperation =>
  ({ operationClass, targetId: 'x', targetClass: 'generic', payload: {}, bindingHash: '0'.repeat(64), correlationId: 'c' });

describe('OpenClawAdapter.forward', () => {
  it('marks an answer from the transport as forwarded', async () => {
    const { t, calls } = transport();
    expect(await new OpenClawAdapter(t).forward(op('tool.invoke'), 'standard')).toEqual({ ok: true, result: { m: 'tool' }, forwarded: true });
    expect(calls).toEqual(['tool']);
  });

  it('refuses default-deny, strict-only and unknown classes itself, forwarding nothing', async () => {
    const { t, calls } = transport();
    const a = new OpenClawAdapter(t);
    for (const [cls, profile] of [['exec.run', 'standard'], ['node.invoke', 'standard'], ['bogus', 'strict']] as const) {
      const r = await a.forward(op(cls as MediatedOperation['operationClass']), profile);
      expect(r).toMatchObject({ ok: false, forwarded: false, error: { code: 'ERR_OPERATION_BLOCKED' } });
    }
    expect(calls).toEqual([]);
  });
});
