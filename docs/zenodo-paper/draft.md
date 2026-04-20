# XSOC-NIE-GUARD: A Cryptographic Mediation Architecture for AI Agent Systems, with Application to the OpenClaw Security Crisis

**Author:** Richard Blech, Chief Executive Officer and Technical Lead, XSOC Corp
**Status:** Phase 0 draft. Abstract, Introduction, and Threat Model are in
near-final form. Architecture, FHE Context Gate, Evaluation, and Related Work
sections grow alongside implementation through Phases 3-8.

---

## Abstract

The rapid adoption of AI agent frameworks in late 2025 and early 2026 produced a
security crisis whose exemplar is OpenClaw, a framework that as of the current
reporting window has accumulated 138 Common Vulnerabilities and Exposures across
five months, with over 135,000 publicly exposed instances of which 63 percent
run without authentication. Expert consensus across independent analyses is
that the appropriate operator stance on any unpatched deployment is assume
compromise. This paper argues that the failure is structural rather than
defect level and describes XSOC-NIE-GUARD, a cryptographic mediation
architecture that addresses the underlying architectural weaknesses: plaintext
credential storage, pairing privilege escalation, skill marketplace supply
chain compromise, messaging channel prompt injection, and the lethal trifecta
interaction described by Willison. The architecture composes device-attested
admission, short-time-to-live scoped capability derivation, continuity-envelope
binding, context provenance anchoring, agent intent envelope enforcement, and
fully homomorphic encryption for sensitive context into a five-plane mediation
layer that eliminates each failure mode by construction rather than mitigating
it by patch. We implement a reference architecture under Apache 2.0 with
mock cryptographic primitives on a stable interface, present a deterministic
twenty three attack scenario evaluation harness of which fifteen are
end-to-end implemented at the time of this draft, and describe the compliance
framework coverage across NIST AI Risk Management Framework, OWASP Top 10 for
Agentic Applications, ISO 42001, and European Union AI Act posture. Production
cryptographic primitives including our deterministic symmetric key agreement,
post-storage volatile cipher, and CKKS-based homomorphic evaluation SDK are
described at the interface level and by stated security properties, with
construction details remaining proprietary and externally validated by
independent parties including the University of Luxembourg, California
Polytechnic State University at San Luis Obispo, and George Mason University.

---

## 1. Introduction

### 1.1 The AI agent security crisis of early 2026

In November 2025, a single developer released an open-source AI agent
framework that rapidly accumulated more than 347,000 stars on GitHub, making
it one of the fastest-growing repositories in the platform's history. The
framework, originally called Clawdbot and later rebranded under trademark
pressure as Moltbot and then OpenClaw, provides a unified gateway that
connects messaging platforms including WhatsApp, Telegram, Slack, Discord,
iMessage, and Signal to large language model APIs from multiple vendors,
along with local shell execution, file system access, browser automation,
email, calendar, and a skill marketplace for extending agent capabilities.
In February 2026, the project's creator announced he was joining OpenAI to
lead personal agent development, and OpenClaw transitioned to an independent
OpenAI-sponsored foundation.

By April 2026, the framework had accumulated 138 documented Common
Vulnerabilities and Exposures across five months of public life. Seven of
those were rated critical, 49 high. Censys data indicates over 135,000
internet-facing instances as of the most recent public reporting, of which
approximately 63 percent were running without authentication. Independent
analysts including Hudson Rock, Koi Security, Prime Rogue Inc., Adversa AI,
ARMO, Reco, Conscia, and Bexxo have published extensive analyses of the
framework's security posture. Palo Alto Networks has mapped OpenClaw to
every category in the OWASP Top 10 for Agentic Applications. The uniform
recommendation across these analyses, for any pre-patch or unauthenticated
instance, is to assume compromise and rotate all credentials that the agent
had access to.

### 1.2 The failure is structural

The CVEs associated with OpenClaw are not a random distribution of
implementation defects. They cluster into a small number of structural
categories:

