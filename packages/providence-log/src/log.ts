// The AIDA-Guard Providence chain writer, encoding v3 (docs/providence-record-v3.md).
//
// A chain directory holds:
//   chain-v3.jsonl   one record per line, exactly the hashed fields
//   head-v3.json     { chain_id, seq, head_digest }: the commitment input
//   anchors/         signed anchors over head commitments
//
// Durability. A record is appended and fsynced before the head advances. The head
// is written to a temporary file, fsynced, and renamed over the old one, and only
// if the head on disk is still the one this writer last wrote. At startup the
// writer recomputes the last record's digest against the head. Any failure to
// establish or keep that agreement leaves the log refusing every append, and a
// refused append throws, so the action it would have recorded is denied.

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeSync
} from 'node:fs';
import { join } from 'node:path';
import {
  ProvidenceAppendInput,
  ProvidenceRecord,
  type ProvidenceAnchor
} from '@xsoc/shared-types';
import {
  GENESIS_DIGEST,
  RECORD_DOMAIN,
  GUARD_KIND,
  anchorMessage,
  headCommitment,
  recordDigest,
  recordLine
} from './encoding.js';
import type { ProvidenceSigner } from './signer.js';

export const CHAIN_FILE = 'chain-v3.jsonl';
export const HEAD_FILE = 'head-v3.json';
export const ANCHOR_DIR = 'anchors';

export interface GuardHead {
  chain_id: string;
  seq: number;
  head_digest: string;
}

export interface ProvidenceLogOptions {
  /** The chain directory. */
  dir: string;
  /** `aida-guard/<deployment-id>`. */
  chainId: string;
  /**
   * A chain file in the earlier format. When the v3 chain is created, its first
   * record's metadata carries that file's final head as `legacy_chain_head`, as a
   * reference only.
   */
  legacyChainFile?: string;
  /** The clock records are stamped with. */
  now?: () => number;
}

export class ProvidenceUnavailable extends Error {
  constructor(reason: string) {
    super(`Providence log refuses appends: ${reason}`);
    this.name = 'ProvidenceUnavailable';
  }
}

export interface AppendedRecord {
  record: ProvidenceRecord;
  /** The record's digest, lowercase hex: its identifier. */
  digest: string;
}

const CHAIN_ID = /^aida-guard\/[^\s]+$/;

export class ProvidenceLog {
  readonly dir: string;
  readonly chainId: string;
  private readonly now: () => number;
  private readonly legacyHead?: string;
  private head: GuardHead;
  private failure?: string;
  private recordsSinceStart = 0;
  private readonly listeners: Array<(r: AppendedRecord) => void> = [];

  constructor(opts: ProvidenceLogOptions) {
    if (!CHAIN_ID.test(opts.chainId)) {
      throw new Error(`chain id ${JSON.stringify(opts.chainId)} is not aida-guard/<deployment-id>`);
    }
    this.dir = opts.dir;
    this.chainId = opts.chainId;
    this.now = opts.now ?? Date.now;
    mkdirSync(this.dir, { recursive: true });
    mkdirSync(join(this.dir, ANCHOR_DIR), { recursive: true });
    this.head = { chain_id: this.chainId, seq: 0, head_digest: GENESIS_DIGEST.toString('hex') };
    try {
      this.head = this.openHead();
    } catch (err) {
      this.failure = (err as Error).message;
    }
    if (!this.failure && this.head.seq === 0 && opts.legacyChainFile) {
      this.legacyHead = readLegacyHead(opts.legacyChainFile);
    }
  }

  /** Why the log refuses appends, or undefined when it accepts them. */
  get refusal(): string | undefined {
    return this.failure;
  }

  getHead(): GuardHead {
    return { ...this.head };
  }

  /** Records appended by this process. The scheduler anchors on the first. */
  get appendedSinceStart(): number {
    return this.recordsSinceStart;
  }

