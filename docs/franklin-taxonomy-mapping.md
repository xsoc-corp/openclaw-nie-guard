# Mapping XSOC-NIE-GUARD Controls to the Franklin et al. (2026) Agent Traps Taxonomy

**Reference:** Franklin, M., Tomašev, N., Jacobs, J., Leibo, J. Z., and Osindero, S. (2026). *AI Agent Traps*. Google DeepMind. SSRN 6372438.

**Purpose:** This document maps each category in the Franklin et al. taxonomy to the specific XSOC-NIE-GUARD controls that address it, identifies residual gaps honestly, and positions the two works as complementary. The Franklin paper is a taxonomy of the attack surface. XSOC-NIE-GUARD is a cryptographic mediation architecture that implements structural controls against that surface.

**Summary:** XSOC-NIE-GUARD provides strong or medium coverage for four of the six categories (Content Injection, Semantic Manipulation, Cognitive State, Behavioural Control). Systemic Traps are largely out of scope as they require ecosystem-level coordination beyond per-agent mediation. Human-in-the-Loop Traps have partial coverage via dual-control.

---

## Category 1: Content Injection Traps (Target: Perception)

Franklin et al. identify four vectors: web-standard obfuscation, dynamic cloaking, steganographic payloads, and syntactic masking.

| Vector | XSOC-NIE-GUARD Control | Strength |
|---|---|---|
| Web-standard obfuscation (CSS, HTML comments, aria-label injection) | A3 MCP Boundary Mediation sanitizer detects known injection patterns; A4 Context Provenance Chain tags content source and classification; external-channel content is never trusted as system context | Strong |
| Dynamic cloaking (agent-served trap content) | A3 plus A4 content hash registration; replayed fetches produce hash mismatches that Providence records | Strong |
| Steganographic payloads in media (pixel-level perturbations) | A4 content hash binds the exact binary. Perturbation-based attacks that operate within a single legitimate image are NOT caught by content hashing alone and require image-level anomaly detection. | Partial. Gap acknowledged. |
| Syntactic masking (Markdown, LaTeX, anchor text) | A3 sanitizer can be extended with Markdown-aware and LaTeX-aware pattern matching. Current patterns catch text-level injection; formatting-language cloaking is scheduled work. | Partial |

**Representative attack scenario in the reference repository:** Scenarios 08, 16, and 23 exercise content injection via messaging channels. Extension to scenarios 08b and 16b covering steganographic and syntactic-masking vectors is scheduled for Phase 6.

---

## Category 2: Semantic Manipulation Traps (Target: Reasoning)

Franklin et al. identify three vectors: biased phrasing and framing, oversight and critic evasion, and persona hyperstition.

| Vector | XSOC-NIE-GUARD Control | Strength |
|---|---|---|
| Biased phrasing, framing, contextual priming | A2 Agent Intent Envelope binds the declared intent class into the sealed envelope before action. Framing-induced drift in the agent's plan must manifest as an intent class that does not match the operation class, which the adapter rejects. A9 BEM detects persistent drift patterns across sessions. | Strong |
| Oversight and critic evasion | A6 Dual-Control requires co-signed receipts from a distinct attested principal. A compromised critic cannot unilaterally approve a high-risk action. A10 Signed policy bundles mean critic models are themselves subject to signed bundle registration. | Strong |
| Persona hyperstition | Out of scope for runtime mediation. Hyperstition operates through the model's training data and base persona, not through operations the broker can see. Acknowledged as a model-vendor concern. | Gap. Out of scope. |

**Note on persona hyperstition:** This is the most interesting novel concept in the Franklin paper. It deserves explicit scoping in our Zenodo paper as a threat class that a runtime mediation layer cannot address structurally. Our honest claim is that XSOC-NIE-GUARD limits the blast radius of a persona-drifted agent through intent binding and dual-control, but cannot prevent the drift itself.

---

## Category 3: Cognitive State Traps (Target: Memory and Learning)

Franklin et al. identify three vectors: RAG knowledge poisoning, latent memory poisoning, and contextual learning traps.

