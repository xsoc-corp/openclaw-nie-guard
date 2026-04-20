# Outreach to Google DeepMind on the AI Agent Traps Taxonomy

**Context:** Franklin, Tomašev, Jacobs, Leibo, and Osindero (2026), *AI Agent Traps*,
SSRN 6372438, Google DeepMind. The paper closes (Section 6, Mitigation Strategies /
Benchmarking and Red Teaming) with an explicit call for the research community to
develop comprehensive evaluation suites and automated red-teaming methodologies that
can probe these vulnerabilities at scale, and for industry to adopt them as standard
practice before deploying agents in high-stakes environments. XSOC-NIE-GUARD's
25-scenario attack simulation harness is a direct concrete response to that call.

**Objective of this outreach:** technical engagement, not commercial engagement.
Outcome states we would welcome, in order of preference:

1. A short video or phone call in which the author(s) review the attack-sim
   harness and comment on whether our scenario coverage tracks the vectors they
   had in mind when writing the taxonomy
2. Citation feedback on how the XSOC-NIE-GUARD Zenodo preprint characterizes their
   taxonomy (so we get the framing right before the paper is finalized)
3. An explicit indication that they are aware of the work, which we would cite
   in future publications
4. Any of the above plus a public post acknowledging the architectural response
   to their research agenda (ideal but not expected)

**What we are NOT asking for:** commercial arrangements, endorsement of XSOC as a
vendor, exclusive review rights, access to unpublished DeepMind work, or any frame
that would compromise the author(s)' institutional neutrality. This outreach is
academic and stays academic throughout.

**Channel strategy:** LinkedIn DM primary, because it is a lightweight contact
surface that does not require guessing institutional email addresses. Email as
follow-up if the recipient responds and shares an address. If both fail after
the sequencing described below, the outreach is parked, not escalated.

---

## Draft A. To Matija Franklin (primary, first author)

**Channel:** LinkedIn DM, then email if they connect and share one
**Subject (for email follow-up):** Follow-up on AI Agent Traps (SSRN 6372438): working reference implementation
**Length:** 2,108 characters (excluding signature)

```
Matija,

Richard Blech at XSOC Corp writing. I read your recent paper with Tomašev, Jacobs,
Leibo, and Osindero on AI Agent Traps (SSRN 6372438) carefully. The six-category
taxonomy is the clearest framing of this attack surface I have seen in the
literature, and the persona hyperstition framing in particular gave me a concept
I did not previously have a clean way to name. Thank you for publishing it.

I am writing because Section 6 of your paper closes with a specific call for
comprehensive evaluation suites and automated red-teaming methodologies that can
probe these vulnerabilities at scale, and a request that industry adopt them as
standard practice. XSOC has been building that kind of artifact for commercial
reasons, driven by regulated buyer demand for a defensible posture on the agent
frameworks in their supply chain. The specific framework we have focused on is
OpenClaw, for the reasons documented in the public CVE record.

Our work is called XSOC-NIE-GUARD. It is a cryptographic mediation architecture
implemented as an Apache 2.0 reference architecture at
github.com/xsoc-corp/openclaw-nie-guard with a companion Zenodo preprint. The
implementation includes a deterministic 25-scenario attack simulation harness,
17 of which are wired end-to-end against a running broker and pass with
structured error codes. Each scenario maps to one or more categories in your
taxonomy.

Our coverage claim is deliberately bounded. We claim strong structural coverage
for four of your six categories (Content Injection, Semantic Manipulation,
Cognitive State, Behavioural Control), scope persona hyperstition as a
training-time concern outside runtime mediation, and scope Systemic multi-agent
dynamics as requiring ecosystem-level coordination beyond a per-agent
architecture. The full mapping is in our docs.

If you or any of your coauthors have bandwidth, I would welcome any of the
following:

- A review of the attack-sim harness and whether scenario coverage tracks the
  vectors you had in mind
- Feedback on how our preprint characterizes your taxonomy
- A short video call on the relationship between the taxonomy and a concrete
  mediation layer implementation

This is an academic outreach. I am not looking for commercial engagement. If you
prefer to pass, I completely understand.

With appreciation,

Richard Blech
Chief Executive Officer and Technical Lead, XSOC Corp
richard.blech@xsoccorp.com
```

---

## Draft B. To Nenad Tomašev (fallback, second author)

