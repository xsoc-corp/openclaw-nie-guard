# Section 14. Conclusion

*Draft v1.0, Pass 3. Target 400 words.*

---

The AI agent security crisis of early 2026 has its proximate cause in
specific unpatched bugs across specific products, and its structural
cause in the absence of a cryptographic mediation layer between agent
frameworks and the world. Patching the proximate bugs is necessary and
ongoing; it is not sufficient. The structural cause persists across
vendors, across agent frameworks, and across the product categories
that layer on top. A cryptographic mediation architecture is the
correct response.

XSOC-NIE-GUARD is such an architecture. It composes ten named controls
across five planes into a single front door that refuses operations
which fail attestation, policy, continuity, classification, intent,
or audit checks. It treats the agent framework as untrusted, the
model vendor as honest-but-curious, the external content channels as
adversarial, and the administrator as subject to dual-control. Its
strongest structural coverage is in the Franklin et al. Behavioural
Control category, where nineteen evaluation scenarios pass against a
running broker in continuous integration. Its coverage in Content
Injection, Semantic Manipulation, and Cognitive State is present with
named gaps; its coverage of Systemic and Human-in-the-Loop categories
is bounded by what a per-agent mediation layer can provide.

The FHE Context Gate (Section 6) is the hero control. It is what
makes an agent operating on regulated data possible without exposing
that data in cleartext to the model vendor's infrastructure, and it is
the structural response to the Shapira et al. [4] web-use agent
exfiltration benchmark. It is delivered through the XSOC FHE SDK v3.0.0.0
[42], which is a four-layer architecture (entropy-hardened CKKS
backend plus DSKAG deterministic key agreement plus SP-VERSA volatile
memory protection plus NexusKey policy-bound derivation) rather than a
thin wrapper over a public homomorphic encryption library. The
distinction matters: the integrated architecture is what makes an FHE
context gate deployable as an agent mediation control rather than as a
research prototype.

The reference architecture is public under Apache 2.0. The private
production integration uses the same architecture with substituted
cryptographic primitives. The disclosure boundary between them is
mechanically enforced in continuous integration. The paper, the
repository, the twenty-seven scenario attack simulation harness, and
the Franklin taxonomy coverage mapping together constitute an
engagement invitation to the research community and to regulated
buyers. Concrete attacks that the current controls do not address are
requested, and the repository's issue tracker is the canonical channel
for submission.

The structural answer to agent security is not a sufficient answer.
It is a necessary one, and one that has been missing.

---

*End of Section 14.*