| Vector | XSOC-NIE-GUARD Control | Strength |
|---|---|---|
| RAG knowledge poisoning | VectorShield integration (Tier A in our plan) hardens the RAG pipeline with verified benchmarks showing -0.39 percent overhead. A1 FHE Mode A processes RAG chunks as ciphertext so a compromised endpoint cannot read the corpus. A4 CPC registers every retrieved chunk with classification and provenance. | Strong |
| Latent memory poisoning | Providence hash chain anchors every memory write. Retrieval of a poisoned memory entry produces a Providence event that correlates back to the write timestamp and source, enabling forensic reconstruction. A9 BEM detects anomalous memory reference patterns. | Medium |
| Contextual learning traps (poisoned few-shot demos, reward signals) | A10 Signed policy bundles restrict which demo sources are permitted. Bundle rotation produces a Providence audit trail. In-context demonstrations sourced from external channels are external-classified and subject to A3 sanitization. | Medium |

**Representative attack scenario:** RAG knowledge poisoning is addressed by the VectorShield evaluation track (scheduled Phase 5), including a Pure Storage DIM use case that demonstrates Mode A operation over encrypted RAG corpora.

---

## Category 4: Behavioural Control Traps (Target: Action)

Franklin et al. identify three vectors: embedded jailbreak sequences, data exfiltration traps, and sub-agent spawning traps. This is the category where XSOC-NIE-GUARD has its strongest coverage claims.

| Vector | XSOC-NIE-GUARD Control | Strength |
|---|---|---|
| Embedded jailbreak sequences | A2 Agent Intent Envelope means capability misuse requires intent drift regardless of jailbreak success. A jailbroken agent with a valid capability for tool.invoke still cannot invoke that tool for an illegitimate purpose because the declared intent class is bound into the sealed envelope. A3 MCP sanitizer catches known jailbreak patterns in external content. | Strong |
| Data exfiltration traps | **Strongest claim.** A1 FHE Context Gate Mode A means the model endpoint never sees cleartext. An agent cannot be coerced into exfiltrating data that does not exist in cleartext at the endpoint. TSTL envelope target hash binding prevents redirection to an attacker endpoint. A8 CDT limits derived capabilities so a compromised agent cannot widen scope. | Strong |
| Sub-agent spawning traps | A8 Capability Derivation Tree enforces strict narrowing: child scope must be a subset of parent; child TTL bounded by parent; revoking parent cascades to all children in sub-millisecond time. Every spawn is a Providence event. Triedman et al. 2025 report 58-90 percent success on unconstrained orchestrators; CDT is a direct structural answer. | Strong |

**Representative attack scenarios:** 03, 06, 17 cover scope widening and exec attempts. 21 and 21b cover skill supply chain (a subset of the embedded jailbreak category via ClawHavoc).

**The Shapira et al. 2025 data exfiltration benchmark** reports over 80 percent success on five different web-use agents. XSOC-NIE-GUARD Mode A provides a direct structural answer: the exfiltration primitive does not exist in the execution model. This is the single strongest empirical positioning point in our Related Work section.

---

## Category 5: Systemic Traps (Target: Multi-Agent Dynamics)

Franklin et al. identify five vectors: congestion traps, interdependence cascades, tacit collusion, compositional fragment traps, and Sybil attacks. This category is largely out of scope for per-agent cryptographic mediation.

| Vector | XSOC-NIE-GUARD Control | Strength |
|---|---|---|
| Congestion traps (synchronised demand on limited resources) | Ecosystem-level problem. Individual agent rate limiting and BEM correlation detection provide margins; systemic mitigation requires cross-operator coordination. | Gap. Acknowledged future work. |
| Interdependence cascades (feedback loop amplification) | Ecosystem-level problem. Our Providence chain provides per-operator forensic reconstruction but not cascade prevention. | Gap. |
| Tacit collusion (agents synchronising via environmental signals) | Ecosystem-level problem. Signed policy bundles can restrict which signals an agent acts on within a single operator's population; cross-operator collusion requires separate mechanisms. | Gap. |
| Compositional fragment traps (payload split across sources, reconstitutes on aggregation) | Content manifest hashes individual elements. Aggregation-level semantic analysis that detects reconstituted payloads is not present in current architecture. Interesting research direction. | Gap. Acknowledged as future work. |
| Sybil attacks | NIE device attestation at admission limits a single adversary from producing multiple attested identities within our operator's population. Cross-operator Sybil resistance requires ecosystem-level identity coordination. | Partial |

