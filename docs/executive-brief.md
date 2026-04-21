# XSOC-NIE-GUARD Executive Brief

**A cryptographic mediation architecture for AI agent systems, with
application to the OpenClaw security crisis.**

**Author:** Richard Blech, Chief Executive Officer and Technical Lead, XSOC Corp
**ORCID:** 0009-0003-4540-2134
**Published:** April 2026
**Full paper:** Zenodo DOI 10.5281/zenodo.19685360
**Reference implementation:** github.com/xsoc-corp/openclaw-nie-guard (Apache 2.0)

---

## The problem

The AI agent security crisis of early 2026 has its proximate cause in
specific unpatched bugs across specific products. Its structural cause is
the absence of a cryptographic mediation layer between agent frameworks
and the world. OpenClaw has accumulated 138 CVEs across five months of
public life, with 135,000 internet-facing instances of which roughly 63
percent run without authentication. Franklin et al. at Google DeepMind
have published a six-category taxonomy of the AI agent attack surface.
Shapira et al. report over 80 percent data exfiltration success against
commodity web-use agents. The class of failure is not a product defect;
it is an architectural gap.

## The architecture

XSOC-NIE-GUARD is a five-plane cryptographic mediation layer with ten
named controls that sits as a single front door between the agent
framework and everything the agent talks to. Plane P1 is device
attestation. Plane P2 is admission with signed-policy-bundle role
authorization and short-time-to-live scoped capability issuance. Plane
P3 is the action mediation where capability verification, runtime
continuity validation, classification and intent enforcement, FHE gate
routing, and MCP boundary mediation compose. Plane P4 is telemetry-
sealed continuity (TSTL envelopes, Context Provenance Chain, Agent
Intent Envelope). Plane P5 is tamper-evident audit via a Providence
hash chain plus three-tier revocation with sub-200-millisecond intra-
region propagation.

## The hero control

The FHE Context Gate (Section 6 of the full paper) routes sensitive
context through the XSOC FHE SDK v3.0.0.0 in one of three modes: full
FHE on ciphertext, tokenized substitution, or attested cleartext
release with dual-control for regulated classifications. The SDK is not
a Microsoft SEAL wrapper; it is a four-layer integrated architecture
composing an entropy-hardened CKKS backend with DSKAG deterministic
key agreement, SP-VERSA volatile memory protection, and NexusKey
policy-bound derivation. Published performance: 40.28 ms encryption,
1.29 ms homomorphic multiplication, 0.58 ms key rotation, 150 of 150
tests passing. The structural claim: an agent operating under Mode A
cannot be coerced into cleartext exfiltration because the cleartext
does not exist in the model's operating scope.

## Evaluation

Nineteen implemented attack scenarios pass in continuous integration,
covering the four Franklin categories (Content Injection, Semantic
Manipulation, Cognitive State, Behavioural Control) at structural
deflection strength. Eight additional scenarios are documented
skeleton placeholders for subsequent release phases (streaming
continuity, bundle forgery detection, encrypted RAG similarity,
honest-but-curious endpoint extraction). Systemic and Human-in-the-
Loop categories are explicitly scoped as requiring ecosystem-level
coordination or product-design work beyond the mediation layer's
enforcement domain.

## What is new

Three contributions distinguish this work from prior agent security
architectures. First, the FHE Context Gate operationalizes homomorphic
encryption as an agent mediation control, not as a research demonstration.
Second, the Agent Intent Envelope binds declared intent class into the
sealed continuity envelope, addressing the specific class of prompt
injection that exploits legitimate capabilities for illegitimate
purposes. Third, the disclosure boundary between public reference
architecture and private production cryptographic primitives is
mechanically enforced in continuous integration, enabling peer review
of the architecture without compromising the underlying proprietary
cryptography.

## Invitation

The reference architecture is Apache 2.0. The attack simulation harness
is deterministic and runs against a local broker. The Franklin taxonomy
coverage mapping is published as a full matrix. Concrete attacks that
the current controls do not address are requested; the public
repository's issue tracker is the canonical channel for engagement.
