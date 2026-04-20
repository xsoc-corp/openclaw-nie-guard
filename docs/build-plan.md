# Build Plan

This repository implements the plan described in the XSOC build-plan-v2 document
and its companion exploit-mapping-and-disclosure-policy supplement.

Phases:

- **Phase 0** (complete): threat model draft, classification schema, FHE mode matrix,
  public/private disclosure boundary, Zenodo paper kickoff
- **Phase 1** (in progress): monorepo scaffold, CI, disclosure lint, typed interfaces,
  mock bindings, infrastructure compose
- **Phase 2**: NIE admission ceremony wiring, attestation floor, capability derivation
- **Phase 3**: policy engine bundle loading, signed bundle schema, skill registration
  extension, role matrix evaluation
- **Phase 4**: TSTL envelope full pipeline, AIE binding, context manifest, provenance
  chain integration
- **Phase 5**: FHE Context Gate three-mode routing, Mode C endpoint attestation adapter
  stubs for Anthropic/OpenAI/Google
- **Phase 6**: adapter wiring, MCP mediator active on all configured servers, attack
  sim scenarios fully implemented
- **Phase 7**: BEM scoring, profile escalation, shadow mode, attack replay harness
- **Phase 8**: compliance map validation, Zenodo paper final draft, Cal Poly SLO and
  GMU SENTINEL citation check
- **Phase 9**: public release ceremony, Zenodo DOI publication, LinkedIn narrative arc

Tier A scope is fully in-scope. Tier B items (per-vendor endpoint attestation for
Mode C) are architected here and deferred to post-POC sprints.
