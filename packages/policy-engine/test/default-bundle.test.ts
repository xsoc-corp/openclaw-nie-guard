import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PolicyBundle } from '@xsoc/shared-types';
import { DEFAULT_ROLE_MATRIX } from '../src/default-roles.js';

// The broker decides from DEFAULT_ROLE_MATRIX, and infra/policy/default-bundle.json is
// that matrix as a bundle: the bundle the verification unit signs. The two must not drift.
const BUNDLE = new URL('../../../infra/policy/default-bundle.json', import.meta.url);

describe('the default policy bundle', () => {
  const raw = JSON.parse(readFileSync(BUNDLE, 'utf8'));

  it('parses as a PolicyBundle', () => {
    expect(() => PolicyBundle.parse(raw)).not.toThrow();
  });

  it('holds exactly the built-in role matrix', () => {
    expect(raw.payload.roles).toStrictEqual(DEFAULT_ROLE_MATRIX);
  });
});
