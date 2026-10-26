// The OpenClaw gateway transport, from the broker's environment:
//   BROKER_OPENCLAW_GATEWAY_URL    the gateway on loopback, http://127.0.0.1:<port>
//   BROKER_OPENCLAW_TOKEN_FILE     the gateway's shared token: a regular file owned by
//                                  this user, one hard link, no group or other bits
//   BROKER_OPENCLAW_TARGETS_FILE   { "targets": { "<targetId>": { "tool", "path" } } }
//   BROKER_OPENCLAW_VERSION        the OpenClaw version the deployment pins
//   BROKER_OPENCLAW_WAIT_S         how long startup waits for the gateway to be live (120)
// Any of them missing or malformed stops startup; so does a gateway that is not live
// within the wait.

import { closeSync, fstatSync, openSync, readFileSync } from 'node:fs';
import { OpenClawGatewayTransport, type GatewayTarget } from '@xsoc/openclaw-adapter';

export const OPENCLAW_GATEWAY_URL_ENV = 'BROKER_OPENCLAW_GATEWAY_URL';

function ownerOnly(path: string, what: string): string {
  const fd = openSync(path, 'r');
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) throw new Error(`${what} ${path} is not a regular file`);
    if (st.nlink !== 1) throw new Error(`${what} ${path} has ${st.nlink} hard links; it must have one`);
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) throw new Error(`${what} ${path} is owned by uid ${st.uid}, not this user`);
    if ((st.mode & 0o077) !== 0) throw new Error(`${what} ${path} is mode ${(st.mode & 0o777).toString(8)}; it must be 600`);
    return readFileSync(fd, 'utf8');
  } finally {
    closeSync(fd);
  }
}

function need(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`${name} is not set: the OpenClaw gateway transport needs it`);
  return v;
}

export async function openClawGatewayFromEnv(env: NodeJS.ProcessEnv, opts: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void> } = {}): Promise<OpenClawGatewayTransport> {
  const token = ownerOnly(need(env, 'BROKER_OPENCLAW_TOKEN_FILE'), 'the OpenClaw gateway token file').trim();
  const doc = JSON.parse(readFileSync(need(env, 'BROKER_OPENCLAW_TARGETS_FILE'), 'utf8')) as { targets?: Record<string, GatewayTarget> };
  if (!doc.targets || typeof doc.targets !== 'object' || Object.keys(doc.targets).length === 0) {
    throw new Error('BROKER_OPENCLAW_TARGETS_FILE names no targets');
  }
  const transport = new OpenClawGatewayTransport({
    url: need(env, OPENCLAW_GATEWAY_URL_ENV), token, version: need(env, 'BROKER_OPENCLAW_VERSION'), targets: doc.targets, fetchImpl: opts.fetchImpl
  });
  const waitS = env.BROKER_OPENCLAW_WAIT_S === undefined ? 120 : Number(env.BROKER_OPENCLAW_WAIT_S);
  if (!Number.isInteger(waitS) || waitS < 0 || waitS > 600) throw new Error('BROKER_OPENCLAW_WAIT_S is 0 to 600 seconds');
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const until = Date.now() + waitS * 1000;
  for (;;) {
    const s = await transport.getStatus();
    if (s.ok) return transport;
    if (Date.now() >= until) throw new Error(`the OpenClaw gateway is not live after ${waitS} s: ${s.error?.code} ${s.error?.message ?? ''}`.trim());
    await sleep(1000);
  }
}
