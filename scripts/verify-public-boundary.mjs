#!/usr/bin/env node
// Verifies that the public repo does not import from private workspace packages.
// Private bindings live outside the published workspace and are substituted only in the
// private deployment repo via workspace override.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();

const FORBIDDEN_IMPORTS = [
  '@xsoc/nie-bindings-prod',
  '@xsoc/fhe-gate-prod',
  '@xsoc/dskag-internal',
  '@xsoc/sp-versa-internal',
  '@xsoc/xrng-internal'
];

const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', 'target', 'private', 'coverage'];
const EXCLUDED_FILES = new Set(['verify-public-boundary.mjs']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dir, findings) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.includes(entry)) continue;
    if (EXCLUDED_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) { walk(full, findings); continue; }
    if (!CODE_EXTENSIONS.has(extname(full))) continue;
    const content = readFileSync(full, 'utf8');
    // Strip line and block comments before import analysis.
    const stripped = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    for (const imp of FORBIDDEN_IMPORTS) {
      // Match only real ES import or require statements, not mentions in strings or docs.
      const patterns = [
        new RegExp(`\\bfrom\\s+['"\`]${escapeRegex(imp)}['"\`]`),
        new RegExp(`\\bimport\\s*\\(\\s*['"\`]${escapeRegex(imp)}['"\`]\\s*\\)`),
        new RegExp(`\\brequire\\s*\\(\\s*['"\`]${escapeRegex(imp)}['"\`]\\s*\\)`)
      ];
      if (patterns.some((p) => p.test(stripped))) {
        findings.push({ file: full, imp });
      }
    }
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const findings = [];
walk(ROOT, findings);

if (findings.length === 0) {
  console.log('[verify-public-boundary] PASS: no private imports detected.');
  process.exit(0);
}

console.error('[verify-public-boundary] FAIL: private imports detected in public repo.');
for (const f of findings) {
  console.error(`  ${f.file}: imports "${f.imp}"`);
}
console.error('');
console.error('Public repo must only use mock bindings. Production bindings are substituted');
console.error('in the private deployment repo via pnpm workspace override.');
process.exit(1);
