# Compliance Map

Each control in XSOC-NIE-GUARD maps to one or more external frameworks. Compliance
is a property of the architecture rather than a configuration option.

## NIST AI RMF

| Function | Categories addressed | NIE-GUARD control |
|---|---|---|
| Map | Context, risks, actors | Threat model, classification taxonomy |
| Measure | Trustworthy AI characteristics | Providence metrics, BEM scoring |
| Manage | Risk mitigation, response | Profile escalation, revocation, dual-control |
| Govern | Accountability, roles | Signed policy bundles, ceremony-rooted keys |

## OWASP Top 10 for Agentic Applications

Palo Alto has mapped OpenClaw to every category. XSOC-NIE-GUARD addresses each:

| OWASP category | Control |
|---|---|
| Permission escalation | A6 dual-control, A8 CDT, A10 signed bundles |
| Memory poisoning | Context Provenance Chain, content-hash binding |
| Tool misuse | A2 Agent Intent Envelope, adapter allowlist |
| Identity spoofing | NIE device attestation at admission |
| Supply chain and trust | A10 signed bundles for skills and MCP servers |
| Hallucinated output execution | Intent envelope, operation class allowlist |
| Runaway autonomy | BEM adaptive profile escalation |
| Cascading failures | Short-TTL, CDT containment |
| Untraceability | Providence hash chain |
| Prompt injection | A3 MCP mediation, external-content tagging |

## ISO 42001

Documented controls for role-based access, incident logging, and management review
map to XSOC-NIE-GUARD policy bundle, Providence log, and ceremony review process.

## EU AI Act

High-risk system obligations for data governance, record keeping, and human oversight
map to classification taxonomy, Providence chain, and dual-control mechanism.

## FedRAMP and DoD IL considerations

Attestation floor selection (TPM, Secure Enclave, StrongBox, HSM) supports IL4/IL5
posture. SP-VERSA, X-ARC, DSKAG black-box cryptographic primitives are independently
validated (Cal Poly San Luis Obispo Dieharder 98.4%, University of Luxembourg analysis,
GMU SENTINEL FP5223). FHE Mode A and Mode B eliminate cleartext exposure entirely
for the highest-classification operations.
