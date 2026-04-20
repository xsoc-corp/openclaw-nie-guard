import type { NieBindings } from './interface.js';
import { createMockBindings } from './mock.js';

// Binding loader. Detects runtime mode via env NIE_BINDINGS_MODE.
// Public repo always resolves to mock. Production deployment repo overrides this package
// via pnpm workspace override to load @xsoc/nie-bindings-prod instead.
export async function loadBindings(): Promise<NieBindings> {
  const mode = (process.env.NIE_BINDINGS_MODE ?? 'mock').toLowerCase();

  switch (mode) {
    case 'mock':
      return createMockBindings();
    case 'wasm':
    case 'ffi':
    case 'prod':
      // TODO(xsoc-openclaw-poc): these paths resolve in the private deployment repo.
      // In the public repo we fall back to mock with a warning so tests still pass.
      console.warn(`[nie-bindings] mode=${mode} not available in public repo; falling back to mock.`);
      return createMockBindings();
    default:
      throw new Error(`[nie-bindings] unknown mode: ${mode}`);
  }
}
