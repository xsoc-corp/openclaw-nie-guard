// The OpenClaw gateway transport against a stand-in gateway: what it sends, and how
// each answer maps to the code the broker records. The real gateway run is in the
// production repository's evidence/u7-openclaw-transport.
import { describe, it, expect } from 'vitest';
import { OpenClawAdapter, OpenClawGatewayTransport, type GatewayTarget } from '../src/index.js';
import type { MediatedOperation } from '../src/types.js';

const TARGETS: Record<string, GatewayTarget> = { 'customer-records-export': { tool: 'memory_get', path: 'memory/customer-records-export.md' } };
const op = (targetId: string, operationClass: MediatedOperation['operationClass'] = 'export.data'): MediatedOperation =>
  ({ operationClass, targetId, targetClass: 'generic', payload: {}, bindingHash: '0'.repeat(64), correlationId: 'corr-1' });

function gateway(status: number, body: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { f, calls };
}
const make = (f: typeof fetch) => new OpenClawGatewayTransport({ url: 'http://127.0.0.1:18789', token: 'tok', version: '2026.10.7', targets: TARGETS, fetchImpl: f });
const ok = { ok: true, result: { details: { status: 'ok', text: '# rows', path: 'memory/customer-records-export.md', lines: 1 } } };

describe('OpenClawGatewayTransport', () => {
  it('reads a mapped target with memory_get, with the token, and returns its text', async () => {
    const g = gateway(200, ok);
    const r = await new OpenClawAdapter(make(g.f)).forward(op('customer-records-export'), 'strict');
    expect(r).toEqual({ ok: true, forwarded: true, result: { tool: 'memory_get', path: 'memory/customer-records-export.md', lines: 1, text: '# rows' } });
    expect(g.calls[0]!.url).toBe('http://127.0.0.1:18789/tools/invoke');
    expect((g.calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(String(g.calls[0]!.init!.body))).toEqual({ tool: 'memory_get', args: { path: 'memory/customer-records-export.md' }, idempotencyKey: 'corr-1' });
  });

  it('refuses an unknown target and unmapped classes before any call', async () => {
    const g = gateway(200, ok);
    const a = new OpenClawAdapter(make(g.f));
    expect(await a.forward(op('../etc/passwd'), 'strict')).toMatchObject({ ok: false, forwarded: false, error: { code: 'ERR_OPENCLAW_UNKNOWN_TARGET' } });
    expect(await a.forward(op('toString'), 'strict')).toMatchObject({ ok: false, forwarded: false, error: { code: 'ERR_OPENCLAW_UNKNOWN_TARGET' } });
    expect(await a.forward(op('customer-records-export', 'tool.invoke'), 'strict')).toMatchObject({ ok: false, forwarded: false, error: { code: 'ERR_OPENCLAW_NOT_MAPPED' } });
    expect(g.calls).toEqual([]);
  });

  it('maps the tool\'s own refusal, sent as HTTP 200, by details.status', async () => {
    const denied = gateway(200, { ok: true, result: { details: { status: 'error', code: 'MEMORY_PATH_NOT_ALLOWED', error: 'path is not an allowed Markdown memory file' } } });
    expect(await make(denied.f).readResource(op('customer-records-export'))).toMatchObject({ ok: false, error: { code: 'ERR_OPENCLAW_MEMORY_PATH_NOT_ALLOWED' } });
    const missing = gateway(200, { ok: true, result: { details: { status: 'not_found' } } });
    expect(await make(missing.f).readResource(op('customer-records-export'))).toMatchObject({ ok: false, error: { code: 'ERR_OPENCLAW_NOT_FOUND' } });
    const odd = gateway(200, { ok: true, result: { details: { status: 'error', code: 'lower-case!' } } });
    expect(await make(odd.f).readResource(op('customer-records-export'))).toMatchObject({ ok: false, error: { code: 'ERR_OPENCLAW_TOOL_ERROR' } });
  });

  it('maps non-200 answers by status, and no answer as unreachable', async () => {
    for (const [status, code] of [[401, 'ERR_OPENCLAW_UNAUTHORIZED'], [404, 'ERR_OPENCLAW_TOOL_NOT_AVAILABLE'], [403, 'ERR_OPENCLAW_POLICY'], [500, 'ERR_OPENCLAW_TOOL_FAILED'], [502, 'ERR_OPENCLAW_HTTP_502']] as const) {
      const g = gateway(status, { ok: false, error: { message: 'm' } });
      const r = await new OpenClawAdapter(make(g.f)).forward(op('customer-records-export'), 'strict');
      expect(r).toMatchObject({ ok: false, forwarded: true, error: { code } });
    }
    const down = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    expect(await new OpenClawAdapter(make(down)).forward(op('customer-records-export'), 'strict')).toMatchObject({ ok: false, forwarded: true, error: { code: 'ERR_OPENCLAW_UNREACHABLE' } });
  });

  it('accepts only a loopback http URL, a token without whitespace, and a release version', () => {
    const base = { token: 't', version: '2026.10.7', targets: TARGETS };
    for (const url of ['https://127.0.0.1:1', 'http://10.0.0.5:18789', 'http://localhost:18789', 'http://127.0.0.1:1/tools']) {
      expect(() => new OpenClawGatewayTransport({ ...base, url })).toThrow();
    }
    expect(new OpenClawGatewayTransport({ ...base, url: 'http://[::1]:18789' }).name).toBe('openclaw-gateway');
    expect(() => new OpenClawGatewayTransport({ ...base, url: 'http://127.0.0.1:1', token: 'a b' })).toThrow(/token/);
    expect(() => new OpenClawGatewayTransport({ ...base, url: 'http://127.0.0.1:1', version: 'latest' })).toThrow(/release version/);
    expect(() => new OpenClawGatewayTransport({ ...base, url: 'http://127.0.0.1:1', targets: { x: { tool: 'Bad Tool', path: 'p' } } })).toThrow();
  });
});