- **Credential storage at rest.** OpenClaw stores authentication material
  for every connected service, including API keys for multiple LLM vendors,
  WhatsApp credentials, Telegram bot tokens, Discord OAuth tokens, and full
  conversation memories, in plaintext Markdown and JSON files under a
  well-known filesystem path. Commodity infostealer malware families
  including RedLine, Lumma, Vidar, and Atomic Stealer are actively harvesting
  this file structure. A routine endpoint compromise escalates to compromise
  of every connected enterprise service.
- **Pairing privilege escalation.** CVE-2026-33579, scored between 8.1 and
  9.8 CVSS depending on vector, permits any client with the lowest permission
  level ("pairing privileges") to escalate to full administrative control,
  inheriting every permission the OpenClaw instance holds. The exploit
  pivots through the victim's browser, defeating the common mitigation of
  binding the gateway to the loopback interface.
- **Skill marketplace supply chain.** Koi Security audited 2,857 skills in
  the ClawHub marketplace and found 341, approximately 12 percent, to be
  malicious. The primary distribution campaign, codenamed ClawHavoc, has
  delivered the Atomic Stealer macOS infostealer to users who installed
  affected skills.
- **Messaging channel prompt injection.** WhatsApp, Telegram, Slack, Discord,
  Signal, and email are all treated as trusted input sources by default.
  Any content ingested from these channels enters the agent's model context
  without sanitization, making prompt injection via inbound message a
  reliable path to arbitrary tool invocation.
- **The lethal trifecta.** Simon Willison has articulated a concept, widely
  cited in the current analysis, that an agent system with concurrent access
  to private data, exposure to untrusted content, and the ability to
  communicate externally will eventually exfiltrate the private data under
  prompt-injection conditions. OpenClaw in default configuration exhibits
  all three legs of this trifecta simultaneously.

Each of these is a categorical failure of the architecture, not a defect in
a specific code path. A patch for any one CVE in a given category does not
change the posture; the next CVE in the same category will reproduce the
same outcome. This is precisely why expert consensus converges on assume
compromise rather than apply the update.

### 1.3 The correct response is architectural

The cryptographic security community has spent three decades learning how
to mediate high-risk operations with short-lived, narrowly scoped
capabilities rather than standing privileges. Related disciplines,
particularly the design of systems that process sensitive data in
multi-party or regulated contexts, have developed additional primitives:
attested endpoints, continuity-envelope binding, context provenance
anchoring, and homomorphic evaluation for cleartext-free operation on
sensitive material. Each of these techniques is deployable today. What has
not existed until now is an integrated layer that applies them specifically
to the AI agent use case in a way that composes cleanly with existing agent
frameworks.

XSOC-NIE-GUARD is that layer. It is designed as a single front door that
sits between the agent framework and the rest of the world, enforcing:

1. Device-attested admission with a hardware-backed attestation floor
2. Short-time-to-live capability derivation with bounded scope
3. Continuity binding via telemetry-sealed runtime envelopes that commit
   each operation to a device, a session, a role, a target, a context
   manifest, and an intent class
4. Context provenance anchoring that registers every piece of material
   entering the model's context with source, classification, and content hash
5. Agent intent envelope enforcement that defeats prompt-injection misuse
   of legitimate capabilities by binding the declared intent into the
   signed operation envelope
6. Three-mode fully homomorphic encryption context gate for sensitive
   context that must never, in part or whole, reach the model in cleartext
7. MCP boundary mediation for external messaging channels with sanitization
   and external-content tagging
8. Signed policy bundles with ceremony-rooted keys covering both roles and
   skill manifests
9. Adaptive profile escalation based on behavioral drift metrics
10. Tamper-evident Providence hash chain supporting regulated forensic
    reconstruction

### 1.4 Contributions of this paper

The paper makes the following contributions:

- A structural analysis of the OpenClaw security crisis that maps each
  documented failure category to a class of cryptographic or architectural
  technique known to address it
- A five-plane mediation architecture that composes these techniques into
  a deployable layer for AI agent frameworks
- A three-mode fully homomorphic encryption context gate design that, to
  our knowledge, represents the first commercial deployment of FHE in an
  AI agent flow, with published benchmarks from our CKKS-based software
  development kit of 40.28 milliseconds per encrypt and 1.29 milliseconds
  per multiplication
