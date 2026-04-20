import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProvidenceLog } from '../src/log.js';
import { verifyChain } from '../src/verifier.js';

describe('Providence log', () => {
  let dir: string;
  let chainPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'providence-'));
    chainPath = join(dir, 'chain.jsonl');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('chains events with correct previous-hash linkage', () => {
    const log = new ProvidenceLog(chainPath);
    const a = log.append({ eventType: 'admit', correlationId: '00000000-0000-4000-8000-000000000001' });
    const b = log.append({ eventType: 'invoke', correlationId: '00000000-0000-4000-8000-000000000002' });
    expect(b.previousEventHash).toBe(a.eventHash);
    expect(b.eventHash).not.toBe(a.eventHash);
  });

  it('verifies an intact chain', () => {
    const log = new ProvidenceLog(chainPath);
    log.append({ eventType: 'admit', correlationId: '00000000-0000-4000-8000-000000000001' });
    log.append({ eventType: 'invoke', correlationId: '00000000-0000-4000-8000-000000000002' });
    log.append({ eventType: 'revoke', correlationId: '00000000-0000-4000-8000-000000000003' });
    const result = verifyChain(chainPath);
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(3);
  });

  it('detects a tampered chain event', () => {
    const log = new ProvidenceLog(chainPath);
    log.append({ eventType: 'admit', correlationId: '00000000-0000-4000-8000-000000000001' });
    log.append({ eventType: 'invoke', correlationId: '00000000-0000-4000-8000-000000000002' });
    // Tamper: rewrite the file with a modified metadata field that invalidates the hash.
    const raw = readFileSync(chainPath, 'utf8');
    const lines = raw.trim().split('\n');
    const first = JSON.parse(lines[0]!);
    first.reasonCode = 'INJECTED';
    lines[0] = JSON.stringify(first);
    writeFileSync(chainPath, lines.join('\n') + '\n');
    const result = verifyChain(chainPath);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(0);
  });
});
