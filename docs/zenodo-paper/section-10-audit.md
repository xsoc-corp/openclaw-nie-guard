# Section 10. Audit and Forensic Reconstruction

*Draft v1.0, Pass 2. Target 600 words.*

---

## 10.1 The Audit and Revocation Plane

The fifth plane, P5 in Section 3.2, is responsible for two orthogonal
guarantees. Every security-relevant decision the broker makes is
recorded as a tamper-evident audit event. Every revocation decision
propagates fast enough to close operational attack windows before an
adversary can meaningfully exploit a compromised capability. The first
guarantee is delivered through the Providence hash chain; the second
through a three-tier revocation propagation design.

## 10.2 Providence hash chain

Providence is a per-broker append-only log of structured events.
Every admission, every invoke decision (approve or deny), every
revocation, every bundle rotation, every continuity failure, every
gate mode decision, every BEM escalation, and every dual-control
interaction produces exactly one Providence event. Events have a
well-defined schema including the event type, the correlation
identifier, the session and subject identifiers where applicable,
the operation class and target hash, the classification, the reason
code, a timestamp, and a metadata envelope for event-type-specific
fields.

Each event carries two hashes: `previousEventHash`, the hash of the
preceding event in the chain, and `eventHash`, the hash of the
event's canonical JSON with `eventHash` itself elided from the
hash input. The hash function is SHA-256. The chain is seeded at a
genesis hash of sixty-four zero bytes. An auditor with the chain's
head hash and the chain itself can verify every event's integrity
by reconstructing each event's `eventHash` and verifying that it
matches, and by verifying that each event's `previousEventHash`
equals the preceding event's `eventHash`.

Truncation is detectable. An adversary who wishes to remove an event
from the log must update every subsequent event's
`previousEventHash` and recompute every subsequent event's
`eventHash`. The head hash diverges on any removal. External
anchoring of the head hash at periodic intervals (to a tamper-
evident external store, a public blockchain, or a co-signed offline
log) closes the remaining gap: an adversary cannot rewrite history
past the most recent external anchor.

## 10.3 Forensic reconstruction

The Providence schema is designed for reconstruction, not just
logging. Given a Providence chain and a session identifier, an
auditor can reconstruct the full lifecycle of that session:
admission with attestation floor and policy bundle version, every
invoke with its envelope, every intent class declaration, every
classification assignment, every mode selection and its endpoint
attestation identifier where applicable, every dual-control
interaction, every continuity failure, every BEM drift score
excursion, and the session termination.

For an incident investigation, this reconstruction answers the
three questions that regulated-industry incident response requires:
what did the agent do, on what material, and with what authorization.
The answer is cryptographically backed by the hash chain, not by a
SIEM's ingestion confidence. The structured reason codes mean the
investigation can be partially automated; a query for all sessions
where `ERR_INTENT_DRIFT` was emitted against a specific target class
is a database read.

## 10.4 Revocation propagation

Revocation is a structured update: a subject, session, or device
identifier moves into a revoked set. Three tiers of propagation run
in parallel: in-process cache update on the handling broker node
(under one millisecond), Redis mirror update for cross-node
propagation (target under 50 milliseconds intra-region), and event
fan-out to downstream consumers (target under 200 milliseconds
intra-region). The three tiers provide defense in depth: the
in-process cache handles the local case, the Redis mirror handles
cross-node propagation, and the event fan-out handles downstream
systems that maintain their own caches.

Revocation is itself a Providence event. The reason for revocation,
the initiating principal, and the cascade target set are all
recorded. Revocation cascades are structural in the Capability
Derivation Tree (Section 4.4): revoking a parent capability revokes
every descendant, and the Providence record captures the cascade
with individual events per descendant.

## 10.5 Summary

Providence provides a cryptographically accountable record of every
broker decision with detectable truncation. Revocation propagates
through three tiers with targets calibrated for operational response
before adversary exploitation windows close. The Audit and Revocation
Plane is what makes the architecture's security claims legible to a
regulator and what makes incident response tractable when the
inevitable compromise of a peripheral component occurs.

---

*End of Section 10.*
