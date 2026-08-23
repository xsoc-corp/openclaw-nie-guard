import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProvidenceEvent, ProvidenceEventType, SignedAnchor } from '@xsoc/shared-types';
import type { ProvidenceSigner } from './signer.js';

const GENESIS_HASH = '0'.repeat(64);

export interface LogAppendInput {
  eventType: ProvidenceEventType;
  correlationId: string;
  sessionId?: string;
  subjectId?: string;
  deviceFingerprint?: string;
  operationClass?: string;
  targetHash?: string;
  classification?: string;
  reasonCode?: string;
  metadata?: Record<string, unknown>;
}

export class ProvidenceLog {
  private headHash: string = GENESIS_HASH;
  private eventCount = 0;
  private readonly chainPath: string;

  constructor(chainPath: string) {
    this.chainPath = chainPath;
    this.loadHead();
  }

  append(input: LogAppendInput): ProvidenceEvent {
    const event: ProvidenceEvent = {
      eventId: randomUUID(),
      eventType: input.eventType,
      correlationId: input.correlationId,
      sessionId: input.sessionId,
      subjectId: input.subjectId,
      deviceFingerprint: input.deviceFingerprint,
      operationClass: input.operationClass,
      targetHash: input.targetHash,
      classification: input.classification,
      reasonCode: input.reasonCode,
      timestamp: Date.now(),
      previousEventHash: this.headHash,
      eventHash: '',
      metadata: input.metadata
    };
    event.eventHash = hashEvent(event);
    this.persist(event);
    this.headHash = event.eventHash;
    this.eventCount++;
    return event;
  }

  getHead(): string {
    return this.headHash;
  }

  // Produces a signed anchor over the current chain head. The hash chain gives
  // tamper evidence between anchors; the signature gives non-repudiation of the
  // chain state at this point. Canonical form is signed, not the JSON object, so
  // key ordering cannot change what was signed.
  async exportAnchor(signer: ProvidenceSigner): Promise<SignedAnchor> {
    const anchor = {
      anchorId: randomUUID(),
      headHash: this.headHash,
      eventCount: this.eventCount,
      timestamp: Date.now(),
      algorithm: signer.algorithm,
      keyId: signer.keyId
    };
    const signature = await signer.sign(canonicalAnchor(anchor));
    return { ...anchor, signature };
  }

  private persist(event: ProvidenceEvent): void {
    if (!existsSync(dirname(this.chainPath))) {
      mkdirSync(dirname(this.chainPath), { recursive: true });
    }
    appendFileSync(this.chainPath, JSON.stringify(event) + '\n');
  }

  private loadHead(): void {
    if (!existsSync(this.chainPath)) return;
    const content = readFileSync(this.chainPath, 'utf8').trim();
    if (!content) return;
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return;
    try {
      const lastEvent: ProvidenceEvent = JSON.parse(lastLine);
      // Restore the count too, or a restarted process would anchor claiming zero events
      // and every anchor it produced would fail verifyAnchor's count check.
      this.eventCount = lines.length;
      this.headHash = lastEvent.eventHash;
    } catch {
      // Corrupt tail; start fresh at genesis for new writes but preserve existing file for forensics.
      this.headHash = GENESIS_HASH;
    }
  }
}

export function hashEvent(event: ProvidenceEvent): string {
  const { eventHash: _ignored, ...rest } = event;
  const canonical = JSON.stringify(rest, Object.keys(rest).sort());
  return createHash('sha256').update(canonical).digest('hex');
}


// Canonical serialization for anchor signing. Keys sorted so the signed bytes are
// independent of object construction order.
export function canonicalAnchor(anchor: Omit<SignedAnchor, 'signature'>): string {
  return JSON.stringify(anchor, Object.keys(anchor).sort());
}