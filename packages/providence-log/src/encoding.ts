// The AIDA-Guard Providence chain, record encoding v3: the writer's
// implementation of docs/providence-record-v3.md. The Rust verifier and the
// Python vector generator are the other two, and test/vectors/
// guard-providence-v3.json holds all three to the same bytes.

import { createHash } from 'node:crypto';
import type { ProvidenceRecord } from '@xsoc/shared-types';

export const RECORD_DOMAIN = 'xsoc-aida-guard:providence-record:v3';
export const HEAD_DOMAIN = 'xsoc-aida-guard:providence-head:v1';
export const ANCHOR_DOMAIN = 'xsoc-aida-guard:providence-anchor:v1';
export const GUARD_KIND = 0x0002;
export const GENESIS_DIGEST = Buffer.alloc(32);

const STRING_FIELDS = [
  'event_type',
  'correlation_id',
  'device_fingerprint',
  'session_handle',
  'payload_digest',
  'subject_id',
  'operation_class',
  'target_hash',
  'classification',
  'reason_code'
] as const;

export class EncodingError extends Error {
  constructor(message: string) {
    super(`providence encoding: ${message}`);
    this.name = 'EncodingError';
  }
}

function lp(h: ReturnType<typeof createHash>, bytes: Uint8Array): void {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(bytes.length);
  h.update(len);
  h.update(bytes);
}

function u64(n: number): Buffer {
  if (!Number.isSafeInteger(n) || n < 0) throw new EncodingError(`not a u64 within 2^53: ${n}`);
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(n));
  return b;
}

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function wellFormed(s: string): boolean {
  return !LONE_SURROGATE.test(s);
}

function jcsString(s: string): string {
  if (!wellFormed(s)) throw new EncodingError('a string is not well-formed Unicode');
  // JSON.stringify writes strings exactly as RFC 8785 requires.
  return JSON.stringify(s);
}

/**
 * RFC 8785 canonical JSON, restricted per the spec's section 3: integers within
 * 2^53 only, no undefined, members sorted by UTF-16 code units.
 */
export function jcs(v: unknown): string {
  if (v === null) return 'null';
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new EncodingError(`number ${v} is not an integer within 2^53`);
    return Object.is(v, -0) ? '0' : String(v);
  }
  if (typeof v === 'string') return jcsString(v);
  if (Array.isArray(v)) return `[${v.map(jcs).join(',')}]`;
  if (typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new EncodingError('only plain objects encode');
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (obj[k] === undefined) throw new EncodingError(`member ${k} is undefined`);
    }
    // The default sort compares strings by UTF-16 code units, as RFC 8785 does.
    keys.sort();
    return `{${keys.map((k) => `${jcsString(k)}:${jcs(obj[k])}`).join(',')}}`;
  }
  throw new EncodingError(`a ${typeof v} has no canonical form`);
}

function blob(v: unknown): Buffer {
  return v === null ? Buffer.alloc(0) : Buffer.from(jcs(v), 'utf8');
}

function hex32(s: string, name: string): Buffer {
  if (!/^[0-9a-f]{64}$/.test(s)) throw new EncodingError(`${name} is not 64 lowercase hex`);
  return Buffer.from(s, 'hex');
}

/** The record's digest, from its own fields. */
export function recordDigest(r: ProvidenceRecord, domain: string = RECORD_DOMAIN): Buffer {
  const h = createHash('sha256');
  lp(h, Buffer.from(domain, 'utf8'));
  const kind = Buffer.alloc(2);
  kind.writeUInt16BE(GUARD_KIND);
  h.update(kind);
  h.update(u64(r.seq));
  h.update(u64(r.timestamp_ms));
  for (const f of STRING_FIELDS) {
    const s = r[f];
    if (!wellFormed(s)) throw new EncodingError(`${f} is not well-formed Unicode`);
    lp(h, Buffer.from(s, 'utf8'));
  }
  lp(h, blob(r.payload));
  lp(h, blob(r.metadata));
  h.update(hex32(r.prev_digest, 'prev_digest'));
  return h.digest();
}

export function headCommitment(seq: number, headDigest: Uint8Array, chainId: string): Buffer {
  if (headDigest.length !== 32) throw new EncodingError('a head digest is 32 bytes');
  const h = createHash('sha256');
  lp(h, Buffer.from(HEAD_DOMAIN, 'utf8'));
  h.update(u64(seq));
  h.update(headDigest);
  lp(h, Buffer.from(chainId, 'utf8'));
  return h.digest();
}

export function anchorMessage(
  commitment: Uint8Array,
  timestampMs: number,
  algorithm: string,
  keyId: string,
  publicKey: Uint8Array
): Buffer {
  if (commitment.length !== 32) throw new EncodingError('a commitment is 32 bytes');
  const h = createHash('sha256');
  lp(h, Buffer.from(ANCHOR_DOMAIN, 'utf8'));
  h.update(commitment);
  h.update(u64(timestampMs));
  lp(h, Buffer.from(algorithm, 'utf8'));
  lp(h, Buffer.from(keyId, 'utf8'));
  lp(h, publicKey);
  return h.digest();
}

/** First 16 lowercase hex of SHA-256(public key). */
export function keyIdOf(publicKey: Uint8Array): string {
  return createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
}

export function checkpointGenesisNonce(): Buffer {
  return createHash('sha256').update(`${ANCHOR_DOMAIN}|genesis`, 'utf8').digest();
}

/**
 * The record as its line carries it: the hashed fields in the spec's order and
 * nothing else.
 */
export function recordLine(r: ProvidenceRecord): string {
  const ordered: ProvidenceRecord = {
    domain: r.domain,
    kind: r.kind,
    seq: r.seq,
    timestamp_ms: r.timestamp_ms,
    event_type: r.event_type,
    correlation_id: r.correlation_id,
    device_fingerprint: r.device_fingerprint,
    session_handle: r.session_handle,
    payload_digest: r.payload_digest,
    subject_id: r.subject_id,
    operation_class: r.operation_class,
    target_hash: r.target_hash,
    classification: r.classification,
    reason_code: r.reason_code,
    payload: r.payload,
    metadata: r.metadata,
    prev_digest: r.prev_digest
  };
  // Encoding the blobs here refuses anything the digest could not encode.
  blob(ordered.payload);
  blob(ordered.metadata);
  return JSON.stringify(ordered);
}
