# Demo Runbook

## Prerequisites

- Node 20+, pnpm 9+, Docker

## Setup

```bash
pnpm install
cp .env.sample .env
docker compose up -d redis openclaw-mock
```

## Run

Terminal 1:
```bash
pnpm --filter @xsoc/broker dev
```

Terminal 2:
```bash
pnpm --filter @xsoc/demo-client dev
```

## Attack simulation

```bash
pnpm --filter @xsoc/attack-sim dev
```

Expected: 23 scenarios executed. Each prints PASS or FAIL. Zero FAIL in the final
release.

## Live demo scenario sequence (15 minutes)

1. Baseline: admit, invoke tool.read, show Providence chain
2. Scope attack: request exec.run with operator role (expect ERR_SCOPE_DENIED)
3. Replay attack: replay captured envelope (expect ERR_NONCE_REPLAY)
4. MCP injection: inject prompt via Telegram mock channel (expect mcp_tainted event)
5. Pairing escalation (CVE-2026-33579 class): sub-agent widens scope (expect ERR_SCOPE_DENIED)
6. Unsigned skill registration (ClawHavoc class): expect ERR_SKILL_UNSIGNED
7. FHE Mode A demonstration: RAG over ciphertext; model never sees cleartext
8. FHE Mode C with endpoint attestation: cleartext released; Providence logs event
9. Chain verification: `pnpm exec verify-chain` on Providence output