**Rationale:** Tomašev has a stronger applied-industry research portfolio (medical
AI at DeepMind, Virtual Agent Economies paper with Leibo and others) and may be more
receptive to a concrete commercial-industry response to the taxonomy. The Virtual
Agent Economies paper is explicitly cited in the Agent Traps paper as motivating the
broader frame.

**Channel:** LinkedIn DM preferred. Tomašev maintains an active research profile and
is known to engage.
**Subject (for email follow-up):** Agent Traps taxonomy (SSRN 6372438): concrete mediation architecture as response
**Length:** 2,073 characters (excluding signature)

```
Nenad,

Richard Blech at XSOC Corp writing. I have been following your DeepMind work for
some time, including the Virtual Agent Economies paper, and I read the AI Agent
Traps paper (SSRN 6372438) carefully when it appeared. The taxonomy lands in a
way that feels directly usable by operators rather than only by researchers,
which is not the usual mode for this type of work.

I am writing because Section 6 of the Agent Traps paper calls for comprehensive
evaluation suites and automated red-teaming methodologies, and XSOC has been
building exactly that kind of artifact from the commercial side. Our work is
called XSOC-NIE-GUARD. It is a cryptographic mediation architecture implemented
as an Apache 2.0 reference at github.com/xsoc-corp/openclaw-nie-guard with a
companion Zenodo preprint. The reference implementation includes a deterministic
25-scenario attack simulation harness, 17 currently wired end-to-end against the
broker with structured error codes. Each scenario maps to your taxonomy.

I would welcome your reaction on two specific points. First, whether our
coverage claim is honestly calibrated. We claim strong structural coverage for
Content Injection, Semantic Manipulation, Cognitive State, and Behavioural
Control, and we scope Systemic multi-agent dynamics and persona hyperstition as
outside per-agent cryptographic mediation. The latter scoping is the one I most
want honest feedback on. Second, whether any of the attack vectors we currently
skeleton (we have eight not yet wired, including compositional fragment traps
and Sybil resistance at scale) would benefit from input on scenario design.

If there is any appetite for a short technical call, I would very much welcome
it. This is an academic reach-out. I am not seeking commercial engagement. If
timing is bad or the topic is not a fit, I fully understand.

With appreciation,

Richard Blech
Chief Executive Officer and Technical Lead, XSOC Corp
richard.blech@xsoccorp.com
```

---

## Draft C. To Joel Z. Leibo (second fallback, systemic-traps angle)

**Rationale:** Leibo is a senior DeepMind researcher with deep background in
multi-agent reinforcement learning and social dilemmas. The Systemic Traps section
of the Agent Traps paper reads as substantially his voice. He is also a co-author
on both the Agent Traps paper and the earlier Virtual Agent Economies paper. If
Franklin and Tomašev both pass, Leibo is the right researcher to engage on the one
category where our scope honestly stops (multi-agent systemic coordination). The
framing of this draft is narrower: we are not asking him to review the whole
architecture, we are asking him to react to our explicit scope statement that
systemic traps require ecosystem-level coordination beyond per-agent mediation.

**Channel:** LinkedIn DM.
**Subject (for email follow-up):** Systemic category of AI Agent Traps: explicit scope statement in a mediation architecture
**Length:** 1,843 characters (excluding signature)

```
Joel,

Richard Blech at XSOC Corp writing. I have been a reader of your multi-agent
reinforcement learning work for years and I read the AI Agent Traps paper
carefully when it appeared. The Systemic Traps section in particular draws
on the multi-agent dilemmas literature in a way that gave me language for
threat shapes I had been struggling to describe cleanly.

I am writing for a narrower reason than a full review. XSOC has built a
cryptographic mediation architecture for AI agent frameworks called
XSOC-NIE-GUARD (github.com/xsoc-corp/openclaw-nie-guard, Apache 2.0, Zenodo
preprint companion). In writing the companion paper and public documentation,
I wrote an explicit scope statement that per-agent cryptographic mediation
cannot address the Systemic category in your taxonomy: congestion traps,
interdependence cascades, tacit collusion, compositional fragment traps, and
cross-operator Sybil attacks all require ecosystem-level coordination
infrastructure that our architecture is not providing.

I would value your reaction on whether that scope statement reads accurately
from your vantage, or whether there are per-agent controls (sub-agent spawning
restrictions, behavioral drift detection) that I am under-crediting for their
contribution to systemic resilience. I am not looking for a full review of the
architecture and I am not looking for commercial engagement. I would simply
welcome five minutes of your time on the scope question if you have any to
spare.

With appreciation,

Richard Blech
Chief Executive Officer and Technical Lead, XSOC Corp
richard.blech@xsoccorp.com
```

