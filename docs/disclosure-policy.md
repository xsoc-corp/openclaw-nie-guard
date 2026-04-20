# Disclosure Policy

This document defines what may appear in the public OPENCLAW-NIE-GUARD repository
and what must remain in the private deployment repository. It is enforced mechanically
by CI (see `scripts/disclosure-lint.mjs` and `scripts/verify-public-boundary.mjs`).

## Public (permitted here)

- Broker API endpoint shapes, request/response schemas, error codes
- Policy engine structure and role matrix format
- TSTL envelope field definitions at the schema level
- Providence event schema and chain verification algorithm
- Context Provenance Chain design and element registration flow
- Agent Intent Envelope design and intent class taxonomy
- MCP Boundary Mediation design and sanitization patterns
- Capability Derivation Tree concept and narrowing rules
- FHE Context Gate mode taxonomy (A/B/C) and mode selection criteria
- BEM integration interface and drift escalation pattern
- Signed policy bundle format at the JSON schema level
- Compliance framework mapping
- Attack simulation harness (demonstrates defenses)
- Mock NIE bindings with full TypeScript interface signatures
- Mock FHE gate with published benchmark numbers

## Private (never permitted here)

- DSKAG internals. Always black box externally. Interface and stated security properties only.
- SP-VERSA cipher and wave modulation parameters. Proprietary trade secrets.
- X-ARC adaptive response cryptography internals.
- NexusKey policy-binding internals.
- TSTL cryptographic sealing construction.
- XSOC FHE SDK internals and CKKS parameter selection.
- Actual customer policy bundles and deployment configurations.
- SDD internals.
- XRNG daemon internals.

## Substitution

Production cryptographic packages (`@xsoc/nie-bindings-prod`, `@xsoc/fhe-gate-prod`)
live in the private deployment repo and substitute the mock packages in this repo
via pnpm workspace override. Public repo source code must never import a prod
package directly; the boundary is enforced by `scripts/verify-public-boundary.mjs`.

## Forbidden terms

The disclosure lint rejects any source or documentation file containing the following
tokens (case-insensitive substring match):

```
dskag-internal, dskag_internal, dskag-keyschedule,
spversa, sp-versa-cipher, sp-versa-params, wave-modulation-params,
xarc-internal, x-arc-internal,
ckks-params-internal, ckks-internal,
xrng-internal, nexuskey-binding-internal,
tstl-seal-construction, sdd-construction-detail
```

## Release ceremony

Every public release follows this sequence before tag push:

1. Advisor review by at least one cryptographic reviewer and one commercial reviewer
2. Automated disclosure lint pass (CI required)
3. Private-import boundary check (CI required)
4. Legal review, even if abbreviated
5. Co-signed release tag using the policy bundle ceremony root
6. Zenodo DOI reservation before public tag push
7. LinkedIn announcement sequence after at least 48 hours of public availability

## Violations

A disclosure violation is a serious incident. On detection:

1. Revert the offending commit immediately
2. Force-push to restore the pre-violation head (public repos only; coordinate with collaborators)
3. File a private incident report with the CEO and cryptographic owners
4. Review for any downstream publication (Zenodo, arXiv, LinkedIn) that referenced the violating commit
5. Rotate any affected signing key if the disclosure is judged material
