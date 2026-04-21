# Section 9. Behavioral Escalation

*Draft v1.0, Pass 2. Target 500 words.*

---

## 9.1 Drift as a separate signal

The controls described in Sections 4 through 8 are per-operation
controls. Each reject or approve decision is made on the basis of the
operation's own envelope, intent, context, and policy. None of those
controls look across operations within a session or across sessions for
a subject. Some classes of adversarial pattern are invisible at the
per-operation level but visible at the aggregate level. A session that
drifts from initial `read` intent toward repeated `export` intent, or
that shows increasing Mode C decryption frequency, or that loses
continuity counter monotonicity across a long horizon, is the class of
pattern that Behavioural Escalation Meter (BEM) is designed to detect.

BEM is control A9 in Section 3.3. Its role in the architecture is to
observe the stream of Providence events that Sections 4 through 8
produce and to maintain a per-session drift score whose threshold
crossings escalate the session's operational profile.

## 9.2 Drift score inputs

The drift score is a weighted aggregation over five observables:

- **Intent variance**: the number of distinct intent classes the
  session has declared within a rolling window, normalized against the
  session's declared baseline.
- **Target dispersion**: the count of distinct target identifiers
  the session has touched, normalized against the expected workload
  shape for the session's role.
- **Context manifest churn**: the rate at which new context elements
  are being registered into the session's manifests, with weight
  applied to external-channel provenance.
- **Mode C decryption frequency**: the per-window count of Mode C
  releases. Regulated-classification Mode C is weighted higher than
  sensitive-classification Mode C.
- **Continuity counter pattern**: whether the envelope counter is
  advancing monotonically at the expected rate, or showing gaps,
  clusters, or regressions that the continuity checks accepted
  individually but which form a pattern when aggregated.

The weights and the windowing parameters are policy-bundle fields
(Section 8), not broker-hardcoded. This allows operators to tune BEM
sensitivity per deployment without modifying the broker source.

## 9.3 Profile escalation

When the drift score crosses a configured threshold, BEM emits a
`profile_escalation` Providence event and requests the Admission Plane
to escalate the session's profile. Escalation is one-way within a
session: standard to strict, strict to restricted-information. A
deescalation requires a new admission sequence with a fresh attestation
package.

Escalation changes the session's operational envelope in three ways.
First, the FHE gate's default mode tightens; a session that was
operating in Mode B by default moves to Mode A. Second, dual-control
requirements expand; operations that were single-principal at
standard are dual-control at strict. Third, external-channel
ingestion is narrowed; a strict-profile session cannot ingest from
channels its standard-profile session was permitted.

## 9.4 BEM is not anomaly detection

BEM is deliberately not an anomaly detection system trained on prior
traffic. Anomaly detection is fragile against adversary adaptation
and against distribution shift in the operational workload. BEM uses
fixed observables with policy-bundle-configured thresholds; its
behaviour is deterministic, auditable, and adversary-legible in the
sense that the thresholds are part of the signed policy and cannot be
tuned in runtime response to an adversary's probing.

Scenario 19 in Section 11 (skeleton, scheduled for Phase 6) exercises
the lethal-trifecta drift case where a long-running session
accumulates the three trifecta legs through individually-innocuous
operations that aggregate into a violation. BEM is the mechanism that
detects the aggregation.

## 9.5 Summary

BEM closes the aggregate-pattern gap that per-operation controls
cannot close by construction. Its inputs are five specific observables
tied to Providence events. Its output is a monotonic profile
escalation that composes with the per-operation controls by
tightening their defaults. It is not the only escalation path (the
operator can escalate manually via a signed policy bundle update), but
it is the automatic path that responds to observable session
behaviour.

---

*End of Section 9.*