  /** Called after each durable append. */
  onAppend(listener: (r: AppendedRecord) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Stop accepting appends. Used when a duty the chain depends on, such as
   * writing an anchor, cannot be met: the log then refuses rather than
   * recording decisions it cannot vouch for.
   */
  refuseFrom(reason: string): void {
    this.failure ??= reason;
  }

  /**
   * Append one record. Throws ProvidenceUnavailable when the log refuses, and on
   * any failure to make the record durable; either way the caller's action is
   * denied, because a decision that cannot be recorded does not proceed.
   */
  append(input: ProvidenceAppendInput): AppendedRecord {
    if (this.failure) throw new ProvidenceUnavailable(this.failure);
    const parsed = ProvidenceAppendInput.parse(input);
    let metadata = parsed.metadata ? (dropUndefined(parsed.metadata) as Record<string, unknown>) : null;
    if (this.head.seq === 0 && this.legacyHead) {
      metadata = { ...(metadata ?? {}), legacy_chain_head: this.legacyHead };
    }
    const record: ProvidenceRecord = ProvidenceRecord.parse({
      domain: RECORD_DOMAIN,
      kind: GUARD_KIND,
      seq: this.head.seq,
      timestamp_ms: this.now(),
      event_type: parsed.eventType,
      correlation_id: parsed.correlationId ?? '',
      device_fingerprint: parsed.deviceFingerprint ?? '',
      session_handle: parsed.sessionId ?? '',
      payload_digest: parsed.payloadDigest ?? '',
      subject_id: parsed.subjectId ?? '',
      operation_class: parsed.operationClass ?? '',
      target_hash: parsed.targetHash ?? '',
      classification: parsed.classification ?? '',
      reason_code: parsed.reasonCode ?? '',
      payload: parsed.payload ? (dropUndefined(parsed.payload) as ProvidenceRecord['payload']) : null,
      metadata,
      prev_digest: this.head.head_digest
    });
    const digest = recordDigest(record);
    const line = recordLine(record) + '\n';

    try {
      appendDurably(join(this.dir, CHAIN_FILE), line);
    } catch (err) {
      this.failure = `append failed: ${(err as Error).message}`;
      throw new ProvidenceUnavailable(this.failure);
    }
    const next: GuardHead = { chain_id: this.chainId, seq: record.seq + 1, head_digest: digest.toString('hex') };
    try {
      this.replaceHead(this.head, next);
    } catch (err) {
      // The record is on disk and the head is behind it. The startup check
      // refuses that state, and this process refuses from here on.
      this.failure = `head did not advance: ${(err as Error).message}`;
      throw new ProvidenceUnavailable(this.failure);
    }
    this.head = next;
    this.recordsSinceStart++;
    const appended = { record, digest: digest.toString('hex') };
    for (const l of this.listeners) l(appended);
    return appended;
  }

  /**
   * Sign an anchor over the current head and write it under anchors/. The
   * anchor is written durably; its file name orders anchors by position.
   */
  async exportAnchor(signer: ProvidenceSigner): Promise<ProvidenceAnchor> {
    if (this.failure) throw new ProvidenceUnavailable(this.failure);
    const head = this.getHead();
    const commitment = headCommitment(head.seq, Buffer.from(head.head_digest, 'hex'), head.chain_id);
    const timestamp = this.now();
    const message = anchorMessage(commitment, timestamp, signer.algorithm, signer.keyId, signer.publicKey);
    const signature = await signer.sign(message);
    const anchor: ProvidenceAnchor = {
      chain_id: head.chain_id,
      head_seq: head.seq,
      head_digest: head.head_digest,
      commitment: commitment.toString('hex'),
      timestamp_ms: timestamp,
      algorithm: signer.algorithm,
      key_id: signer.keyId,
      public_key: Buffer.from(signer.publicKey).toString('base64'),
      signature: Buffer.from(signature).toString('base64')
    };
    const name = `${String(head.seq).padStart(12, '0')}-${timestamp}.json`;
    writeDurably(join(this.dir, ANCHOR_DIR, name), JSON.stringify(anchor) + '\n');
    return anchor;
  }

  /** Anchors written so far, in position order. */
  anchorFiles(): string[] {
    return readdirSync(join(this.dir, ANCHOR_DIR)).filter((f) => f.endsWith('.json')).sort();
  }

  // -------------------------------------------------------------------------

  private openHead(): GuardHead {
    const headPath = join(this.dir, HEAD_FILE);
    const chainPath = join(this.dir, CHAIN_FILE);
    if (!existsSync(headPath)) {
      if (existsSync(chainPath) && readFileSync(chainPath).length > 0) {
        throw new Error(`${CHAIN_FILE} holds records and ${HEAD_FILE} is missing`);
      }
      const fresh: GuardHead = { chain_id: this.chainId, seq: 0, head_digest: GENESIS_DIGEST.toString('hex') };
      writeDurably(headPath, JSON.stringify(fresh) + '\n');
      return fresh;
    }
    const head = parseHead(readFileSync(headPath, 'utf8'));
    if (head.chain_id !== this.chainId) {
      throw new Error(`the chain on disk is ${head.chain_id}, not ${this.chainId}`);
    }
    // The last record's own digest must be the head.
    const last = lastRecord(chainPath);
    if (head.seq === 0) {
      if (last) throw new Error('the head is at genesis and the chain holds records');
      if (head.head_digest !== GENESIS_DIGEST.toString('hex')) throw new Error('an empty head names a digest');
      return head;
    }
    if (!last) throw new Error(`the head is at ${head.seq} and the chain holds no records`);
    const record = ProvidenceRecord.parse(JSON.parse(last));
    if (record.seq !== head.seq - 1) {
      throw new Error(`the last record is at ${record.seq} and the head names ${head.seq}`);
    }
    const digest = recordDigest(record).toString('hex');
    if (digest !== head.head_digest) {
      throw new Error(`the last record computes to ${digest} and the head holds ${head.head_digest}`);
    }
    return head;
  }

  private replaceHead(expected: GuardHead, next: GuardHead): void {
    const headPath = join(this.dir, HEAD_FILE);
    // Conditional: the rename happens only if the head on disk is still the
    // one this writer expects.
    const onDisk = parseHead(readFileSync(headPath, 'utf8'));
    if (onDisk.seq !== expected.seq || onDisk.head_digest !== expected.head_digest || onDisk.chain_id !== expected.chain_id) {
      throw new Error('the head on disk is not the one this writer last wrote');
    }
    const tmp = `${headPath}.tmp`;
    writeDurably(tmp, JSON.stringify(next) + '\n');
    renameSync(tmp, headPath);
    fsyncDir(this.dir);
  }
}

/**
 * Drop object members whose value is undefined, as JSON serialization does, so a
 * caller's optional fields neither reach the digest nor fail its encoding. Every
 * other value is kept as it is, for the canonical encoding to accept or refuse.
 */
function dropUndefined(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(dropUndefined);
  if (v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x !== undefined) out[k] = dropUndefined(x);
    }
    return out;
  }
  return v;
}

