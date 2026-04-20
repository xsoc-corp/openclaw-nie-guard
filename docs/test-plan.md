# Test Plan

## Unit tests

Per-package vitest suites:

- `@xsoc/shared-types`: schema round-trip
- `@xsoc/nie-bindings`: mock admission, token, derivation, seal, validate, revoke
- `@xsoc/policy-engine`: role matrix evaluation, deny paths, profile inheritance
- `@xsoc/tstl-envelope`: build, validate, increment, target binding check
- `@xsoc/providence-log`: append, chain verify, tamper detect
- `@xsoc/fhe-gate`: mode selection matrix, endpoint attestation requirement, deny paths
- `@xsoc/openclaw-adapter`: default-deny enforcement, profile gating
- `@xsoc/mcp-mediator`: pattern detection, tagging, trust table

## Integration tests

Broker under docker-compose, attack-sim as client. 23 scenarios.

## Compliance tests

Per-framework assertion: NIST AI RMF, OWASP Agentic Top 10, ISO 42001, EU AI Act.
See `docs/compliance-map.md`.

## Performance tests

- Admission p95 under 100ms end-to-end (mock binding; production numbers from NIE baseline)
- Invoke p95 under 15ms added latency over raw OpenClaw forward
- FHE Mode A encrypt operation: use published CKKS numbers; not re-measured