---

## Timing and sequencing

Send Draft A to Matija Franklin first. Wait ten calendar days for response.

If no reply by day ten, send Draft B to Nenad Tomašev. Wait ten calendar days.

If no reply by day twenty, send Draft C to Joel Leibo. Wait ten calendar days.

If no reply by day thirty, the outreach is parked. Do not escalate to additional
coauthors (Jacobs, Osindero) beyond this sequence. Cold outreach to five authors
in sequence on the same paper reads as pestering rather than as engagement.

Do not send all three in parallel. DeepMind researchers talk to each other; Matija
receiving three separate XSOC DMs with nearly identical asks from Richard within
a week would produce the wrong signal.

## Channel guidance

LinkedIn DM is the default. Cold email to google.com or deepmind.com addresses
is acceptable only if the recipient has made their institutional address public.
Do not guess. Do not send to generic DeepMind press or research contacts; the
outreach is peer-to-peer and should look like it.

## What to do if they respond positively

If any author responds with interest:

1. Reply within one business day with a short acknowledgment and the three most
   relevant links: Zenodo preprint DOI, GitHub repository, and the Franklin
   taxonomy mapping doc (`docs/franklin-taxonomy-mapping.md`). Do not attach
   files; use links.

2. Offer three specific time windows in the following week for a 30-minute
   video call. Default to their time zone. DeepMind is primarily London and
   Mountain View.

3. In the call itself, lead with a live demo of the attack simulation harness
   running against the broker. Show three scenarios: one that passes (sub-agent
   spawning, Triedman et al. directly addressed), one that acknowledges a gap
   (systemic compositional fragment, skeleton), and one where their reaction
   is genuinely valuable (the latent memory manifest check).

4. Do not pitch XSOC commercially. Do not ask for an endorsement. Do not mention
   the OpenAI engagement thread. Those are separate conversations on separate
   tracks.

5. After the call, send a one-paragraph thank-you with a clear specific ask
   about whether we may cite any of their reaction in a revised version of the
   Zenodo paper (standard practice, they can say yes, no, or condition).

## What NOT to do

- Do not send the OpenAI liaison paper to any DeepMind author, in any form, at
  any stage of this outreach. The OpenAI thread and the DeepMind thread are
  separate and must remain separate.
- Do not mention EternaX, Dariia Porechna, or any competitor in these messages.
- Do not mention the three prior IACR ePrint rejections.
- Do not ask about hiring, consulting, or advisory arrangements.
- Do not ask them to sign an NDA. This is public-track engagement.
- Do not send any XSOC proprietary material. The outreach references only
  public artifacts (Zenodo preprint, GitHub repo, public docs).
- Do not follow up more than once per author per ten-day window.
- Do not CC XSOC colleagues on the initial outreach. This is a peer-to-peer
  message from Richard to a named researcher.
- Do not ask for a "quick chat to pick your brain". That phrasing signals
  commercial extraction. Use "short technical call" or "five minutes of your
  time" instead.

## Ancillary artifact

If any author engages positively and requests supporting material, the
Franklin taxonomy mapping document (`docs/franklin-taxonomy-mapping.md` in the
repository) is the correct attachment. Rendering it as a clean docx with XSOC
letterhead is a reasonable next step at that point, not before. Sending a
letterhead-branded document at the initial cold-outreach stage looks like
commercial positioning and would hurt the academic framing.

## Strategic note

The Franklin paper closes with a specific call to action that XSOC has, in fact,
already responded to. This outreach is the shortest and most defensible move on
the board: it does not over-claim, it does not commercialise, it simply notes
that their research agenda has a concrete implementation available for review
and asks whether they would like to look at it. If even one author engages and
cites the XSOC-NIE-GUARD preprint in any future DeepMind work or talk, the
arXiv cs.CR endorsement landscape changes materially and several regulated buyer
conversations change materially. The downside is negligible: in the worst case,
three researchers do not respond, which tells us nothing new.
