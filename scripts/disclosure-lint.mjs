#!/usr/bin/env node
// XSOC public repo disclosure lint.
// Enforces the public/private boundary defined in docs/disclosure-policy.md.
// Exits nonzero if any forbidden term appears in tracked source or documentation.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();

// Terms that must never appear in public repo source or docs.
// Interface names and public scheme names are permitted; internal construction terms are not.
const FORBIDDEN_TERMS = [
  'dskag-internal',
  'dskag_internal',
  'dskag-keyschedule',
  'spversa',
  'sp-versa-cipher',
  'sp-versa-params',
  'wave-modulation-params',
  'xarc-internal',
  'x-arc-internal',
  'ckks-params-internal',
  'ckks-internal',
  'xrng-internal',
  'nexuskey-binding-internal',
  'tstl-seal-construction',
  'sdd-construction-detail',
  'nlfsr-polynomial',
  'nlfsr-taps',
  'nlfsr-feedback-polynomial',
  'mwc-constants',
  'mwc-multiplier',
  'sbox-mutation-schedule',
  's-box-mutation-schedule',
  'warm-up-cycle-count',
  'pguid-integration-schema',
  'pguid-binding-schema'
];

// Paths excluded from the lint (private boundary itself, generated output, tests that document forbidden terms).
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'coverage',
  'private',
  'data'
];

const EXCLUDED_FILES = new Set([
  'disclosure-lint.mjs',
  'verify-public-boundary.mjs',
  'disclosure-policy.md',
  'exploit-mapping-and-disclosure-policy.md'
]);

const LINT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.rs', '.toml',
  '.md', '.mdx',
  '.json', '.yaml', '.yml'
]);

function walk(dir, findings) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.includes(entry)) continue;
    if (EXCLUDED_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, findings);
      continue;
    }
    if (!LINT_EXTENSIONS.has(extname(full))) continue;
    const content = readFileSync(full, 'utf8').toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      if (content.includes(term.toLowerCase())) {
        findings.push({ file: full, term });
      }
    }
  }
}

const findings = [];
walk(ROOT, findings);

if (findings.length === 0) {
  console.log('[disclosure-lint] PASS: no forbidden terms detected in public repo.');
  process.exit(0);
}

console.error('[disclosure-lint] FAIL: forbidden terms detected.');
for (const f of findings) {
  console.error(`  ${f.file}: contains "${f.term}"`);
}
console.error('');
console.error('Public repo must not contain internal construction details for DSKAG, SP-VERSA,');
console.error('X-ARC, CKKS parameter selection, XRNG, or other black-box XSOC primitives.');
console.error('Reference these components by public name and stated security properties only.');
console.error('See docs/disclosure-policy.md for the full disclosure boundary.');
process.exit(1);
