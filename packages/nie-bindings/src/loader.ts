import type { NieBindings } from './interface.js';
import { createMockBindings } from './mock.js';

// Binding loader. Detects runtime mode via env NIE_BINDINGS_MODE.
// Public repo always resolves to mock for the 'mock' mode. For 'wasm' | 'ffi' | 'prod',
// this function must be satisfied by a real binding, whether that arrives via a pnpm
// workspace override that replaces this entire package, or by the production deployment
// repo providing its own loader. It must never silently fall back to mock: a deployment
// that fails to wire the override would otherwise run attested-looking traffic through
// fake attestation with no operator-visible failure.
export async function loadBindings(): Promise<NieBindings> {
  const mode = (process.env.NIE_BINDINGS_MODE ?? 'mock').toLowerCase();

  switch (mode) {
    case 'mock':
      return createMockBindings();
    case 'wasm':
    case 'ffi':
    case 'prod':
      throw new Error(
        `[nie-bindings] mode=${mode} requested but this is the public mock package. ` +
        `A real binding must be supplied via pnpm workspace override ` +
        `(see @xsoc/nie-bindings-prod) before requesting a non-mock mode. Refusing to ` +
        `silently substitute mock attestation for a production mode.`
      );
    default:
      throw new Error(`[nie-bindings] unknown mode: ${mode}`);
  }
}
