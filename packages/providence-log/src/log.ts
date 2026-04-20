import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProvidenceEvent, ProvidenceEventType } from '@xsoc/shared-types';

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
    return event;
  }

  getHead(): string {
    return this.headHash;
  }

  // TODO(xsoc-openclaw-poc): external anchor output (e.g., to a tamper-evident external store).
  exportAnchor(): { headHash: string; timestamp: number } {
    return { headHash: this.headHash, timestamp: Date.now() };
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
