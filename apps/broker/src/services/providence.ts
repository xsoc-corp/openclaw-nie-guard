import { createHash } from 'node:crypto';
import { jcs, type ProvidenceLog } from '@xsoc/providence-log';
import type { ProvidenceAppendInput } from '@xsoc/shared-types';

/**
 * What a broker route records. The device field takes whatever identifier the
 * bindings report for the device; see BrokerProvidence.append.
 */
export type BrokerAppendInput = Omit<ProvidenceAppendInput, 'deviceFingerprint'> & {
  deviceFingerprint?: string;
};

export interface BrokerRecordRef {
  /** The record's digest, lowercase hex: its identifier on the chain. */
  eventId: string;
  seq: number;
}

const DEVICE_FINGERPRINT = /^[0-9a-f]{64}$/;

/**
 * The broker's side of the Providence chain. Routes record decisions through
 * here; a record that cannot be made durable throws, and the route's action is
 * denied with it.
 */
export class BrokerProvidence {
  constructor(readonly log: ProvidenceLog) {}

  /**
   * A record's device_fingerprint is the NIE device fingerprint, 64 lowercase
   * hex. When the bindings report another kind of device identifier, the record
   * carries it as metadata device_label, inside the digest, and leaves the
   * fingerprint empty rather than calling a label a fingerprint.
   */
  append(input: BrokerAppendInput): BrokerRecordRef {
    const { deviceFingerprint, metadata, ...rest } = input;
    let fingerprint: string | undefined;
    let meta = metadata;
    if (deviceFingerprint !== undefined && deviceFingerprint !== '') {
      if (DEVICE_FINGERPRINT.test(deviceFingerprint)) fingerprint = deviceFingerprint;
      else meta = { ...(meta ?? {}), device_label: deviceFingerprint };
    }
    const r = this.log.append({ ...rest, deviceFingerprint: fingerprint, metadata: meta });
    return { eventId: r.digest, seq: r.record.seq };
  }
}

/** SHA-256 of a continuity envelope's canonical readable copy. */
export function envelopeDigest(envelope: unknown): string {
  return createHash('sha256').update(jcs(envelope), 'utf8').digest('hex');
}
