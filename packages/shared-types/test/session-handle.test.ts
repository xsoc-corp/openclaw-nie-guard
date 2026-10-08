import { describe, it, expect } from 'vitest';
import { TstlEnvelope } from '../src/envelope.js';
import { AdmissionResponse } from '../src/capability.js';
import { ProvidenceEvent } from '../src/providence.js';

// The session identifier is the NIE session handle: 32 bytes as 64 lowercase hex. It
// is one form everywhere it appears, so an envelope bound to a session names the same
// value the admission returned and the Providence event recorded.
const HANDLE = 'a3'.repeat(32);

const fields = {
  'TstlEnvelope.sessionId': TstlEnvelope.shape.sessionId,
  'AdmissionResponse.sessionId': AdmissionResponse.shape.sessionId,
  'ProvidenceEvent.sessionId': ProvidenceEvent.shape.sessionId
};

describe('session identifier form', () => {
  for (const [name, schema] of Object.entries(fields)) {
    it(`${name} accepts a 64 lowercase hex session handle`, () => {
      expect(schema.safeParse(HANDLE).success).toBe(true);
    });

    it(`${name} refuses a UUID, uppercase hex, and the wrong length`, () => {
      expect(schema.safeParse('00000000-0000-4000-8000-000000000001').success).toBe(false);
      expect(schema.safeParse(HANDLE.toUpperCase()).success).toBe(false);
      expect(schema.safeParse(HANDLE.slice(2)).success).toBe(false);
      expect(schema.safeParse(`${HANDLE}00`).success).toBe(false);
    });
  }

  it('ProvidenceEvent.sessionId stays optional', () => {
    expect(ProvidenceEvent.shape.sessionId.safeParse(undefined).success).toBe(true);
  });
});