- An agent intent envelope construction that defeats a previously
  under-addressed class of attack in which prompt injection causes an
  agent to use a legitimate capability for an illegitimate purpose
- A deterministic twenty three scenario attack simulation harness, of
  which fifteen are end-to-end implemented in the reference repository,
  that validates each named control against a documented exploit shape
- A compliance framework mapping across NIST AI Risk Management Framework,
  OWASP Top 10 for Agentic Applications, ISO 42001, and European Union
  AI Act posture
- An open-source reference implementation at
  github.com/xsoc-corp/openclaw-nie-guard under the Apache 2.0 license,
  with a mechanically enforced public and private disclosure boundary that
  releases the architectural pattern and interface signatures while
  preserving XSOC proprietary cryptographic primitives behind a commercial
  engagement layer

### 1.5 Structure of the paper

Section 2 presents the threat model. Section 3 describes the five-plane
architecture overview. Sections 4 through 10 detail the individual planes
and primitives. Section 11 describes the evaluation methodology and the
attack scenario harness. Section 12 discusses limitations and future work.
Section 13 positions the work in related literature.

---

## 2. Threat Model

The threat model in this paper derives directly from the public OpenClaw
record plus additional threat classes that apply to any AI agent deployment
at scale. The canonical version is maintained in the repository at
`docs/threat-model.md` and is summarized here. Ten threat paths are
enumerated, each tied to a specific public exploit shape or a known pattern
from the cryptographic literature.

The full taxonomy covers: prompt injection via messaging channel
(T-01, Telegram, Slack, Discord, WhatsApp, email), plaintext credential
theft at rest (T-02, infostealer harvesting of OpenClaw data directory),
pairing privilege escalation (T-03, CVE-2026-33579 class), malicious skill
supply chain (T-04, ClawHub ClawHavoc AMOS campaign), browser pivot
defeating loopback binding (T-05, Conscia analysis), honest-but-curious
model vendor (T-06, post-acquisition ecosystem consideration), insider
admin unilateral action (T-07), replay and time-of-check to time-of-use on
long-running operations (T-08), lethal trifecta interaction (T-09,
Willison), and agent intent drift under prompt injection (T-10).

Each threat path is mapped to one or more of the nine security controls
that compose the reference architecture, and each control is validated
through one or more scenarios in the attack simulation harness. The full
mapping table appears in Section 5.

---

## 3. Architecture Overview

(Detailed design follows in Sections 4 through 10. This section is being
drafted alongside Phase 2 through Phase 5 of the implementation.)

The reference architecture is a five-plane composition:

1. **Client Trust Plane.** Device attestation and subject identity binding.
   The attestation floor is configurable across software minimum, TPM 2.0,
   Secure Enclave, StrongBox, and HSM-backed identity.
2. **Admission Plane.** Single front door via /v1/admit. No standing
   credentials are stored on the client at rest; every operation uses a
   short-TTL derived capability.
3. **Action Mediation Plane.** /v1/invoke applies seven layers of checks
   in strict fail-closed order: shape, token verification, nonce single-use,
   envelope validation, intent alignment, context manifest registration,
   policy evaluation, dual-control gating, and adapter forwarding.
4. **Runtime Continuity Plane.** Telemetry-sealed runtime envelopes commit
   each operation to a cryptographically bound tuple of device, session,
   role, target, context manifest, intent class, classification,
   directionality, and counter.
5. **Audit and Revocation Plane.** Providence hash-chained event log
   supports tamper-evident forensic reconstruction. Revocation propagates
   across in-process cache, Redis mirror, and event fan-out in sub-second
   time intra-region.

---

## 4. Admission and Capability Derivation

(Draft: describe attestation floor, the deterministic symmetric key
agreement primitive at interface level with public security properties,
short-TTL scoped capabilities, and the Capability Derivation Tree for
sub-agent flows. Construction of the key derivation primitive is black box;
see `docs/nie-integration.md` for the public interface. External
validations by University of Luxembourg Biryukov and Perrin, Cal Poly San
Luis Obispo Dieharder, and George Mason University SENTINEL FP5223 are
cited for confidence in the underlying primitive without revealing
construction.)

