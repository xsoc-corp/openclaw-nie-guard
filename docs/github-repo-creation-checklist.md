# GitHub Repository Creation Checklist

For creating the public repo at github.com/xsoc-corp/openclaw-nie-guard.

All values below are defensible defaults based on the existing scaffold. Review
each section, override where needed, and check off as you complete each step.

---

## Section 1. Basic repository fields

**Repository name:**
```
openclaw-nie-guard
```
Rationale: matches `package.json` name, matches the URLs embedded in the Zenodo
paper, matches the OpenAI liaison paper, matches the XSOC-corp-owned scaffold
in the current tarball. Do not change this unless you have a reason.

**Owner:**
```
xsoc-corp
```
Rationale: matches `CODEOWNERS`, matches package `repository.url` in package.json,
matches prior XSOC public repo pattern (xsoc-qsig-cga-release).

**Description (341 char, fits GitHub's 350 limit):**
```
Cryptographic trust mediation layer for AI agent frameworks. Apache 2.0 reference architecture composing device-attested admission, short-TTL scoped capabilities, runtime continuity envelopes, context provenance anchoring, agent intent binding, FHE context gate, MCP boundary mediation, signed policy bundles, and tamper-evident audit chain.
```
Character count: 341. Fits.

**Alternative short description if you prefer leaner:**
```
Cryptographic trust mediation layer for AI agent frameworks. Public reference architecture under Apache 2.0.
```
Character count: 107.

**Website URL:**
```
https://xsoccorp.com
```

**Topics (GitHub tags, up to 20, all lowercase with hyphens):**
```
ai-agents
ai-security
cryptography
post-quantum-cryptography
homomorphic-encryption
fhe
agent-security
prompt-injection
mcp
capability-security
openclaw
owasp-agentic
zero-trust
mediation-layer
```
14 topics. Recommend keeping all 14.

---

## Section 2. Visibility and access

- [ ] Visibility: **Public**
- [ ] Include a README: **No** (the scaffold already has README.md)
- [ ] Add a .gitignore: **No** (scaffold has .gitignore)
- [ ] Choose a license: **No** (scaffold has LICENSE, Apache 2.0)
- [ ] Require contributors to sign off: Your call. Recommend **No** for a reference repo.

---

## Section 3. Initial push procedure

After creating the empty repo on GitHub, push the existing scaffold. From inside
the extracted scaffold directory:

```bash
# Verify you are on the clean main branch with 6 commits
git log --oneline
# Expected: 6 commits from 2e9b2bc through 1bb423f

# Add the GitHub remote (use the correct name per your XSOC remote naming convention)
git remote add github git@github.com:xsoc-corp/openclaw-nie-guard.git

# Push main
git push -u github main
```

Reminder from XSOC conventions stored in memory: git remotes are always named
`github`, `bitbucket`, `azure`. Never `origin`. The scaffold does not yet have
any remote configured; add `github` during the first push.

---

## Section 4. Branch protection (recommended before any public announcement)

Go to Settings > Branches > Add branch protection rule for `main`:

- [ ] Branch name pattern: `main`
- [ ] Require a pull request before merging
- [ ] Require approvals: **1** minimum (you can require 2 if XSOC has a second
      reviewer available)
- [ ] Require status checks to pass before merging
- [ ] Required status checks to pass:
  - `build-and-test` (from node-ci.yml)
  - `build` (from rust-ci.yml)
  - `disclosure-lint` (from disclosure-lint.yml) <- **REQUIRED, non-negotiable**
- [ ] Require branches to be up to date before merging
- [ ] Require conversation resolution before merging
- [ ] Do not allow bypassing the above settings
- [ ] Restrict force pushes: **Yes, to administrators only**
- [ ] Restrict deletions: **Yes**

The disclosure-lint check is the single most important one. Without it, a
future commit could accidentally leak a forbidden term and the only defense
is the manual review process.

---

## Section 5. Repository settings

### General tab

- [ ] Features: leave Wikis **off** for now. Enable Discussions **off** for now.
      You can turn these on after the paper is cited if you want community
      engagement. Disabling them at launch keeps noise low.
- [ ] Pull Requests: check **Allow squash merging** (preferred), uncheck merge
      commits and rebase. Consistent history.
- [ ] Archives: check **Include Git LFS objects in archives** (future-proofing)

### Pages tab

- [ ] Leave disabled. If you later want a docs site, enable Pages from `main`
      branch `/docs` folder after publishing.

### Security tab

- [ ] Dependabot alerts: **On**
- [ ] Dependabot security updates: **On**
- [ ] Secret scanning: **On** (free for public repos)
- [ ] Code scanning: **Enable default setup** (CodeQL will run on JS/TS)

### Moderation tab

- [ ] Limits: leave at defaults for now. Can tighten if spam arrives.

---

## Section 6. Release tag

After the first push and Zenodo DOI reservation, create a release tag:

- [ ] Tag name: `v0.9.0` or `v1.0.0` depending on the scope decision from your
      five pending questions
- [ ] Release title: `v0.9.0 - Public reference architecture (pre-review)` or
      `v1.0.0 - Public reference architecture`
- [ ] Release notes: copy from `CHANGELOG.md` (does not exist yet; I can draft
      one when you confirm scope)
- [ ] Attach: the Zenodo DOI badge markdown
- [ ] Mark as latest release: **Yes**
- [ ] Set as pre-release: depends on scope choice. If v0.9 or "working paper"
      scope, mark as pre-release. If v1.0 full paper, do not.

---

## Section 7. Social preview image

GitHub lets you attach a preview image shown when the repo link is shared on
social media or in LinkedIn posts. Recommended but optional for initial launch.

Suggested content: XSOC logo top left, repo title, one-line value prop, the
five-plane architecture diagram from the paper. 1280x640 px.

I cannot generate this image in the current environment. It is a 15-minute
job for whoever does XSOC graphics, or you can skip it for now and add later.

---

## Section 8. Post-creation verification checklist

After push, before sharing the URL with Franklin or anyone else:

- [ ] Repository loads at github.com/xsoc-corp/openclaw-nie-guard
- [ ] README renders correctly on the repo home page
- [ ] LICENSE shows as Apache 2.0 in the header
- [ ] Languages bar shows TypeScript primarily, with Rust and Shell
- [ ] Topics appear below the description
- [ ] Actions tab shows three workflows (Node CI, Rust CI, Disclosure Lint)
- [ ] First CI run results: ideally all green. If not, fix before sharing.
- [ ] Clone the repo fresh into a separate directory and run `./scripts/quickstart.sh`
      end-to-end to confirm a first-time reviewer experience works.
- [ ] Verify disclosure lint CI is marked as required in branch protection.
- [ ] Check that the private directory (`private/`) is present but contains only
      the two README.md placeholder files explaining the substitution seam.

---

## Section 9. Specific items to double-check before push

Because this is a public release and mistakes are costly to reverse:

- [ ] Search the repo for any TODO comments referencing sensitive XSOC
      internals. Current scaffold uses `TODO(xsoc-openclaw-poc)` as the marker.
      Grep for that and confirm each one is safe for public reading.
- [ ] Search for any stray customer names (Pure Storage, JPMorgan, 16th AF,
      Micron, NIST CAISI, Keypasco, Wells Fargo, DTCC, CME, Accenture,
      EternaX). These should not appear in the public repo.
- [ ] Search for `xsoc-corp/xsoc-qsig-cga` private repo references that might
      have leaked into code or docs.
- [ ] Search for any Azure, Cosmos, or specific deployment URLs from the
      XSOC commercial stack (`xsoc-nie-gateway.azurewebsites.net`,
      `xsoc-vault.azurewebsites.net`, etc.). These should not be in the public
      repo.
- [ ] Search for author keys, signatures, or HSM configuration details.
- [ ] Run `node scripts/disclosure-lint.mjs` one last time locally before push.
- [ ] Run `node scripts/verify-public-boundary.mjs` one last time locally.

## Verification command sequence

```bash
cd openclaw-nie-guard

# Repeat checks from scaffold verification
node scripts/disclosure-lint.mjs
node scripts/verify-public-boundary.mjs

# Additional manual scans
grep -ri "jpmorgan\|pure storage\|16th air force\|keypasco\|wells fargo\|dtcc\|accenture\|eternax\|porechna\|caramico\|saddigh" --exclude-dir=.git --exclude-dir=node_modules . || echo "clean: no customer or competitor names"

grep -r "azurewebsites.net" --exclude-dir=.git --exclude-dir=node_modules . || echo "clean: no internal deployment URLs"

grep -r "xsoc-qsig-cga\b" --exclude-dir=.git --exclude-dir=node_modules . || echo "clean: no private QSIG repo references"

grep -r "TODO\|FIXME\|XXX\|HACK" --exclude-dir=.git --exclude-dir=node_modules . | head -20
```

All four greps should return either "clean:" messages or empty results, except
the last which should show only the expected `TODO(xsoc-openclaw-poc)` markers
that are intentional.

---

## Section 10. Ready-to-go summary

If you are ready to create the repo right now, here are the exact values to enter:

```
Owner: xsoc-corp
Name: openclaw-nie-guard
Description: Cryptographic trust mediation layer for AI agent frameworks. Public reference architecture under Apache 2.0.
Visibility: Public
Initialize with README: NO
Initialize with .gitignore: NO
Initialize with license: NO
```

Then after creation, come back here with the clone URL and I can walk through
the push verification.