**Honest statement for the Zenodo paper and for buyer conversations:** XSOC-NIE-GUARD addresses the single-agent attack surface by construction. Systemic traps require a complementary layer of ecosystem coordination that we are not providing in this release. The right answer is to name this explicitly rather than over-claim. The Franklin paper itself treats systemic traps as largely theoretical at this point in the agent economy's development, and we can position our work alongside that framing.

---

## Category 6: Human-in-the-Loop Traps (Target: Human Overseer)

Franklin et al. note this as an emerging category with limited current empirical work.

| Vector | XSOC-NIE-GUARD Control | Strength |
|---|---|---|
| Approval fatigue | A6 Dual-Control requires distinct attested principals, which creates natural friction against single-reviewer fatigue. Does not solve UX-level fatigue in a high-volume approval queue. | Partial |
| Agent-mediated social engineering (e.g., malicious hyperlinks in summaries) | A3 MCP output sanitizer catches some patterns. Providence log gives the human reviewer visibility into what the agent processed. | Partial |
| Invisible prompt injections producing faithful malicious "fix" instructions (OECD.AI incident report 2025) | A3 sanitization plus A4 CPC external-channel tagging ensures the reviewer sees the content with provenance annotations. The reviewer can still approve a misleading summary; this is a product-design concern. | Partial |

**Product-design implication:** The Human-in-the-Loop category highlights that some defenses are UX concerns rather than cryptographic concerns. The XSOC-NIE-GUARD broker API exposes Providence events and classification annotations that a well-designed review UI can surface; we do not provide the UI itself.

---

## Summary Table

| Franklin Category | Coverage | Notes |
|---|---|---|
| Content Injection | Strong / Partial | Multi-modal steganography is a gap; text-level vectors well covered |
| Semantic Manipulation | Strong / Out of scope | Framing and critic evasion covered; persona hyperstition is training-time |
| Cognitive State | Strong / Medium | VectorShield plus Mode A is strong for RAG; memory and in-context are medium |
| Behavioural Control | Strong | Our strongest category; Mode A and CDT are direct answers |
| Systemic | Out of scope | Per-agent mediation does not prevent ecosystem failure modes |
| Human-in-the-Loop | Partial | Cryptographic controls help; product UI must do the rest |

**Bottom line:** XSOC-NIE-GUARD provides structural controls against four of six categories. The remaining two are honestly scoped as ecosystem coordination and training-time concerns that require complementary infrastructure. We cite Franklin et al. as foundational framing and position our work as a concrete architectural response to the subset of their taxonomy that per-agent cryptographic mediation can address.

---

## Recommended citation in the Zenodo paper

Add to Related Work section:

Franklin et al. (2026) provide the first comprehensive taxonomy of the AI agent attack surface under the rubric of Agent Traps, classifying six categories of environmental adversarial content that target different stages of an agent's operational cycle. XSOC-NIE-GUARD implements structural controls against four of those six categories by construction: content injection is contained by MCP boundary mediation and context provenance anchoring; semantic manipulation targeting reasoning is contained by agent intent envelope binding; cognitive state traps on memory and retrieval are contained by VectorShield integration and Providence audit anchoring; and behavioural control traps including the data exfiltration and sub-agent spawning vectors are contained by our fully homomorphic encryption context gate and capability derivation tree respectively. We acknowledge that systemic traps in the multi-agent dynamics category and human overseer fatigue patterns remain largely outside the scope of per-agent cryptographic mediation and require complementary ecosystem-level coordination which we leave as future work. We believe the two works are complementary: Franklin et al. name the attack surface, and XSOC-NIE-GUARD provides a deployable architecture that implements structural defenses against the categories where cryptographic mediation is the correct shape of response.