function parseHead(text: string): GuardHead {
  const v = JSON.parse(text) as Record<string, unknown>;
  const keys = Object.keys(v).sort().join(',');
  if (keys !== 'chain_id,head_digest,seq') throw new Error(`${HEAD_FILE} has fields ${keys}`);
  if (typeof v.chain_id !== 'string' || !CHAIN_ID.test(v.chain_id)) throw new Error('head chain_id is malformed');
  if (!Number.isSafeInteger(v.seq) || (v.seq as number) < 0) throw new Error('head seq is malformed');
  if (typeof v.head_digest !== 'string' || !/^[0-9a-f]{64}$/.test(v.head_digest)) throw new Error('head digest is malformed');
  return { chain_id: v.chain_id, seq: v.seq as number, head_digest: v.head_digest };
}

function lastRecord(chainPath: string): string | undefined {
  if (!existsSync(chainPath)) return undefined;
  const text = readFileSync(chainPath, 'utf8');
  if (text.length === 0) return undefined;
  if (!text.endsWith('\n')) throw new Error(`${CHAIN_FILE} ends in a partial line`);
  const lines = text.slice(0, -1).split('\n');
  return lines[lines.length - 1];
}

function readLegacyHead(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const text = readFileSync(path, 'utf8').trim();
  if (!text) return undefined;
  const lines = text.split('\n');
  const last = JSON.parse(lines[lines.length - 1]!) as { eventHash?: unknown };
  return typeof last.eventHash === 'string' ? last.eventHash : undefined;
}

function appendDurably(path: string, data: string): void {
  const fd = openSync(path, 'a');
  try {
    writeSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeDurably(path: string, data: string): void {
  const fd = openSync(path, 'w');
  try {
    writeSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function fsyncDir(dir: string): void {
  const fd = openSync(dir, 'r');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
