// @xsoc/openclaw-adapter
//
// Single narrow interface to OpenClaw. All traffic to OpenClaw passes through this module.
// Client-supplied auth headers are stripped before forwarding. Only broker-mediated credentials
// are injected. Operation allowlist and default-deny categories are enforced here in addition
// to the broker, providing defense in depth.

export { OpenClawAdapter } from './adapter.js';
export type { MediatedOperation, AdapterResponse } from './types.js';
