# Disclosure Policy

This document defines what may appear in the public OPENCLAW-NIE-GUARD repository
and what must remain in the private deployment repository. It is enforced mechanically
by CI through `scripts/disclosure-lint.mjs` (forbidden-term lint) and
`scripts/verify-public-boundary.mjs` (private-import boundary check).

## Public (permitted here)

- Broker API endpoint shapes, request/response schemas, error codes
- Policy engine structure and role matrix format
- TSTL envelope field definitions at the schema level
- Providence event schema and chain verification algorithm
- Context Providence Chain design and element registration flow
- Agent Intent Envelope design and intent class taxonomy
- MCP Boundary Mediation design and sanitization patterns
- Capability Derivation Tree concept and narrowing rules
- FHE Context Gate mode taxonomy (A / B / C) and mode selection criteria
- XEI integration interface and drift escalation pattern
- Signed policy bundle format at the JSON schema level
- Compliance framework mapping
- Attack simulation harness (demonstrates defenses, not exploits)
- Mock Nexus Identity Engine (NIE) bindings with full TypeScript interface signatures
- Mock FHE gate with published benchmark numbers
- XSOC-NIE-GUARD architecture description at interface and behavior level

## Private (never permitted here)

The following XSOC proprietary primitives are referenced by public name, stated
security properties, interface signatures, and externally validated performance
or correctness claims only. Internal construction details are never disclosed
in this repository or in any public deliverable.

- **DSKAG** (deterministic symmetric key agreement) internal construction
- **SP-VERSA** cipher construction and Security Policy, Volatile Enclave Runtime Safety Architecture internals
- **NLFSR feedback polynomial definitions, tap positions, and nonlinear feedback functions** (Appendix F of the XSOC Executive Validation Report)
- **MWC multiplier constants (a, b) and word size (w) configuration values** (Appendix F)
- **Dynamic S-Box mutation schedules and reseed interval specifications** (Appendix F)
- **Warm-up cycle count and entropy source seeding thresholds** (Appendix F)
- **Telemetry-salt binding schema and PGUID integration points** (Appendix F)
- **X-ARC** adaptive response cryptography internals
- **NexusKey** policy-binding internals
- **TSTL** cryptographic sealing construction
- **XSOC FHE SDK** internals and CKKS parameter selection
- **SDD** one-way primitive construction
- **XRNG** daemon internals
- Actual customer policy bundles and deployment configurations
- Statistical testing harness methodology and bias evaluation internals
- Full parameterization detail from the XSOC Executive Validation Report Section 3 and Appendix F

## Citation rules

AIDA-Guard's assurance in this repository rests on what a reader can
reproduce: the known-answer vectors, the record format, the offline verifier
and a published evidence set. External evaluations of other XSOC components
belong with those components and are cited where they are the subject. The
rule below is mandatory for all Zenodo publications, arXiv submissions,
commercial briefs, LinkedIn posts, and any other public-facing XSOC
communication made from this repository.

### XSOC Executive Validation Report

The XSOC Cryptosystem Executive Validation Report (SP-VERSA Canonical Build
2025-10), Independent Validation and Design Description (Post-Audit Edition),
is a controlled-distribution document. The **existence** of the report may be
cited publicly as a controlled artifact available under NDA.

**Correct citation form:**

> "XSOC Cryptosystem Executive Validation Report (SP-VERSA Canonical Build
> 2025-10), confidential, available under NDA. XSOC Corp, 2025."

The report itself must not be attached to any public document. Section 3
(Mathematical Foundations) and Appendix F (Cryptographic Parameters and
Methodology) of that report require a separate NDA distinct from the general
technical NDA and are subject to export control under U.S. and international
law.

## Substitution seam

Production cryptographic packages (`@xsoc/nie-bindings-prod`,
`@xsoc/fhe-gate-prod`) live in the private deployment repository and substitute
the mock packages in this repository via pnpm workspace override. Public
repository source code must never import a production package directly; the
boundary is enforced by `scripts/verify-public-boundary.mjs` in CI.

## Forbidden terms enforced in CI

The disclosure lint rejects any source or documentation file containing the
following tokens (case-insensitive substring match):

```
dskag-internal, dskag_internal, dskag-keyschedule,
spversa, sp-versa-cipher, sp-versa-params, wave-modulation-params,
xarc-internal, x-arc-internal,
ckks-params-internal, ckks-internal,
xrng-internal, nexuskey-binding-internal,
tstl-seal-construction, sdd-construction-detail,
nlfsr-polynomial, nlfsr-taps, nlfsr-feedback-polynomial,
mwc-constants, mwc-multiplier,
sbox-mutation-schedule, s-box-mutation-schedule,
warm-up-cycle-count,
pguid-integration-schema, pguid-binding-schema
```

These terms correspond to the Appendix F parameters and related internals that
are export-controlled.

## Release ceremony

Every public release follows this sequence before tag push:

1. Advisor review by at least one cryptographic reviewer and one commercial reviewer
2. Automated disclosure lint pass (CI required)
3. Private-import boundary check (CI required)
4. Legal review, even if abbreviated
5. Release tag signed with XSOC's release signing key (see "Release signing" below)
6. Zenodo DOI reservation before public tag push
7. Public announcement (LinkedIn, etc.) after at least 48 hours of public availability

## Release signing

A release tag, from v3.0.0 on, is an annotated git tag signed with XSOC's
release signing key:
- **The key:** an SSH Ed25519 key, used through git's SSH signing
  (`gpg.format ssh`). Its private half is held in XSOC's key store on the
  release workstation, protected by a passphrase. It is never in a repository
  or on a build host.
- **Its public half** is published in this repository, in
  `.github/allowed_signers`, and its fingerprint is stated in the Zenodo record
  of each release. The two come to a reader separately.
- **Where tags are signed:** on the release workstation, and nowhere else.

**Verifying a release tag.** From a clone of this repository:

    git fetch --tags
    git -c gpg.ssh.allowedSignersFile=.github/allowed_signers tag -v v3.0.0

Git prints `Good "git" signature` with the key's fingerprint. Compare that
fingerprint with the one in the Zenodo record.

Tags before v3.0.0 are historical markers, unsigned. v2.0.0 marks the commit
that sourced the Zenodo v2 record.

## Violations

A disclosure violation is a serious incident. On detection:

1. Revert the offending commit immediately
2. Force-push to restore the pre-violation head (public repos only; coordinate with collaborators)
3. File a private incident report with the CEO and cryptographic owners
4. Review for any downstream publication (Zenodo, arXiv, LinkedIn) that referenced the violating commit
5. Rotate any affected signing key if the disclosure is judged material
