import { describe, it, expect } from 'vitest';
import {
  BOTTOM,
  canonicalLabel,
  canonicalLabelBytes,
  classificationRank,
  isTainted,
  isUntrustedOrigin,
  join,
  joinAll,
  labelLeq,
  type Label
} from '../src/lineage.js';

const L = (classification: Label['classification'], ...origins: Label['origins']): Label => ({
  classification,
  origins
});

describe('lattice laws', () => {
  const samples: Label[] = [
    BOTTOM,
    L('public', 'user'),
    L('sensitive', 'rag'),
    L('regulated', 'mcp-response', 'user'),
    L('classified-adjacent', 'external-channel')
  ];

  it('join is idempotent', () => {
    for (const a of samples) {
      expect(join(a, a)).toEqual(canonicalLabel(a));
    }
  });

  it('join is commutative', () => {
    for (const a of samples) {
      for (const b of samples) {
        expect(join(a, b)).toEqual(join(b, a));
      }
    }
  });

  it('join is associative', () => {
    for (const a of samples) {
      for (const b of samples) {
        for (const c of samples) {
          expect(join(join(a, b), c)).toEqual(join(a, join(b, c)));
        }
      }
    }
  });

  it('BOTTOM is the identity', () => {
    for (const a of samples) {
      expect(join(a, BOTTOM)).toEqual(canonicalLabel(a));
    }
  });
});

describe('monotonicity', () => {
  it('classification never decreases under join', () => {
    const a = L('regulated', 'user');
    const b = L('public', 'rag');
    expect(join(a, b).classification).toBe('regulated');
  });

  it('origins are never removed under join', () => {
    const a = L('public', 'user');
    const b = L('public', 'external-channel');
    expect(join(a, b).origins).toEqual(['external-channel', 'user']);
  });

  it('an unrecognised classification ranks highest rather than lowest', () => {
    // A value this code does not know must not silently become the least
    // restrictive one. Cast deliberately: the point is behaviour on bad input.
    const unknown = 'not-a-real-classification' as Label['classification'];
    expect(classificationRank(unknown)).toBeGreaterThan(classificationRank('classified-adjacent'));
    expect(join(L('public', 'user'), L(unknown)).classification).toBe(unknown);
  });
});

describe('the CCI case', () => {
  it('a decrypt output inherits the fetched page origin', () => {
    // Three nodes: the user prompt, the fetched attacker page, and the value the
    // agent's sandbox produced from both. The output's label is the join.
    const userPrompt = L('public', 'user');
    const fetchedPage = L('public', 'external-channel');
    const decryptOutput = joinAll([userPrompt, fetchedPage]);

    expect(decryptOutput.origins).toContain('external-channel');
    expect(isTainted(decryptOutput)).toBe(true);
  });

  it('a session with no untrusted material is not tainted', () => {
    expect(isTainted(joinAll([L('regulated', 'user'), L('sensitive', 'system')]))).toBe(false);
  });

  it('classifies the untrusted origin set', () => {
    expect(isUntrustedOrigin('external-channel')).toBe(true);
    expect(isUntrustedOrigin('mcp-response')).toBe(true);
    expect(isUntrustedOrigin('rag')).toBe(true);
    expect(isUntrustedOrigin('user')).toBe(false);
    expect(isUntrustedOrigin('system')).toBe(false);
    expect(isUntrustedOrigin('tool-output')).toBe(false);
  });
});

describe('ordering', () => {
  it('a lower classification with a subset of origins is leq', () => {
    expect(labelLeq(L('public', 'user'), L('regulated', 'user', 'rag'))).toBe(true);
  });

  it('a higher classification is not leq', () => {
    expect(labelLeq(L('regulated', 'user'), L('public', 'user'))).toBe(false);
  });

  it('an origin the authority does not cover is not leq', () => {
    expect(labelLeq(L('public', 'external-channel'), L('regulated', 'user'))).toBe(false);
  });
});

describe('canonicalization', () => {
  it('sorts and deduplicates origins', () => {
    expect(canonicalLabel(L('public', 'user', 'rag', 'user')).origins).toEqual(['rag', 'user']);
  });

  it('two labels with the same content serialize identically', () => {
    const a = L('sensitive', 'rag', 'user');
    const b = L('sensitive', 'user', 'rag');
    expect(canonicalLabelBytes(a)).toBe(canonicalLabelBytes(b));
  });

  it('different content serializes differently', () => {
    expect(canonicalLabelBytes(L('sensitive', 'user'))).not.toBe(
      canonicalLabelBytes(L('sensitive', 'external-channel'))
    );
  });
});