// Scheduled anchors over the Providence chain head.
//
// An anchor is written on the first record after startup, so a fresh chain is
// never unanchored, then on every interval in which the head moved, and once at
// shutdown. A failed anchor leaves the log refusing appends: a chain whose head
// cannot be signed records nothing further.

import type { ProvidenceLog } from './log.js';
import type { ProvidenceSigner } from './signer.js';

export const DEFAULT_ANCHOR_INTERVAL_SECONDS = 300;
export const MAX_ANCHOR_INTERVAL_SECONDS = 3600;

/**
 * PROVIDENCE_ANCHOR_INTERVAL_SECONDS: an integer from 1 to 3600, 300 when
 * unset. Anything else is refused, and the caller does not start.
 */
export function anchorIntervalSeconds(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_ANCHOR_INTERVAL_SECONDS;
  if (!/^[0-9]+$/.test(raw)) throw new Error(`PROVIDENCE_ANCHOR_INTERVAL_SECONDS ${JSON.stringify(raw)} is not an integer`);
  const n = Number(raw);
  if (n === 0 || n > MAX_ANCHOR_INTERVAL_SECONDS) {
    throw new Error(`PROVIDENCE_ANCHOR_INTERVAL_SECONDS ${n} is outside 1 to ${MAX_ANCHOR_INTERVAL_SECONDS}`);
  }
  return n;
}

export class AnchorScheduler {
  private timer?: NodeJS.Timeout;
  private lastAnchoredSeq = -1;
  private inFlight: Promise<void> = Promise.resolve();
  private stopped = false;

  constructor(
    private readonly log: ProvidenceLog,
    private readonly signer: ProvidenceSigner,
    private readonly intervalSeconds: number
  ) {
    anchorIntervalSeconds(String(intervalSeconds));
  }

  start(): void {
    this.log.onAppend(() => {
      if (this.log.appendedSinceStart === 1) void this.anchorNow();
    });
    this.timer = setInterval(() => void this.anchorNow(), this.intervalSeconds * 1000);
    this.timer.unref();
  }

  /** Anchor the current head if it moved since the last anchor. */
  anchorNow(): Promise<void> {
    this.inFlight = this.inFlight.then(async () => {
      if (this.log.refusal) return;
      const seq = this.log.getHead().seq;
      if (seq === this.lastAnchoredSeq) return;
      try {
        await this.log.exportAnchor(this.signer);
        this.lastAnchoredSeq = seq;
      } catch (err) {
        this.log.refuseFrom(`anchor at ${seq} failed: ${(err as Error).message}`);
      }
    });
    return this.inFlight;
  }

  /** Write a final anchor and stop. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.anchorNow();
  }
}
