# Section 5. Runtime Continuity

*Draft v1.0, Pass 2. Target 1,400 words.*

---

## 5.1 The continuity problem

A capability token alone does not bind an operation. An adversary who
captures a valid token (A6 network adversary in Section 2, or A2
compromised OpenClaw instance) can attempt three classes of abuse
against it: replay the same operation with the same parameters,
substitute a different target under the same capability, or invoke the
capability for an operation the admission-time intent did not authorize.
The Runtime Continuity Plane addresses all three through a per-operation
sealed envelope carried with every `/v1/invoke` call.

Three specific control surfaces compose the plane: the TSTL continuity
envelope itself (subsection 5.2), the Context Provenance Chain that
binds the context elements the operation operates over (subsection 5.3),
and the Agent Intent Envelope that binds the agent's declared intent
class into the sealed structure (subsection 5.4). Each surface rejects a
different class of adversary behaviour.

## 5.2 TSTL continuity envelope

The TSTL envelope is a cryptographically sealed structure produced by
the broker at admission and validated on every subsequent invoke. The
sealing construction is proprietary and is referenced by interface and
security property only. The envelope's public-visible fields are:

- `deviceFingerprint`: hash of the admitted device fingerprint (A7
  device binding from Section 4.1)
- `sessionId`: the admission record identifier
- `sessionNonceLineage`: a monotonically growing list of nonces
  consumed by the session
- `roleScopeHash`: hash of the authorized operation set
- `operationType`: the class of operation this envelope authorizes
- `targetHash`: hash of the operation target identifier
- `directionality`: inbound, outbound, or bidirectional
- `brokerPathId`: identifier of the broker instance that sealed the
  envelope (for correlation on multi-node deployments)
- `contextManifestHash`: the manifest hash that anchors the context
  the operation operates over (Section 5.3)
- `intentHash`: the sealed intent commitment (Section 5.4)
- `intentClass`: the declared intent class
- `classification`: the data classification the operation targets
  (public, sensitive, regulated, restricted-information-adjacent)
- `issuedAt`, `expiresAt`: integer timestamps bounding envelope
  validity
- `counter`: monotonic envelope counter for replay detection

Envelope verification is the first check in the Action Mediation Plane
(Section 3.2). A mismatched device fingerprint produces
`ERR_DEVICE_MISMATCH`; a target hash that does not match the requested
target produces `ERR_TARGET_MISMATCH` (Scenario 04 in Section 11); a
nonce that has already been consumed for this session produces
`ERR_NONCE_REPLAY` (Scenario 02); a counter that regresses or skips
produces `ERR_COUNTER_REGRESSION`; an `expiresAt` in the past produces
`ERR_ENVELOPE_EXPIRED`. Each failure mode emits a structured Providence
event (Section 10) with the reason code, the sealed envelope, and the
correlation identifier.

The envelope's cryptographic sealing construction is proprietary to the
NIE binding implementation. The reference repository provides a mock
binding that produces a base64-encoded JSON serialization for
development and attack-sim use, with production substitution to the
NIE binding at deployment time. The mock is not a security mechanism
and is labelled as such in the repository.

## 5.3 Context Provenance Chain

The Context Provenance Chain (CPC), control A4 in Section 3.3, is the
mechanism that binds the full set of context elements an operation
operates over into a single cryptographic commitment verifiable from
the TSTL envelope.

A context element is any piece of material entering the model's
reasoning scope: the user's current prompt, a retrieved RAG chunk, a
tool invocation output, an MCP response, a fragment of recent
conversation history. Every element is registered at the broker
through `/v1/context/register` before it can be referenced by any
operation. The registration record for an element contains:

- `elementId`: a UUID
- `provenance`: one of `user`, `system`, `rag`, `tool-output`,
  `mcp-response`, `external-channel`
- `classification`: the data classification
- `contentHash`: SHA-256 of the element's canonical byte
  representation
- `registeredAt`: integer timestamp
- `sentinelMarkId`: optional identifier linking to a SentinelMark
  fingerprint for documents that support one

