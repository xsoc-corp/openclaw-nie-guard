import { readFileSync } from 'node:fs';
import type { ProvidenceEvent } from '@xsoc/shared-types';
import { hashEvent, canonicalAnchor } from './log.js';
import type { ProvidenceSigner } from './signer.js';
import type { SignedAnchor } from '@xsoc/shared-types';

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


export interface AnchorVerificationResult {
  valid: boolean;
  reason?: string;
  algorithm?: string;
}

// Verifies a signed anchor against a chain file. Fail-closed: any mismatch, bad
// signature, or mock-signed anchor returns valid:false with a reason. A caller
// must not treat a mock-unsigned anchor as evidence of anything.
export async function verifyAnchor(
  chainPath: string,
  anchor: SignedAnchor,
  signer: ProvidenceSigner
): Promise<AnchorVerificationResult> {
  if (anchor.algorithm === 'mock-unsigned') {
    return { valid: false, reason: 'anchor produced by non-cryptographic mock signer', algorithm: anchor.algorithm };
  }
  if (anchor.algorithm !== signer.algorithm) {
    return { valid: false, reason: `algorithm mismatch: anchor ${anchor.algorithm}, signer ${signer.algorithm}`, algorithm: anchor.algorithm };
  }

  const { signature, ...unsigned } = anchor;
  const sigOk = await signer.verify(canonicalAnchor(unsigned), signature);
  if (!sigOk) {
    return { valid: false, reason: 'signature verification failed', algorithm: anchor.algorithm };
  }

  const chain = verifyChain(chainPath);
  if (!chain.valid) {
    return { valid: false, reason: `chain invalid: ${chain.reason}`, algorithm: anchor.algorithm };
  }
  if (chain.headHash !== anchor.headHash) {
    return { valid: false, reason: 'anchor head does not match chain head', algorithm: anchor.algorithm };
  }
  if (chain.totalEvents !== anchor.eventCount) {
    return { valid: false, reason: `event count mismatch: chain ${chain.totalEvents}, anchor ${anchor.eventCount}`, algorithm: anchor.algorithm };
  }

  return { valid: true, algorithm: anchor.algorithm };
}