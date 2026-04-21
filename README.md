# OPENCLAW-NIE-GUARD

**Cryptographic trust mediation layer for OpenClaw and compatible AI agent frameworks.**

This is the public reference implementation. The production deployment repository
lives separately and substitutes production cryptographic primitives via pnpm workspace
override.

## Status

Phase 1. Scaffold with typed interfaces, mock bindings, disclosure lint, CI, and
threat model. Implementation of business logic is tracked by `TODO(xsoc-openclaw-poc)`
markers and proceeds through Phases 3 through 9 per `docs/build-plan.md`.

## Quickstart (reviewers, 3-5 minutes)

```bash
git clone https://github.com/xsoc-corp/openclaw-nie-guard.git
cd openclaw-nie-guard
./scripts/quickstart.sh
```

The quickstart script installs dependencies, builds the workspace, runs the test suite, starts the broker with mock bindings, executes the full 25-scenario attack simulation harness, and displays the resulting Providence audit chain. Requires Node 20+, pnpm 9+, and optionally Docker for Redis and the mock OpenClaw transport.

## Quick start (local dev)

```bash
# Requires Node 20+, pnpm 9+, Docker
pnpm install
docker compose up -d redis openclaw-mock
pnpm --filter @xsoc/broker dev

# In another terminal
pnpm --filter @xsoc/attack-sim dev
```

## What this does

XSOC-NIE-GUARD sits in front of OpenClaw (or any compatible agent framework) and enforces:

1. Hardware and context bound admission via NIE device attestation
2. Role scoped, short-TTL capability derivation via DSKAG
3. Runtime continuity and per-operation integrity via TSTL envelopes
4. Context provenance via hash-anchored context manifests
5. Agent intent binding to prevent prompt-injection-driven misuse
6. FHE Context Gate for sensitive context that must never reach the model in cleartext
7. MCP boundary mediation for external messaging channels (Telegram, Slack, Discord, email)
8. Signed policy bundles with ceremony-rooted keys
9. Immutable audit chain via Providence
10. Adaptive profile escalation via BEM

It answers the OpenClaw security crisis documented across multiple public advisories
in early 2026, including the assume-compromise posture, pairing privilege escalation,
credential sprawl, and malicious skill supply chain.

See `docs/build-plan.md`, `docs/threat-model.md`, and `docs/exploit-mapping-and-disclosure-policy.md`.

## Public / private boundary

This repository is the **public** reference architecture. The following are **never** present here:

- DSKAG construction internals
- SP-VERSA cipher and wave modulation parameters
- X-ARC adaptive response internals
- CKKS parameter selection internals
- NIE crypto implementation
- XSOC FHE SDK internals
- Actual customer policy bundles

See `docs/disclosure-policy.md` for the full boundary. A disclosure lint runs in CI
on every push; forbidden terms cause a hard CI failure.

## Repository layout

```
openclaw-nie-guard/
├── apps/
│   ├── broker/              # Fastify broker service
│   ├── demo-client/         # Happy-path demo driver
│   └── attack-sim/          # Deterministic 23-scenario attack harness
├── packages/
│   ├── shared-types/        # Zod schemas and TS types
│   ├── nie-bindings/        # Stable NIE interface (mock impl; prod via override)
│   ├── policy-engine/       # Signed bundle policy evaluation
│   ├── tstl-envelope/       # Continuity envelope logic
│   ├── providence-log/      # Hash-chained audit log
│   ├── fhe-gate/            # FHE Context Gate (mock; prod via override)
│   ├── openclaw-adapter/    # Mediation boundary to OpenClaw
│   ├── mcp-mediator/        # MCP boundary mediation
│   └── openclaw-mock/       # Mock OpenClaw transport for dev
├── rust/
│   └── nie-core/            # Public stub; real workspace lives in private repo
├── infra/
│   ├── docker/              # Dockerfiles
│   ├── redis/               # Redis config
│   └── policy/              # Default policy bundle (dev only)
├── scripts/
│   ├── disclosure-lint.mjs  # Forbidden-term lint (CI-enforced)
│   └── verify-public-boundary.mjs  # Private-import lint (CI-enforced)
├── .github/workflows/       # CI: Node, Rust, Disclosure Lint
└── docs/
    ├── architecture.md
    ├── threat-model.md
    ├── disclosure-policy.md
    ├── build-plan.md
    ├── exploit-mapping-and-disclosure-policy.md
    ├── api-spec.md
    ├── demo-runbook.md
    ├── test-plan.md
    ├── compliance-map.md
    ├── nie-integration.md
    └── zenodo-paper/
```

## License

Apache 2.0. See LICENSE.

## About XSOC

XSOC Corp designs and builds cryptographic infrastructure for high-trust environments,
including post-quantum key agreement, policy-bound encryption, homomorphic evaluation,
software-defined diode transport, and continuity-bound audit. Independent validations
of the broader XSOC cryptographic stack include Perrin and Biryukov audits of the legacy
cryptosystem at the University of Luxembourg in 2020 and 2024 (with mandatory findings
incorporated into the current canonical build), Cal Poly San Luis Obispo Dieharder
v3.31.1 at 99.4 percent aggregate across 98 tests, and GMU SENTINEL laboratory audit
FP5223 (full report publication scheduled June 2026).

- Website: https://xsoccorp.com
- OWASP AI Exchange: contributor
- Contact: see https://xsoccorp.com/contact
