# Section 12. Discussion and Limitations

*Draft v1.0, Pass 3. Target 800 words.*

---

## 12.1 What a cryptographic mediation layer cannot solve

The architecture described in this paper addresses the per-agent
cryptographic attack surface. It does not address four classes of
problem that are adjacent to that surface and that deserve explicit
naming rather than implicit exclusion.

**Training-data-level persona drift.** Persona hyperstition, as
catalogued by Franklin et al. [1] under Semantic Manipulation and as
documented empirically in the Claude spiritual bliss attractor state
[13], operates at the model's training and fine-tuning level. A
runtime mediation layer has no access to the training corpus and no
mechanism to detect or prevent drift in the model's base persona.
Intent binding (Section 5.4) and dual-control (Section 8.3) limit
the blast radius of a persona-drifted agent but cannot prevent the
drift itself.

**Ecosystem-level systemic failure modes.** The Franklin et al.
Systemic category covers congestion traps, interdependence cascades,
tacit collusion, compositional fragment traps, and cross-operator
Sybil attacks. The agent economies analysis of Tomašev et al. [11]
is a closer reading of the same territory. These failure modes
require coordination across operator boundaries (shared identity
assertions, cross-operator Providence anchoring, aggregation-level
semantic analysis) that a per-agent mediation layer cannot provide
unilaterally. We have designed the Providence schema with
cross-operator anchoring in mind; cross-operator deployment is out
of scope for this release.

**Human-overseer decision fatigue.** Dual-control and Mode C
approval produce decision surfaces that a human reviewer sees. The
sanitization in Section 7 and the Providence annotation in Section
10 give the reviewer structured information. What the architecture
does not provide is the reviewer's time budget, the reviewer's
training, or the reviewer interface itself. Approval fatigue and
review-ritual degradation (the Franklin Human-in-the-Loop category)
are product-design and operational problems rather than
cryptographic problems.

**Steganographic and perturbation attacks within legitimate media.**
The Context Provenance Chain (Section 5.3) binds content hashes,
which catches binary substitution. Attacks that operate within a
single legitimate image or audio file through adversarial
perturbation are not caught by content hashing. VectorShield
integration (Section 6.4 note on encrypted RAG) is our path for
this class; it is scheduled as future work.

## 12.2 What this architecture deliberately does not claim

Three claims that would be natural for a cryptographic mediation
paper to make and that we deliberately do not make.

We do not claim the architecture prevents prompt injection. Prompt
injection happens at the model's reasoning layer; what we claim is
that structural controls constrain the effects of successful prompt
injection such that exfiltration, scope widening, and misuse of
legitimate capabilities are rejected at the broker regardless of the
injection's success at the model layer. The injection may still
occur; its consequences are bounded.

We do not claim the XSOC FHE SDK's 40.28 ms encryption latency is a
universal performance claim. That figure is from published
validation on reference hardware under specific CKKS parameters
[42]. Production deployment will see different numbers depending on
hardware, parameter choices, and workload shape. We do claim the
architecture's mediation overhead is within the operational budget
for interactive agent flows.

We do not claim end-to-end quantum resistance of the overall system.
The XSOC FHE SDK's DSKAG layer uses symmetric primitives that
provide 256-bit post-quantum security under Grover's algorithm
[42]. The CKKS scheme's underlying Ring Learning With Errors
problem is believed quantum-resistant under current analysis [15,
42]. The non-cryptographic components of the broker (transport,
storage, operational logging) use commodity TLS and commodity
database storage whose quantum posture is not our assertion to
make. A fully quantum-resistant deployment requires the operator
to choose PQ-resistant underlying infrastructure.

## 12.3 Future work

Five extensions are scheduled or under consideration.

**VectorShield integration** for encrypted RAG corpora, with the
Pure Storage DIM deployment as the reference case. This is the
Phase 5 item in the Section 11 skeleton schedule and addresses the
steganographic and RAG-poisoning gaps.

**Cross-operator Providence anchoring.** Publishing the Providence
head hash to a tamper-evident external store at regular intervals
permits cross-operator verification of audit integrity and begins
to address the Systemic category's forensic requirements.

**Hardware-rooted attestation for reviewer endpoints.** Current
dual-control assumes the reviewer's endpoint attestation is itself
trustworthy. Extending attestation to the reviewer side is the
structural answer to reviewer compromise as an attack path.

**Shadow policy runtime and policy bundle forgery detection.**
Scenarios 12, 13, and 18 in Section 11 are skeleton placeholders
for this work. Phase 4 target.

**Multi-modal content sanitization.** Extending the A3 sanitizer
beyond text patterns into image perturbation detection and audio
content analysis. Open research area; no firm schedule.

## 12.4 Invitation

We invite scrutiny of both the coverage claims and the explicit
scope boundaries. The architecture is released under Apache 2.0 as
a reference implementation with a deterministic 27-scenario attack
simulation harness. Researchers and operators with concrete attacks
that the current controls do not address are invited to file
issues, contribute scenarios, or reach out directly. The public
repository is the canonical location for this engagement.

---

*End of Section 12.*
