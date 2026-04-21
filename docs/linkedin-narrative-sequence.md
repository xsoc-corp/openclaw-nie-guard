# LinkedIn Narrative Sequence — XSOC-NIE-GUARD Release

Four-post arc paired with the Zenodo preprint. Day 0 is preprint publish date.
All posts under the 1,250-character limit. Narrative prose, no bullets. No em-dashes,
no AI-tell phrases, no competitor callouts. Signed by Richard Blech.

---

## Post 1 — Day 0 (release announcement)

**Character count: 1,174**

```
Today I am releasing a paper on Zenodo that describes an architectural response to
the AI agent security crisis of early 2026. The paper is titled XSOC-NIE-GUARD: A
Cryptographic Mediation Architecture for AI Agent Systems, and the motivating case
is the public record on OpenClaw. One hundred thirty eight CVEs in five months,
over one hundred thirty five thousand exposed instances, and expert consensus that
the correct operator stance on any unpatched deployment is assume compromise.

The paper argues that the failure is structural rather than defect level. Plaintext
credential storage, pairing privilege escalation, skill marketplace supply chain,
messaging channel injection, and the lethal trifecta identified by Simon Willison
are not separate bugs. They are the same architecture producing the same outcome
under different names.

Palo Alto mapped OpenClaw to every category in the OWASP Top 10 for Agentic
Applications. We believe a patch for any one of those categories does not change
the posture. A mediation layer does.

DOI: 10.5281/zenodo.19685360
Companion reference implementation under Apache 2.0 at github.com/xsoc-corp/openclaw-nie-guard

Tagging peers working in this space: Roberto Avanzi, Diego Aranha. Thoughts welcome.
```

**Tags (in comment thread):** Roberto Avanzi, Diego Aranha, OWASP AI Exchange,
Simon Willison if appropriate.

---

## Post 2 — Day +3 (FHE technical focus)

**Character count: 1,202**

```
A follow-on note on XSOC-NIE-GUARD. The hero primitive is what we call the FHE
Context Gate. It has three modes.

Mode A routes the operation through ciphertext. Embedding similarity, vector
aggregations, structured numerical operations. The model endpoint never sees
cleartext. Published numbers on our FHE SDK: 40.28 milliseconds per encrypt,
1.29 milliseconds per multiplication, CKKS scheme.

Mode B substitutes sensitive fields with opaque tokens before the context reaches
the model. The model sees tokens, not values.

Mode C releases cleartext only with endpoint attestation, policy approval, and a
Providence logged decryption event. Regulated classification requires dual control.
Classified adjacent is Mode A only, no exceptions.

I am aware that other vendors have claimed zero overhead FHE in similar contexts.
I would encourage readers to check the math. Any honest construction produces the
kind of numbers above or worse. Publishing real numbers is how this community
should operate.

To my knowledge this is the first commercial deployment of FHE in an AI agent flow.
We would welcome peer review of the construction and the benchmarks.

Preprint DOI in prior post. Implementation under Apache 2.0.
```

---

## Post 3 — Day +7 (compliance framework coverage)

**Character count: 1,225**

```
A third note on XSOC-NIE-GUARD for the compliance and regulated buyer audience.

The architecture was built to map onto the frameworks regulated buyers actually
use. NIST AI Risk Management Framework functions map to the threat model,
classification taxonomy, Providence metrics, profile escalation, and signed
policy bundles. OWASP Top 10 for Agentic Applications categories map one for
one to named controls, and the mapping is in the companion paper. ISO 42001
obligations for access control, incident logging, and management review map to
the policy bundle ceremony, the Providence chain, and the release review
process. EU AI Act obligations for data governance, record keeping, and human
oversight map to the classification schema, the Providence chain, and the dual
control mechanism.

For US federal buyers, attestation floor selection supports IL4 and IL5
posture. Independent validations of the underlying components come from the
University of Luxembourg audits by Perrin and Biryukov (2020 and 2024, on the
legacy cryptosystem predating DSKAG, with mandatory findings incorporated),
Cal Poly San Luis Obispo Dieharder v3.31.1 at 99.4 percent aggregate across
98 tests, and George Mason University SENTINEL FP5223 (full report June 2026).

Full compliance map in the paper appendix. Happy to talk with teams evaluating
agent frameworks in regulated contexts.
```

---

## Post 4 — Day +14 (reflection and forward look)

**Character count: 1,214**

```
A closing thought on the XSOC-NIE-GUARD release.

When the OpenClaw security record became undeniable over the last several months,
the honest question for those of us who work on cryptographic infrastructure was
whether we had anything to contribute. The answer the team at XSOC arrived at is
yes, and the paper and the reference implementation are our attempt to do so in
public.

There is a larger pattern here worth naming. AI agent frameworks are going to
absorb a significant share of enterprise automation over the next several years.
The frameworks that win will be the ones that can be adopted in regulated
environments, which means the ones that can answer the question of where the
trust boundary sits and who can be held accountable for what crosses it.

A mediation layer operated by a party outside the model vendor is not optional
for that class of deployment. It is a governance requirement. This is the theme
of my book The Cognitive War, and it is the theme of XSOC's product roadmap.

Thank you to the collaborators and reviewers who contributed to this work.
We are continuing to develop it and welcome serious engagement from teams
building in this space.

DOI and repository in prior posts. Open to technical conversations.
```

---

## Timing coordination

- Post 1 goes live the same calendar day the Zenodo DOI resolves publicly
- Post 2 goes 72 hours later, mid-morning Pacific for peak engagement
- Post 3 goes one week after Post 1, scheduled for Tuesday or Wednesday
- Post 4 goes two weeks after Post 1

## Reply strategy

- Respond to technical questions from cryptographers substantively
- For competitor provocations, do not engage in kind; redirect to published
  numbers and independent validations
- For buyer inquiries, move to direct message quickly; do not publish pricing
  or customer names in public thread
- For journalist inquiries, refer to XSOC comms; do not comment on OpenAI
  relationship status publicly regardless of whether engagement is active

## Visual assets

Optional single-image assets for each post. Suggestions:

- Post 1: architecture diagram from the paper, one frame showing the five planes
- Post 2: a plotted benchmark chart of FHE encrypt and multiply times
- Post 3: the compliance map table rendered as a clean graphic
- Post 4: the book cover of The Cognitive War, or a text-only card with the
  closing paragraph pulled out

## Hard constraints reminder

No em-dashes anywhere. No AI-tell phrases. No mention of competitor names in the
posts themselves. No customer names in public posts. Cal Poly San Luis Obispo,
never Pomona. EternaX figure cited only when attributed to Dariia Porechna,
Dr. Chen Feng, and Paarth Birla together, and not used in these posts by default.
