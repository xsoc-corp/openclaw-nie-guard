// The OpenClaw gateway transport: mediated operations forwarded to an OpenClaw gateway
// over its documented HTTP surface, POST /tools/invoke, with the gateway's shared
// token. The gateway is reached on loopback only; the broker is its only client.
//
// Reads (operator.read, file.read, export.data) map through a fixed target table:
// targetId -> { tool, path }. Nothing in the request names a path or a tool. A target
// the table does not hold is refused here, before any call (forwarded: false). Every
// other operation class is not mapped in this transport and is refused the same way.
//
// The gateway's answer is mapped to a code the broker records:
//   non-200          ERR_OPENCLAW_<reason> by status (401 UNAUTHORIZED, 404
//                    TOOL_NOT_AVAILABLE, ...)
//   200, ok false    ERR_OPENCLAW_TOOL_FAILED
//   200, details.status not "ok": the tool's own refusal, ERR_OPENCLAW_<its code>
//                    (MEMORY_PATH_NOT_ALLOWED, ...) or ERR_OPENCLAW_NOT_FOUND
//   no answer        ERR_OPENCLAW_UNREACHABLE
// A refusal the gateway answered, and a call that got no answer, are forwarded
// operations: the transport called the gateway.

import type { OpenClawTransport } from './adapter.js';
import type { AdapterResponse, MediatedOperation } from './types.js';

export interface GatewayTarget {
  /** The gateway tool the target is read with. */
  tool: string;
  /** The path the tool reads, relative to the agent workspace. */
  path: string;
}

export interface OpenClawGatewayTransportOptions {
  /** The gateway's base URL, on loopback: http://127.0.0.1:<port> or http://[::1]:<port>. */
  url: string;
  /** The gateway's shared token. */
  token: string;
  /** The OpenClaw version the deployment pins; forwarded records carry it. */
  version: string;
  /** targetId -> what to read. */
  targets: Record<string, GatewayTarget>;
  /** Per-call timeout; the broker's own deadline also applies. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export const OPENCLAW_GATEWAY_TRANSPORT = 'openclaw-gateway';

const STATUS_CODE: Record<number, string> = {
  400: 'ERR_OPENCLAW_BAD_REQUEST',
  401: 'ERR_OPENCLAW_UNAUTHORIZED',
  403: 'ERR_OPENCLAW_POLICY',
  404: 'ERR_OPENCLAW_TOOL_NOT_AVAILABLE',
  405: 'ERR_OPENCLAW_METHOD_NOT_ALLOWED',
  408: 'ERR_OPENCLAW_TIMEOUT',
  413: 'ERR_OPENCLAW_PAYLOAD_TOO_LARGE',
  429: 'ERR_OPENCLAW_RATE_LIMITED',
  500: 'ERR_OPENCLAW_TOOL_FAILED'
};

const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const TARGET_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** A loopback http URL, or a throw: the gateway is never reached off this host. */
function loopbackUrl(raw: string): string {
  const u = new URL(raw);
  if (u.protocol !== 'http:') throw new Error(`the OpenClaw gateway URL is http on loopback, not ${u.protocol}`);
  if (u.hostname !== '127.0.0.1' && u.hostname !== '[::1]') {
    throw new Error(`the OpenClaw gateway URL names ${u.hostname}; only 127.0.0.1 or [::1] is accepted`);
  }
  if (u.pathname !== '/' || u.search || u.hash || u.username || u.password) throw new Error('the OpenClaw gateway URL is scheme, host and port only');
  return `${u.protocol}//${u.host}`;
}

function refuse(code: string, message: string): AdapterResponse {
  return { ok: false, forwarded: false, error: { code, message } };
}

export class OpenClawGatewayTransport implements OpenClawTransport {
  readonly name = OPENCLAW_GATEWAY_TRANSPORT;
  readonly version: string;
  private readonly base: string;
  private readonly f: typeof fetch;

