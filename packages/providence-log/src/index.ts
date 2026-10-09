// @xsoc/providence-log
//
// The AIDA-Guard Providence chain, record encoding v3 (docs/providence-record-v3.md):
// an append-only chain of records, each carrying its predecessor's content digest,
// a durable head committed to under a deployment-scoped chain id, and signed
// anchors over that commitment. The offline verifier is `xsoc-audit-verify
// --chain guard`.

export {
  ProvidenceLog,
  ProvidenceUnavailable,
  CHAIN_FILE,
  HEAD_FILE,
  ANCHOR_DIR
} from './log.js';
export type { GuardHead, ProvidenceLogOptions, AppendedRecord } from './log.js';
export {
  RECORD_DOMAIN,
  HEAD_DOMAIN,
  ANCHOR_DOMAIN,
  GUARD_KIND,
  GENESIS_DIGEST,
  EncodingError,
  jcs,
  recordDigest,
  recordLine,
  headCommitment,
  anchorMessage,
  keyIdOf,
  checkpointGenesisNonce
} from './encoding.js';
export { signerSelfTest, SignerSelfTestFailed } from './signer.js';
export type { ProvidenceSigner } from './signer.js';
export { AnchorScheduler, anchorIntervalSeconds } from './scheduler.js';