A context manifest is an ordered set of context elements that
constitutes the full reasoning scope of an operation. The manifest
hash is the Merkle root of the element hashes with a fixed ordering
scheme. The broker verifies that every element referenced in a
manifest has a registration record; an unregistered element rejects
the manifest with `ERR_CONTEXT_MANIFEST_INVALID` (Scenarios 09 and 24
in Section 11).

Three properties follow from this construction. First, the context
the operation operates over is immutable once the envelope is sealed.
Second, the provenance of every element is audit-reconstructable; a
Providence event for the invoke contains the manifest hash, and the
manifest's element records contain the provenance. Third, contamination
across classification boundaries is structurally detectable; an
external-channel element in a manifest where the operation claims to be
purely `user` provenance produces a classification violation at policy
evaluation time.

The CPC is the structural answer to Franklin et al. Content Injection
attacks that rely on external content mixing into the model's trust
assumption. Every element the model can attend to has a recorded
provenance, and the sanitizer (Section 7) ensures that external-channel
content is tagged and its structure is legible.

## 5.4 Agent Intent Envelope

The Agent Intent Envelope, control A2 in Section 3.3, is the structural
answer to the specific class of prompt injection that exploits a
legitimate capability for an illegitimate purpose. We believe this
class is under-addressed in prior work, and the envelope construction
here is one of the paper's principal contributions.

The mechanism: before the agent issues any operation, it declares an
intent class drawn from a finite set (`read`, `write`, `analyze`,
`export`, `execute`, `escalate`). The intent class is cryptographically
bound into the TSTL envelope via the `intentHash` and `intentClass`
fields. The Action Mediation Plane enforces alignment between the
declared intent class and the operation class via a static mapping
(`OPERATION_TO_INTENT`) maintained in the signed policy bundle.

A prompt-injected agent that holds a legitimate capability for
`tool.invoke` with declared intent `analyze` cannot invoke that tool
with effective intent `export` because `export` is not in the intent
set that `tool.invoke` authorizes at the analyze-intent level. Scenario
07 in Section 11 exercises this path; the broker returns 403 with
`ERR_INTENT_DRIFT` and emits a Providence event of type
`intent_drift`.

Two properties matter for the construction's soundness. First, the
intent class is sealed into the envelope, not transmitted as a query
parameter on the invoke call. An adversary cannot flip the intent class
between envelope seal time and operation execution. Second, the
`OPERATION_TO_INTENT` map is in the signed policy bundle, not a
broker-local configuration. Changes to the map require a signed bundle
rotation (Section 8), which is a Providence event.

The envelope does not prevent intent drift from occurring in the
agent's reasoning; it ensures that drift cannot reach an effect. The
agent may have been coerced to "want" to export, but the structural
binding of the capability to the analyze intent means the effective
operation is rejected at the broker regardless of the agent's internal
state.

## 5.5 Composition and continuity failure semantics

The three continuity surfaces compose. An invoke operation is accepted
only if all three verifications pass: TSTL envelope integrity (5.2),
context manifest validity (5.3), and intent class alignment (5.4).
Any failure terminates the operation and emits a Providence event with
the specific reason code. The session itself is not automatically
terminated on a single continuity failure; the Behavioral Escalation
Meter (Section 9) correlates repeated continuity failures within a
session and escalates the session profile when a threshold is crossed.

The failure semantics are deliberately fail-closed. Continuity failures
do not degrade to warning; they reject the operation with a structured
error and leave the envelope's sealed state intact for audit. The
architecture does not include a "soft continuity" mode. Soft
continuity would be a downgrade path an adversary could target, and
the threat model (Section 2.4) excludes such paths by construction.

## 5.6 Summary

The Runtime Continuity Plane binds every operation to three
cryptographic commitments: the session context via the TSTL envelope,
the reasoning context via the Context Provenance Chain, and the
operational intent via the Agent Intent Envelope. Each commitment
rejects a distinct class of adversary behaviour. Their composition is
what makes the mediation layer's claim to continuity enforceable.

---

*End of Section 5.*