  constructor(private readonly opts: OpenClawGatewayTransportOptions) {
    this.base = loopbackUrl(opts.url);
    if (!opts.token || /\s/.test(opts.token)) throw new Error('the OpenClaw gateway token is empty or holds whitespace');
    if (!/^\d{4}\.\d{1,2}\.\d{1,3}$/.test(opts.version)) throw new Error(`OpenClaw version ${opts.version} is not a release version`);
    for (const [id, t] of Object.entries(opts.targets)) {
      if (!TARGET_ID.test(id)) throw new Error(`target id ${JSON.stringify(id)} is not allowed`);
      if (!TOOL_NAME.test(t.tool) || typeof t.path !== 'string' || t.path === '') throw new Error(`target ${id} names no tool and path`);
    }
    this.version = opts.version;
    this.f = opts.fetchImpl ?? fetch;
  }

  /** The gateway's liveness: GET /healthz. */
  async getStatus(): Promise<AdapterResponse> {
    try {
      const r = await this.f(`${this.base}/healthz`, { signal: AbortSignal.timeout(this.opts.timeoutMs ?? 10_000) });
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return r.status === 200 && body.ok === true
        ? { ok: true, result: { status: body.status, version: this.version } }
        : { ok: false, error: { code: STATUS_CODE[r.status] ?? `ERR_OPENCLAW_HTTP_${r.status}`, message: 'the gateway is not live' } };
    } catch (err) {
      return { ok: false, error: { code: 'ERR_OPENCLAW_UNREACHABLE', message: (err as Error).message } };
    }
  }

  async readResource(op: MediatedOperation): Promise<AdapterResponse> {
    const target = this.opts.targets[op.targetId];
    if (!target || !Object.prototype.hasOwnProperty.call(this.opts.targets, op.targetId)) {
      return refuse('ERR_OPENCLAW_UNKNOWN_TARGET', `no OpenClaw target ${op.targetId} in this deployment`);
    }
    return this.invoke(target, op);
  }

  async invokeTool(op: MediatedOperation): Promise<AdapterResponse> { return this.notMapped(op); }
  async invokeNode(op: MediatedOperation): Promise<AdapterResponse> { return this.notMapped(op); }
  async writeResource(op: MediatedOperation): Promise<AdapterResponse> { return this.notMapped(op); }
  async executeRestricted(op: MediatedOperation): Promise<AdapterResponse> { return this.notMapped(op); }

  private notMapped(op: MediatedOperation): AdapterResponse {
    return refuse('ERR_OPENCLAW_NOT_MAPPED', `${op.operationClass} is not mapped to the OpenClaw gateway in this deployment`);
  }

  private async invoke(target: GatewayTarget, op: MediatedOperation): Promise<AdapterResponse> {
    let r: Response;
    try {
      r = await this.f(`${this.base}/tools/invoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.opts.token}` },
        body: JSON.stringify({ tool: target.tool, args: { path: target.path }, idempotencyKey: op.correlationId }),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 10_000)
      });
    } catch (err) {
      return { ok: false, error: { code: 'ERR_OPENCLAW_UNREACHABLE', message: (err as Error).message.slice(0, 200) } };
    }
    const body = (await r.json().catch(() => ({}))) as {
      ok?: boolean; error?: { type?: string; message?: string };
      result?: { details?: { status?: string; code?: string; error?: string; text?: string; path?: string; lines?: number } };
    };
    if (r.status !== 200) {
      return { ok: false, error: { code: STATUS_CODE[r.status] ?? `ERR_OPENCLAW_HTTP_${r.status}`, message: (body.error?.message ?? `the gateway answered ${r.status}`).slice(0, 200) } };
    }
    if (body.ok !== true) {
      return { ok: false, error: { code: 'ERR_OPENCLAW_TOOL_FAILED', message: (body.error?.message ?? 'the tool did not succeed').slice(0, 200) } };
    }
    const d = body.result?.details ?? {};
    if (d.status !== 'ok') {
      const code = d.status === 'not_found'
        ? 'ERR_OPENCLAW_NOT_FOUND'
        : /^[A-Z][A-Z0-9_]{0,63}$/.test(d.code ?? '') ? `ERR_OPENCLAW_${d.code}` : 'ERR_OPENCLAW_TOOL_ERROR';
      return { ok: false, error: { code, message: (d.error ?? `the tool answered ${String(d.status)}`).slice(0, 200) } };
    }
    return { ok: true, result: { tool: target.tool, path: d.path ?? target.path, lines: d.lines, text: d.text ?? '' } };
  }
}