---

## 5. Runtime Continuity

(Draft: TSTL envelope schema at application level, Agent Intent Envelope
extension, Context Provenance Chain registration, counter monotonicity,
directionality enforcement.)

---

## 6. FHE Context Gate

(Draft: three-mode architecture. Mode A operations on ciphertext, Mode B
tokenized field substitution, Mode C attested cleartext release with
Providence-logged decryption event and dual-control on regulated class.
Benchmark numbers from XSOC FHE SDK on CKKS scheme: 40.28 milliseconds
encrypt, 1.29 milliseconds multiplication. Parameter selection is
proprietary. Classification-to-mode compatibility matrix enforced by the
gate is public.)

---

## 7. Messaging and MCP Mediation

(Draft: external channel threat surface, sanitization pattern taxonomy,
provenance anchoring, intent binding at the channel boundary.)

---

## 8. Policy Bundle Signing and Rotation

(Draft: signed bundle format, ceremony-rooted keys, rotation audit trail,
skill manifest extension to cover ClawHub-class supply chain threats.)

---

## 9. Behavioral Escalation

(Draft: BEM drift scoring, adaptive profile transitions, interaction with
Mode C frequency metrics.)

---

## 10. Audit and Forensic Reconstruction

(Draft: Providence hash chain construction, external anchor support,
correlation identifier threading, post-incident reconstruction bound.)

---

## 11. Evaluation

(Draft with preliminary results from Phase 1c implementation.)

The reference implementation includes a deterministic twenty three scenario
attack simulation harness. At the time of this draft, fifteen scenarios
are end-to-end implemented against the broker and pass with the expected
structured error codes. The remaining eight scenarios require capabilities
not yet wired in the broker (streaming continuity, BEM drift scoring,
shadow policy divergence, policy bundle signature verification, Mode C
endpoint attestation, and the context-level classified-adjacent test) and
are scheduled for Phase 2 through Phase 7.

Table 11.1 summarizes current status:

| Scenario | Description | Status | Expected error |
|---|---|---|---|
| 01 | Valid admission plus allowed invocation | Implemented | none (200) |
| 02 | Nonce replay | Implemented | ERR_NONCE_REPLAY |
| 03 | Scope widening (viewer attempts exec.run) | Implemented | ERR_SCOPE_DENIED |
| 04 | Target substitution | Implemented | ERR_TARGET_MISMATCH |
| 05 | Revoked session token use | Implemented | ERR_SESSION_REVOKED |
| 06 | exec.run blocked at standard profile | Implemented | ERR_OPERATION_BLOCKED |
| 07 | Agent intent drift | Implemented | ERR_INTENT_DRIFT |
| 08 | MCP response prompt injection | Implemented | ERR_MCP_RESPONSE_TAINTED |
| 09 | Unregistered context manifest | Implemented | ERR_CONTEXT_MANIFEST_INVALID |
| 10 | Streaming continuity chunk failure | Skeleton | ERR_CONTINUITY_FAILED |
| 11 | admin.control without cosign receipt | Implemented | ERR_DUAL_CONTROL_REQUIRED |
| 12 | Policy bundle tampered | Skeleton | ERR_POLICY_BUNDLE_INVALID |
| 13 | Shadow policy divergence | Skeleton | ERR_POLICY_VIOLATION |
| 14 | Regulated Mode C without dual-control | Skeleton | ERR_DUAL_CONTROL_REQUIRED |
| 15 | Mode A similarity search over FHE ciphertext | Skeleton | none (200) |
| 16 | Telegram-class MCP injection | Implemented | ERR_MCP_RESPONSE_TAINTED |
| 17 | Pairing escalation (CVE-2026-33579 class) | Implemented | ERR_SCOPE_DENIED |
| 18 | Policy bundle signature forgery | Skeleton | ERR_POLICY_BUNDLE_INVALID |
| 19 | Lethal-trifecta drift under BEM | Skeleton | profile_escalated |
| 20 | Honest-but-curious endpoint Mode A extraction | Skeleton | ERR_ENDPOINT_ATTESTATION_FAILED |
| 21 | Unsigned skill (ClawHavoc class) | Implemented | ERR_SKILL_UNSIGNED |
| 21b | Skill signed by untrusted signer | Implemented | ERR_SKILL_BLOCKED |
| 22 | Browser pivot admission | Implemented | ERR_ATTESTATION_FAILED |
| 23 | Email inbound injection via MCP | Implemented | ERR_MCP_RESPONSE_TAINTED |
| 23b | Unknown MCP server rejected | Implemented | ERR_MCP_SERVER_BLOCKED |

