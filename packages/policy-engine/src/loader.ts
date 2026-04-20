import { readFileSync } from 'node:fs';
import { PolicyBundle } from '@xsoc/shared-types';
import type { NieBindings } from '@xsoc/nie-bindings';

// Load and verify a policy bundle. The signature primitive lives in nie-bindings.
// In public repo mock mode the signature check is not cryptographic; the bundle
// structure and signer key id are still validated.
export async function loadPolicyBundle(path: string, _bindings: NieBindings): Promise<PolicyBundle> {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  const bundle = PolicyBundle.parse(parsed);

  // TODO(xsoc-openclaw-poc): invoke bindings.verifyPolicyBundleSignature() when
  // that export is added to NieBindings in the private repo. The public interface
  // accepts the bundle as-is once structure validates.

  return bundle;
}
