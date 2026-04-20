# Architecture

OPENCLAW-NIE-GUARD is a five-plane cryptographic mediation layer that sits in front
of OpenClaw or any compatible AI agent framework.

## Planes

### P1 Client Trust Plane

Device attestation at admission. Subject and device are bound into every subsequent
capability and envelope. Network topology is not a control; loopback binding is not
a control; only attestation plus role plus continuity is a control.

### P2 Admission Plane

Single front door via `/v1/admit`. Attestation validates, role is authorized against
the signed policy bundle, and a short-TTL scoped capability is issued. No credentials
are stored on the client at rest.

### P3 Action Mediation Plane

Every OpenClaw operation flows through `/v1/invoke`. Capability verification, TSTL
envelope validation, policy evaluation, FHE gate routing, MCP mediation, and adapter
forwarding happen here. Agents never talk to OpenClaw directly.

### P4 Runtime Continuity Plane

TSTL envelopes carry per-operation state. Every envelope includes session nonce
lineage, role scope hash, operation type, target hash, context manifest hash,
intent hash, classification, counter, and expiration. Continuity failures terminate
the session cleanly.

### P5 Audit and Revocation Plane

Providence produces a tamper-evident hash chain of every security-relevant decision.
Revocation propagates through in-process cache, Redis mirror, and event fan-out in
under 200ms intra-region.

## Hero feature: FHE Context Gate

Three modes route sensitive context through the XSOC FHE SDK:

- Mode A: operations happen on ciphertext; model never sees cleartext
- Mode B: sensitive fields are substituted with opaque tokens
- Mode C: cleartext is released only with endpoint attestation, policy approval,
  and a Providence-logged decryption event; dual-control required for regulated
  classification

Classification to mode compatibility:

| Classification | Modes permitted |
|---|---|
| public | A, B, C |
| sensitive | A, B, C |
| regulated | A, B |
| classified-adjacent | A only |

## Context Provenance Chain

Every element entering the model's context is a registered `ContextElement` with
provenance (user, system, rag, tool-output, mcp-response, external-channel),
classification, and content hash. Manifest hash anchors to Providence. Unregistered
context elements are rejected.

## Agent Intent Envelope

Extension of the TSTL envelope with a declared `intent_class` and plan summary.
Operation adapter enforces alignment between declared intent and operation class
per the `OPERATION_TO_INTENT` map. Prompt-injected agents with a valid capability
for a tool cannot invoke that tool for a purpose outside its declared intent.

## Capability Derivation Tree

Sub-agent flows use `deriveScopedCapability` to produce children strictly narrower
than parents. Children cannot widen scope, cannot outlive parents, and revoke
through the parent in sub-millisecond time.

## MCP Boundary Mediation

External channels (Telegram, Slack, Discord, email, WhatsApp) are treated as
untrusted. MCP responses are sanitized for known prompt-injection patterns and
tagged with `<external_content>` markers before entering the model context.

## Behavioral Exposure Meter (BEM) integration

Per-session drift scoring based on intent variance, target dispersion, context
manifest churn, Mode C decryption frequency, and continuity counter pattern.
Score crossing a threshold escalates the profile from standard to strict, and
from strict to scif.

## Signed Policy Bundles

Every policy change is a signed bundle produced by a ceremony-rooted signer.
Role matrix, MCP server trust table, and skill manifest all live in the bundle.
Unsigned or wrong-signer bundles are rejected at load. Bundle rotation is a
Providence event.
