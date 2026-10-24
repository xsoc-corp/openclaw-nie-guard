// The broker process, stopped by a signal, closes the server and writes the shutdown
// anchor over its head, so the records written since the last scheduled anchor are
// anchored too. Runs the real entry point in a child process.

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('broker process shutdown', () => {
  it('SIGTERM closes the broker and anchors the head', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'broker-shutdown-'));
    const token = 'shutdown-operator';
    const child = spawn(process.execPath, ['--import', 'tsx', resolve(__dirname, '../src/index.ts')], {
      cwd: resolve(__dirname, '..'),
      env: {
        ...process.env,
        BROKER_HOST: '127.0.0.1', BROKER_PORT: '0', LOG_LEVEL: 'info',
        PROVIDENCE_DATA_DIR: dataDir, PROVIDENCE_CHAIN_FILE: join(dataDir, 'chain.jsonl'),
        PROVIDENCE_CHAIN_ID: 'aida-guard/broker-shutdown-test',
        PROVIDENCE_MLDSA65_SEED_B64: randomBytes(32).toString('base64'),
        BROKER_OPERATOR_TOKEN_SHA256: createHash('sha256').update(token).digest('hex'),
        BROKER_SCAFFOLDING_TRANSPORT: '1', XSOC_FHE_MODE: 'off', NIE_BINDINGS_MODE: 'mock'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const url = await new Promise<string>((ok, fail) => {
      const t = setTimeout(() => fail(new Error('the broker did not start:\n' + out)), 20_000);
      const check = setInterval(() => {
        const m = out.match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/);
        if (m) { clearTimeout(t); clearInterval(check); ok(m[1]!); }
      }, 50);
    });
    // One record, written after the scheduler's first anchor point.
    await fetch(url + '/v1/invoke', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: '{}' });
    await fetch(url + '/v1/invoke', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: '{}' });
    const exited = new Promise<number | null>((ok) => child.on('exit', (code) => ok(code)));
    child.kill('SIGTERM');
    expect(await exited).toBe(0);
    const head = JSON.parse(readFileSync(join(dataDir, 'head-v3.json'), 'utf8'));
    expect(head.seq).toBe(2);
    const anchors = readdirSync(join(dataDir, 'anchors')).sort();
    const last = JSON.parse(readFileSync(join(dataDir, 'anchors', anchors[anchors.length - 1]!), 'utf8'));
    expect(last.head_seq).toBe(head.seq);
    expect(last.head_digest).toBe(head.head_digest);
  }, 40_000);
});
