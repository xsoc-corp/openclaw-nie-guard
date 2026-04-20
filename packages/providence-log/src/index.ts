// @xsoc/providence-log
//
// Append-only hash-chained audit log. Every security-relevant decision is logged.
// The chain supports external anchor for tamper evidence. Each event contains
// previousEventHash forming a linked chain; truncation is detectable via anchor.

export { ProvidenceLog } from './log.js';
export { verifyChain } from './verifier.js';
export type { LogAppendInput } from './log.js';
