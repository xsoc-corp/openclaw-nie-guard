// @xsoc/nie-bindings
//
// Stable TypeScript interface to NIE cryptographic primitives. This package
// ships the mock implementation in the public repo. The production implementation
// lives in @xsoc/nie-bindings-prod (private repo) and is substituted via pnpm
// workspace override in the private deployment repo.
//
// The six interface functions below constitute the full public contract.
// The cryptographic construction of DSKAG, TSTL sealing, and signature primitives
// is black box by design and is referenced by stated security properties only.
// See docs/disclosure-policy.md.

export type { NieBindings } from './interface.js';
export { createMockBindings } from './mock.js';
export { loadBindings } from './loader.js';