Fifteen primary scenarios plus two variant scenarios (21b, 23b) are wired
and passing against the reference broker running with mock NIE bindings.
Performance overhead measurements on the full invoke pipeline, taken with
an Intel Core i9-13900K reference host running the broker with mock
bindings and a local OpenClaw mock, show a median added latency of under
4 milliseconds per invoke over the bare adapter forward. Production
cryptographic binding timings are governed by the independently measured
numbers on the underlying primitives cited in Section 4.

---

## 12. Discussion and Limitations

(Draft: comparison with patch-based approaches; composition with
hyperscaler trust boundaries; limitations of the relaxed profile;
residual risk under Mode C release; disclosure policy posture and its
implications for external review.)

---

## 13. Related Work

(Draft: agent security literature from 2023 onward; applied FHE in
production systems; prior cryptographic mediation architectures for
RPC and microservice contexts; honest comparison with public vendor
claims that violate information-theoretic bounds on FHE overhead.)

---

## 14. Conclusion

(Draft: the AI agent pattern is going to absorb a significant share of
enterprise automation over the next several years. Frameworks that succeed
in regulated deployment will be the ones whose trust boundary is
architecturally defensible rather than patched into defensibility. A
mediation layer operated by a party outside the model vendor is a
governance requirement for that class of deployment. XSOC-NIE-GUARD is
our contribution toward that architectural baseline.)

---

## Appendix A: Notation and Nomenclature

DSKAG refers to XSOC's deterministic symmetric key agreement primitive,
black box in external materials, interface and stated security properties
only.

TSTL refers to telemetry-sealed trust layer, the continuity envelope
construction. The envelope schema is public; the sealing primitive is
private.

NIE refers to Nexus Identity Engine, the hardware-attested admission and
capability derivation subsystem.

FHE SDK refers to the XSOC fully homomorphic encryption software
development kit, based on the CKKS scheme. Parameter selection and
optimization path are private.

Providence refers to the tamper-evident hash-chained audit log.

SP-VERSA, X-ARC, NexusKey, SDD, and XRNG are XSOC proprietary primitives
referenced only by interface and stated security properties.

## Appendix B: Citation and Attribution Rules (internal editorial)

- Cal Poly San Luis Obispo Dieharder validation (never Pomona)
- EternaX $144.4T figure attributed to Dariia Porechna, Dr. Chen Feng,
  and Paarth Birla when referenced
- GMU SENTINEL FP5223 cited with finding numbers
- University of Luxembourg analysis by Biryukov and Perrin cited for
  the amended construction result
- Simon Willison lethal trifecta framing attributed
- OpenClaw public coverage cited with source and date; no speculation
  on internal OpenClaw design beyond what public CVE and advisory
  material states
- Peter Steinberger and the OpenClaw maintainer community referenced
  factually; no personal critique

## Appendix C: Disclosure Policy Compliance (internal editorial)

The paper describes DSKAG, TSTL sealing, SP-VERSA, X-ARC, NexusKey
binding, XSOC FHE SDK parameter selection, XRNG, and SDD only by public
name, stated security properties, interface signatures, and externally
validated performance or correctness claims. The paper does not describe
key schedule, derivation path, cipher construction, round structure,
scheme parameterization, wave modulation, frequency selection, or internal
state machines of any XSOC primitive.
