# Appendix A: Notation and Nomenclature

*Reference table for abbreviations, identifiers, and error codes used
throughout this paper.*

---

## A.1 Architecture identifiers

| Identifier | Meaning |
|---|---|
| P1 through P5 | Planes of the XSOC-NIE-GUARD architecture (Client Trust, Admission, Action Mediation, Runtime Continuity, Audit and Revocation) |
| A1 through A10 | Named controls (FHE Context Gate, Agent Intent Envelope, MCP Boundary Mediation, Context Provenance Chain, Short-TTL Scoped Capabilities, Dual-Control for High-Risk Operations, Device Fingerprint Binding, Capability Derivation Tree, Behavioral Escalation Meter, Signed Policy Bundles) |
| T-01 through T-13 | Threat paths catalogued in Section 2 |

## A.2 XSOC cryptographic primitive names

| Name | Role | Section |
|---|---|---|
| DSKAG | Deterministic Symmetric Key Agreement Generator. Produces identical keys from shared policy context across parties without transmission. | 6.3 |
| NexusKey | Policy-bound key derivation. Decryption capability is a function of policy context rather than a stored artifact. | 6.3 |
| SP-VERSA | Volatile memory key protection via seed-based contextual derivation. | 6.3 |
| PGUID | Persistent Globally Unique Identifier. Revocation handle that invalidates subsequent derivation attempts via a database write. | 6.3 |
| TSTL | Cryptographic envelope construction that carries session continuity state across operations. | 5.2 |
| XSOC FHE SDK | The integrated four-layer FHE product described in [42]. | 6 |
| XRNG | XSOC random number generator. Referenced by name; internals out of scope. | 1.7 |
| X-ARC | Adaptive response cryptography. Referenced by name; internals out of scope. | 1.7 |

## A.3 FHE modes

| Mode | Behaviour |
|---|---|
| Mode A | Full FHE. Operation runs on ciphertext end-to-end; model vendor and OpenClaw instance see only ciphertext. |
| Mode B | Tokenized substitution. Sensitive fields replaced with opaque tokens before model sees prompt; reversed on approved return paths only. |
| Mode C | Attested cleartext. Cleartext reaches model only with endpoint attestation, policy approval, Providence-logged decryption receipt, and (for regulated classifications) dual-control co-sign. |

## A.4 Operator profiles

| Profile | Permits | Intended for |
|---|---|---|
| relaxed | Lethal trifecta | Development only |
| standard | Trifecta with forced context breaks via envelope counter cycles | General production |
| strict | Private data Mode A/B only; external communication requires intent match | Regulated production |
| restricted-information | Private data and external communication mutually exclusive in a session | Highest-sensitivity deployments |

## A.5 Intent classes

Finite set used by the Agent Intent Envelope (Section 5.4):
`read`, `write`, `analyze`, `export`, `execute`, `escalate`. Mapping to
operation classes is in the signed policy bundle's
`OPERATION_TO_INTENT` field.

## A.6 Classification levels

| Level | Description |
|---|---|
| public | No confidentiality constraint |
| sensitive | Organizational sensitivity; internal policy applies |
| regulated | Subject to external regulation (HIPAA, PCI, GDPR, etc.); dual-control on Mode C |
| restricted-information-adjacent | Highest sensitivity tier short of formal classification; Mode A only |

## A.7 Reason codes referenced in this paper

| Reason code | Emitted when |
|---|---|
| ERR_ATTESTATION_FAILED | Attestation package does not meet policy floor |
| ERR_ROLE_INVALID | Requested role not in the signed bundle or not permitted for any operation in the request |
| ERR_SCOPE_DENIED | Operation outside role's permitted operations |
| ERR_OPERATION_BLOCKED | Adapter default-deny (e.g., exec.run at standard profile) |
| ERR_NONCE_REPLAY | Envelope nonce has already been consumed for this session |
| ERR_TARGET_MISMATCH | Request target does not match envelope's sealed target hash |
| ERR_DEVICE_MISMATCH | Envelope's device fingerprint does not match the admitted device |
| ERR_COUNTER_REGRESSION | Envelope counter regresses or skips |
| ERR_ENVELOPE_EXPIRED | Envelope's expiresAt is in the past |
| ERR_INTENT_DRIFT | Declared intent class incompatible with operation class |
| ERR_CONTEXT_MANIFEST_INVALID | Referenced manifest hash not registered or contains unregistered elements |
| ERR_MCP_RESPONSE_TAINTED | MCP response contains sanitizer-detected injection pattern |
| ERR_MCP_SERVER_BLOCKED | MCP server not in the signed bundle's trust table |
| ERR_SKILL_UNSIGNED | Skill registration without signature |
| ERR_SKILL_BLOCKED | Skill signed by untrusted signer |
| ERR_DUAL_CONTROL_REQUIRED | Operation requires co-sign; initial submission parked |
| ERR_ENDPOINT_ATTESTATION_FAILED | Mode C requested without valid endpoint attestation identifier |
| ERR_MODE_C_UNAUTHORIZED | Mode C on classified-adjacent classification (denied by construction) |
| ERR_CLASSIFICATION_VIOLATION | Requested mode not in classification's compatibility set |
| ERR_POLICY_BUNDLE_INVALID | Bundle signature does not verify or bundle schema malformed |
| ERR_CONTINUITY_FAILED | Generic continuity check failure (streaming, multi-step operations) |
| ERR_SESSION_REVOKED | Session identifier in revocation set |
| ERR_SESSION_EXPIRED | Session past expiresAt |

## A.8 Franklin et al. category abbreviations used in tables

| Abbrev | Full category |
|---|---|
| CI | Content Injection |
| SM | Semantic Manipulation |
| CS | Cognitive State |
| BC | Behavioural Control |
| Sys | Systemic |
| HITL | Human-in-the-Loop |

---

*End of Appendix A.*
