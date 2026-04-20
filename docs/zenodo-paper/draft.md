# Zenodo Paper Draft

**Working title:** XSOC-NIE-GUARD: A Cryptographic Mediation Architecture for AI Agent Systems, with Application to the OpenClaw Security Crisis

**Author:** Richard Blech, Chief Executive Officer and Technical Lead, XSOC Corp

**Status:** Phase 0 outline. Threat model section below is the first content to land,
drawn from `docs/threat-model.md`. Remaining sections grow alongside implementation.

## Abstract (draft)

The rapid adoption of AI agent frameworks in late 2025 and early 2026 produced a
security crisis whose exemplar is OpenClaw, a framework that as of the current
reporting window has accumulated 138 Common Vulnerabilities and Exposures across
five months, with over 135,000 publicly exposed instances of which 63 percent run
without authentication. Expert consensus on the appropriate operator stance is
"assume compromise." This paper describes XSOC-NIE-GUARD, a cryptographic mediation
architecture that addresses the structural weaknesses underlying this class of
failure: plaintext credential storage, pairing privilege escalation, skill supply
chain compromise, messaging channel injection, and the lethal trifecta interaction
described by Willison. The architecture composes device-attested admission,
short-TTL capability derivation, continuity-envelope binding, context provenance
anchoring, and fully homomorphic encryption for sensitive context into a five-plane
mediation layer that eliminates each failure mode by construction rather than
mitigating it by patch. We evaluate the architecture against twenty three attack
scenarios and document performance characteristics.

## 1. Introduction

[Draft in Phase 8.]

## 2. Threat Model

See `docs/threat-model.md` (this repo). Moved into this paper in canonical form
in Phase 8.

## 3. Architecture Overview

Five-plane composition documented in `docs/architecture.md`. Paper version expands
with formal state descriptions and invariants.

## 4. Admission and Capability Derivation

NIE attestation at the admission edge. Short-TTL capability derivation with
bounded-scope Capability Derivation Tree for sub-agent flows. Construction of
the derivation primitive is described by interface and stated security properties
only; see `docs/nie-integration.md`.

## 5. Runtime Continuity

TSTL envelope fields, Agent Intent Envelope extension, Context Provenance Chain,
counter sequencing, directionality enforcement. Envelope schema documented
publicly; sealing primitive construction is private.

## 6. FHE Context Gate

Three-mode architecture. Classification taxonomy. Mode selection matrix. Published
CKKS benchmark numbers from XSOC FHE SDK: 40.28 ms encrypt, 1.29 ms multiply.
Parameter selection is private.

## 7. Messaging and MCP Mediation

External channel threat surface. Sanitization patterns. Provenance anchoring.
Intent binding at channel boundary.

## 8. Policy Bundle Signing and Rotation

Signed bundle format. Ceremony-rooted keys. Rotation audit trail via Providence.

## 9. Behavioral Escalation

BEM drift scoring. Adaptive profile transitions. Interaction with Mode C frequency.

## 10. Audit and Forensic Reconstruction

Providence hash chain. External anchors. Correlation IDs. Post-incident
reconstruction bound.

## 11. Evaluation

Twenty three attack scenarios with results. Performance overhead measurements.
Compliance framework coverage per `docs/compliance-map.md`.

## 12. Discussion

Comparison to patch-based approaches. Composition with hyperscaler trust
boundaries. Limitations. Future work.

## 13. Related Work

Agent security literature. Applied FHE in production systems. Prior cryptographic
mediation architectures. Honest comparison with vendor claims that violate
information-theoretic bounds.

## 14. Conclusion

[Draft in Phase 8.]

## Citation Attribution Rules (internal)

- Cal Poly San Luis Obispo Dieharder validation (not Pomona)
- EternaX $144.4T figure attributed to Dariia Porechna, Dr. Chen Feng, Paarth
  Birla when referenced
- GMU SENTINEL FP5223 cited with finding numbers
- University of Luxembourg analysis by Biryukov and Perrin cited for the
  amended construction result
- Simon Willison's lethal trifecta framing attributed
- OpenClaw public coverage cited with source and date; no speculation on
  internal OpenClaw design beyond what public CVE and advisory material states

## Black-Box Discipline (internal checklist)

Paper describes DSKAG, TSTL sealing, SP-VERSA, X-ARC, and SDD only by:

- Public name
- Stated security properties
- Interface signatures
- Externally validated performance or correctness claims

Paper does NOT describe:

- Key schedule, derivation paths, or mixing functions
- Cipher construction, round structure, or parameterization
- Wave modulation parameters or frequency selection
- Internal state machines of any cryptographic primitive
- Any detail that would enable reimplementation without licensing
