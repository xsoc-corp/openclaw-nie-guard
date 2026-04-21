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
- Context Provenance Chain design and element registration flow
- Agent Intent Envelope design and intent class taxonomy
- MCP Boundary Mediation design and sanitization patterns
- Capability Derivation Tree concept and narrowing rules
- FHE Context Gate mode taxonomy (A / B / C) and mode selection criteria
- BEM integration interface and drift escalation pattern
- Signed policy bundle format at the JSON schema level
- Compliance framework mapping
- Attack simulation harness (demonstrates defenses, not exploits)
- Mock NIE bindings with full TypeScript interface signatures
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

## Citation rules for external validations

Three independent validations of XSOC cryptographic primitives may be cited in
public materials using precise language that does not misrepresent their scope
or timing. These rules are mandatory for all Zenodo publications, arXiv
submissions, commercial briefs, LinkedIn posts, and any other public-facing
XSOC communication.

### Perrin and Biryukov

Confidential cryptographic audits of the **legacy XSOC cryptosystem** conducted
by Léo Perrin and Alex Biryukov (University of Luxembourg) in **2020 and 2024**.
These audits **predate the creation of DSKAG**. Mandatory findings from both
audits were incorporated into the canonical build 2025-10.

**Correct citation form:**

> "Independent cryptographic audits of the legacy XSOC cryptosystem were
> performed by Léo Perrin and Alex Biryukov of the University of Luxembourg
> in 2020 and 2024. These audits predate the creation of DSKAG. Mandatory
> recommendations from both audits were incorporated into the current
> canonical build (SP-VERSA Canonical Build 2025-10)."

**Incorrect forms that must never be used:**

- "Perrin and Biryukov reviewed DSKAG" (false; audits predate DSKAG)
- "Perrin and Biryukov peer-reviewed the canonical build" (false; the audits
  were of the legacy implementation, with findings incorporated into the
  canonical build rather than re-audited against it)
- "Perrin and Biryukov validated XSOC-NIE-GUARD" (false; out of scope)
- "Published peer review by Perrin and Biryukov" (false; the audits are
  confidential)

### California Polytechnic State University at San Luis Obispo

Department of Computer Science, Faculty Cryptography Laboratory, Dieharder
v3.31.1 statistical validation of the XSOC entropy subsystem.

**Citable facts:**

- Tool: Dieharder v3.31.1
- Dataset identifier: "XSOC Dieharder Output 20220104A," available under
  controlled access (Appendix F of the Executive Validation Report)
- Methodology: 50 test batches, each exceeding 64 Mbits of output, produced
  via the generateInitialKeyVector() method on the canonical XSOC RNG
- Test matrices: Diehard, NIST SP 800-22 STS, RGB, DAB
- Results: 98 tests total, 97 passed, 1 weak (within tolerance 0.01 <= p <= 0.99), 0 failed
- Aggregate: **99.4 percent** pass rate

**Always Cal Poly San Luis Obispo. Never Pomona.**

### George Mason University SENTINEL FP5223

GMU SENTINEL laboratory audit of the XSOC cryptographic stack with finding
reference FP5223. **The full public report is scheduled for publication in
June 2026.** Until publication, the audit may be cited as a forthcoming
public report.

**Correct citation form (pre-publication):**

> "George Mason University SENTINEL laboratory audit, finding reference
> FP5223, with the full report scheduled for public release in June 2026."

**Post-June-2026 citation** will cite the published report directly with
authors, title, and publication venue.

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
5. Co-signed release tag using the policy bundle ceremony root
6. Zenodo DOI reservation before public tag push
7. Public announcement (LinkedIn, etc.) after at least 48 hours of public availability

## Violations

A disclosure violation is a serious incident. On detection:

1. Revert the offending commit immediately
2. Force-push to restore the pre-violation head (public repos only; coordinate with collaborators)
3. File a private incident report with the CEO and cryptographic owners
4. Review for any downstream publication (Zenodo, arXiv, LinkedIn) that referenced the violating commit
5. Rotate any affected signing key if the disclosure is judged material
