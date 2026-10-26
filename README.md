[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19685360.svg)](https://doi.org/10.5281/zenodo.19685360)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

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

## The OpenClaw adapter (`@xsoc/openclaw-adapter` 0.3.0)

Every operation the broker mediates reaches OpenClaw through one narrow interface, `OpenClawAdapter`:
- It strips client-supplied auth headers and injects only broker-mediated credentials.
- It enforces the operation allowlist and the default-deny categories again, behind the broker's own checks.
- Each operation is bound by `bindingHash`: the SHA-256 of `correlationId:targetId:operationClass`. It was called `brokerSignature` before 0.2.0.

The adapter forwards through a transport. The broker takes exactly one.

| Transport | Selected when | What it does |
| --- | --- | --- |
| `openclaw-gateway` (`OpenClawGatewayTransport`) | `BROKER_OPENCLAW_GATEWAY_URL` is set | Forwards reads to a real OpenClaw gateway over its HTTP surface, `POST /tools/invoke`, on loopback only (`http://127.0.0.1:<port>` or `http://[::1]:<port>`), with the gateway's shared token |
| `scaffolding` (`@xsoc/openclaw-mock`, in `scaffolding/`) | No gateway URL; in the production build, only with `BROKER_SCAFFOLDING_TRANSPORT=1` | A stand-in OpenClaw for development and the attack harness |

**The gateway transport** is configured from the broker's environment, and startup stops if any of it is missing or malformed:

| Variable | What it holds |
| --- | --- |
| `BROKER_OPENCLAW_GATEWAY_URL` | The gateway on loopback |
| `BROKER_OPENCLAW_TOKEN_FILE` | The shared token: a regular file owned by the broker's user, mode 600, one hard link |
| `BROKER_OPENCLAW_TARGETS_FILE` | `{ "targets": { "<targetId>": { "tool", "path" } } }`: the only tools and paths a request can reach |
| `BROKER_OPENCLAW_VERSION` | The OpenClaw version the deployment pins |
| `BROKER_OPENCLAW_WAIT_S` | How long startup waits for the gateway to be live, 0 to 600 seconds (default 120) |

**What a request can reach:**
- **Reads** (`operator.read`, `file.read`, `export.data`) go through the target table, from a `targetId` to a fixed `{ tool, path }`. Nothing in a request names a tool or a path.
- **An unknown target, and every other operation class,** is refused before any call.

**How the gateway's answers are recorded:**
- **A non-200 answer** maps by status: 401 `ERR_OPENCLAW_UNAUTHORIZED`, 404 `ERR_OPENCLAW_TOOL_NOT_AVAILABLE`, and so on.
- **The tool's own refusal,** which OpenClaw sends as HTTP 200, maps by its `details.status`, for example `ERR_OPENCLAW_MEMORY_PATH_NOT_ALLOWED` or `ERR_OPENCLAW_NOT_FOUND`.
- **No answer** is `ERR_OPENCLAW_UNREACHABLE`.

**The transport stamp on Providence records:** each record of an operation forwarded through a transport carries `transport: <its name>`, and the gateway transport adds `transport_version`. Every other record carries no transport field: admissions, refusals made before any call, FHE decisions and the pre-flight. `AdapterResponse.forwarded` tells the two apart.

The changes by version are in `packages/openclaw-adapter/CHANGELOG.md`.

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
│   └── mcp-mediator/        # MCP boundary mediation
├── scaffolding/
│   └── openclaw-mock/       # Scaffolding OpenClaw transport; records it touches carry transport: scaffolding
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
