import { readFileSync } from 'node:fs';
import type { ProvidenceEvent } from '@xsoc/shared-types';
import { hashEvent } from './log.js';

const GENESIS_HASH = '0'.repeat(64);

export interface VerificationResult {
  valid: boolean;
  totalEvents: number;
  firstInvalidIndex?: number;
  reason?: string;
  headHash: string;
}

export function verifyChain(chainPath: string): VerificationResult {
  const content = readFileSync(chainPath, 'utf8').trim();
  const lines = content ? content.split('\n') : [];
  let expectedPrev = GENESIS_HASH;
  let headHash = GENESIS_HASH;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let event: ProvidenceEvent;
    try {
      event = JSON.parse(line) as ProvidenceEvent;
    } catch {
      return { valid: false, totalEvents: i, firstInvalidIndex: i, reason: 'malformed JSON', headHash };
    }

    if (event.previousEventHash !== expectedPrev) {
      return { valid: false, totalEvents: i, firstInvalidIndex: i, reason: 'chain link mismatch', headHash };
    }

    const recomputed = hashEvent(event);
    if (recomputed !== event.eventHash) {
      return { valid: false, totalEvents: i, firstInvalidIndex: i, reason: 'event hash mismatch', headHash };
    }

    expectedPrev = event.eventHash;
    headHash = event.eventHash;
  }

  return { valid: true, totalEvents: lines.length, headHash };
}
