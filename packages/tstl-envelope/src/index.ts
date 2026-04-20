// @xsoc/tstl-envelope
//
// Runtime continuity envelope. Every high-risk action carries one of these.
// The envelope schema is public; the sealing primitive is a black-box operation in NIE bindings.

export { buildEnvelope, validateEnvelope, incrementCounter, checkTargetBinding } from './envelope.js';
export type { EnvelopeBuildInput, EnvelopeValidationResult } from './envelope.js';
