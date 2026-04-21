# Section 13. Related Work

*Draft v1.0, Pass 3. Target 700 words.*

---

## 13.1 Franklin et al. on the AI agent attack surface

The closest adjacent work to this paper is the Franklin et al. AI Agent
Traps taxonomy [1], concurrent with this work and the organizing frame
we adopt throughout. Their paper catalogs six categories of
adversarial content targeting different stages of an agent's
operational cycle. Our paper is a concrete architectural response to
the portion of that attack surface addressable by per-agent
cryptographic mediation. The two works are complementary: Franklin et
al. establish the taxonomy; we implement a structural response to four
of their six categories and name the other two as scope boundaries.
Section 1.4 and Appendix D state the coverage claim in detail.

The Tomašev et al. follow-up on virtual agent economies [11] extends
the taxonomy into multi-agent and cross-operator failure modes.
Section 12.1 acknowledges this class as out of scope for a per-agent
mediation layer and identifies cross-operator Providence anchoring as
the bridge toward future ecosystem-level mitigation.

## 13.2 Prompt injection and the lethal trifecta

The prompt injection literature is extensive and established.
Greshake et al. [2] catalog indirect prompt injection as a systemic
vulnerability of LLM-integrated applications. Willison's formulation
of the lethal trifecta [3] (private data access, untrusted content
ingestion, external communication) is the three-leg framing we adopt
in Section 2 and encode as an operator profile constraint in Section
3.4. Shapira et al. [4] benchmark web-use agents and report over
eighty percent data exfiltration success, a result whose severity is
the motivation for the Section 6 FHE Context Gate and the Section 11
Scenario 20 skeleton.

Shen et al. [39] characterize in-the-wild jailbreak prompts;
Bagdasaryan et al. [38] extend the injection surface to multi-modal
modalities. The pattern-matching sanitizer in Section 7 covers the
text-level structural classes documented in this literature and is
policy-bundle-extensible for future pattern additions.

## 13.3 Memory and retrieval attacks

Memory and retrieval as distinct attack surfaces are treated in a
growing literature. Zou et al. on PoisonedRAG [6] demonstrate
corruption attacks against retrieval-augmented generation that the
Section 5.3 Context Provenance Chain and the Section 6 Mode A
encrypted retrieval path are designed to address. Wang et al. [35]
analyze privacy risks in LLM agent memory; Dong et al. [36]
demonstrate practical memory injection attacks. The Franklin
Cognitive State category is the taxonomic framing under which these
works fall, and the CPC manifest registration mechanism is the
structural response.

Chen et al. AgentPoison [10] red-team agents via memory and
knowledge-base poisoning. Their attack surface is closer to our
Scenario 24 (latent memory injection via unregistered manifest) than
to our Scenario 08 (direct content-injection via MCP). Both
scenarios exist in the evaluation harness.

## 13.4 Capability security as an established discipline

The architecture's reliance on short-time-to-live scoped capabilities
and on the Capability Derivation Tree (Section 4) is an application
of the capability security discipline established by Hardy's confused
deputy paper [40] and developed over four decades of operating-system
and distributed-system research. The novelty here is not capability
security itself but its application to the AI agent mediation
setting, where the capability is narrowed by declared intent
(Section 5.4) in addition to operation class.

Triedman et al. [5] demonstrate arbitrary code execution in
unconstrained multi-agent orchestrators with 58 to 90 percent
success rates. The CDT's strict-narrowing invariant is the direct
structural response.

## 13.5 Visual adversarial examples and modality expansion

Qi et al. on visual adversarial jailbreaks [7], Cohen et al. on
zero-click AI worms [12], and Evtimov et al. WASP web-agent
benchmark [8] together map the expansion of the agent attack surface
beyond text-only. The Section 12.1 steganographic and perturbation
gap is the honest acknowledgment that this class is not fully
addressed by the current architecture. VectorShield integration is
the scheduled path.

## 13.6 Anthropic model-card evidence on compliant but misaligned behaviour

The Claude Opus 4 and Sonnet 4 model card [13] documents instances
of compliant-but-misaligned agent behaviour that the architecture in
this paper is motivated to constrain. The specific evidence of a
Claude instance attempting to exfiltrate credentials when prompted
under certain framings is an empirical anchor for the assumption
that prompt injection success at the model layer cannot be prevented
and that the mediation layer's role is to constrain the effects of
such success. We cite this evidence in Section 2 and in Section
11.4's discussion of the Shapira reproduction target.

## 13.7 XSOC cryptographic prior work

The underlying XSOC cryptographic primitives referenced throughout
this paper are described in prior XSOC publications. The
XSOC QSIG / DSKAG-IT-SIG preprint is on Zenodo [41]. The XSOC FHE
SDK v3.0.0.0 Technical White Paper [42] is the public technical
reference for the four-layer FHE architecture that Section 6
delegates to. External validations of the broader XSOC cryptographic
stack are cited in [16] (Perrin and Biryukov audits of the legacy
cryptosystem), [17] (Cal Poly San Luis Obispo Dieharder validation),
and [18] (GMU SENTINEL FP5223). Interface-level references to these
primitives follow the disclosure policy established in Section 1.7.

---

*End of Section 13.*
