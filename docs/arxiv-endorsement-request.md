# arXiv cs.CR Endorsement Request

This file contains two drafts: one addressed to Roberto Avanzi and one addressed to
Diego Aranha. Pick the appropriate one based on who replies first or who you assess
as the better initial ask. Adapt the prefix paragraph if sending to a third party.

Both drafts are written for direct copy into LinkedIn direct message or email.
Tone is peer-to-peer. No em-dashes. No AI-tell phrases. Black-box discipline
preserved: no construction details of DSKAG, SP-VERSA, X-ARC, or FHE SDK
parameter selection.

Under the arXiv endorsement process, the endorser goes to
https://arxiv.org/auth/need-endorsement.php with the submitter's identifier and
a six-character endorsement code that arXiv provides to them directly. The
endorser does not need to review the paper; they are attesting that the
submitter is a legitimate researcher whose work is appropriate for the category.

---

## Draft A. To Roberto Avanzi

**Channel:** LinkedIn direct message, then email if preferred
**Subject (for email):** arXiv cs.CR endorsement request for XSOC-NIE-GUARD preprint
**Length:** 2,041 characters

```
Roberto,

Richard Blech at XSOC Corp here. We have corresponded previously on post-quantum
key derivation topics in public threads, and I appreciate the rigor you bring to
those discussions.

I am writing to ask if you would be willing to endorse me for the arXiv cs.CR
category. I do not hold a .edu affiliation, and the category requires an
endorsement from a published author in cs.CR before a first submission. If you
are open to this, the process on your end is brief. arXiv will provide you a
six-character code after I submit the request, and the endorsement does not
require you to review the paper in detail.

The paper I intend to submit is titled XSOC-NIE-GUARD: A Cryptographic Mediation
Architecture for AI Agent Systems, with Application to the OpenClaw Security
Crisis. It is already posted on Zenodo with DOI 10.5281/zenodo.XXXXXXXX as a
preprint. The companion reference implementation is at
github.com/xsoc-corp/openclaw-nie-guard under Apache 2.0. The paper describes a
five-plane mediation architecture that addresses the structural failures
documented in the OpenClaw public record (CVE-2026-33579 pairing escalation,
plaintext credential storage, ClawHub supply chain, Willison lethal trifecta).
The construction is composed of standard primitives at the interface level;
internal cryptographic construction details for XSOC-proprietary components are
black box and are described by public name and stated security properties only.
Independent validations on the underlying XSOC cryptographic stack are in the
bibliography: Perrin and Biryukov audits of the legacy cryptosystem at the
University of Luxembourg in 2020 and 2024, with mandatory findings incorporated
into the current canonical build; Cal Poly San Luis Obispo Dieharder v3.31.1
statistical testing of the entropy subsystem at 99.4 percent aggregate across
98 tests; and George Mason University SENTINEL laboratory audit FP5223, with
full report publication scheduled for June 2026.

If you would prefer I send the preprint PDF for a closer read before you decide,
I am happy to do that.

With thanks,

Richard Blech
Chief Executive Officer and Technical Lead, XSOC Corp
richard.blech@xsoccorp.com
```

---

## Draft B. To Diego Aranha

**Channel:** Email preferred; LinkedIn as fallback
**Subject:** arXiv cs.CR endorsement request for AI agent mediation architecture preprint
**Length:** 2,067 characters

```
Diego,

Richard Blech at XSOC Corp writing. We have engaged on LinkedIn threads around
the practical state of FHE deployment and your work on side-channel resistant
implementations continues to be a reference point for our team.

I would like to ask if you would be willing to endorse me for the arXiv cs.CR
category. I do not hold an academic affiliation and the category requires an
endorsement from a published cs.CR author before a first submission. The
endorsement process is lightweight on the endorser side. arXiv issues a
six-character code to you after I initiate the endorsement request, and you
submit that code on their form. The endorsement does not obligate you to review
the paper.

The paper I am preparing to submit is titled XSOC-NIE-GUARD: A Cryptographic
Mediation Architecture for AI Agent Systems, with Application to the OpenClaw
Security Crisis. The preprint is on Zenodo at DOI 10.5281/zenodo.XXXXXXXX and
the reference implementation is at github.com/xsoc-corp/openclaw-nie-guard
under Apache 2.0. The paper argues that the current AI agent security crisis
documented across the OpenClaw record is structural rather than defect level,
and describes a five-plane mediation architecture that addresses the failure
modes by construction. The FHE Context Gate component describes our deployment
of CKKS-based operations with published benchmarks of 40.28 ms encrypt and 1.29
ms multiply, which I believe are honest numbers and I would welcome your
assessment of them. XSOC-proprietary cryptographic primitives are referenced by
interface and stated security properties only; construction details remain
private per our commercial posture.

If you would like to read the preprint before endorsing, I am happy to send
the PDF directly. If you prefer to pass on endorsement, I fully understand and
would appreciate a quick note.

With appreciation,

Richard Blech
Chief Executive Officer and Technical Lead, XSOC Corp
richard.blech@xsoccorp.com
```

---

## Timing and fallback strategy

Send Draft A first. If no reply in seven calendar days, send Draft B. If both
pass on the endorsement, candidate backup endorsers to consider:

- Yehuda Lindell (industry + academic; known to respond to well-formed requests
  from industry researchers working on applied crypto)
- Ben Fisch (applied FHE; academic)
- Seny Kamara (encrypted computation; responsive to industry engagement)
- Stefano Tessaro (applied crypto theory; harder target but achievable with
  a clean preprint)

For each backup, rewrite the opening paragraph to reference specific prior
engagement or specific papers of theirs that connect to XSOC-NIE-GUARD.

If no academic endorsement materializes, alternative paths:

1. Host the preprint on Zenodo only. Zenodo issues DOIs without endorsement
   requirements and is citable in compliance contexts. Many applied crypto
   papers now circulate via Zenodo.
2. Submit to IACR ePrint. IACR ePrint does not require endorsement but has
   its own acceptance process; a fourth submission should be framed differently
   from the three prior rejections to avoid procedural blocks.
3. Submit directly to a workshop or conference (for example a USENIX
   Security workshop, or the RSA Conference cryptographers' track) that
   can serve as a citable venue without arXiv dependency.
4. Engage OWASP AI Exchange publication channels through your existing
   contributor relationship. OWASP working drafts are citable and carry
   weight with regulated buyers.

## What NOT to do

- Do not include the EternaX comparison in the endorsement request. Save that
  for a separate technical post or paper section. Referencing a competitor
  dispute in an endorsement ask looks like drama to an academic.
- Do not mention the OpenAI engagement in the endorsement request. Scope this
  ask strictly to the arXiv endorsement and the paper.
- Do not attach the full reference implementation tarball. Give the GitHub
  link and let them decide if they want to look.
- Do not include a pitch for commercial engagement. This is an academic ask.
- Do not use em-dashes. Both drafts above are verified clean.
