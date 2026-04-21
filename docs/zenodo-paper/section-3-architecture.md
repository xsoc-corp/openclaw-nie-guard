# Section 3. Architecture Overview

*Draft v1.0, Pass 2. Target 1,200 words.*

---

## 3.1 The single-front-door principle

XSOC-NIE-GUARD sits as a single cryptographic front door between the agent
framework and everything the agent talks to: the large language model API,
operator tools, MCP servers, external messaging channels, and persistent
memory stores. Agents do not address these targets directly. Every operation
flows through the broker. This is the load-bearing architectural decision
from which every other property follows.

The single-front-door principle has three consequences. First, the broker
is the only point at which policy, continuity, intent, and classification
can be enforced; there is no bypass path that an agent could use to reach
a target without mediation. Second, the broker is the canonical point of
audit; a tamper-evident hash chain of broker decisions (Section 10) is a
complete record of the agent's operational history. Third, the broker is
the canonical point of revocation; a single write to the revocation store
propagates to every operation across every session within the propagation
window.

The principle trades off a single point of failure for a single point of
enforcement. We accept that trade-off as correct for the agent mediation
use case because the failure modes of unmediated agent execution, as
documented in Section 1.2 and in Sections 2 and 11, are structurally
incompatible with regulated deployment. A broker that is down denies
operations; a broker that is absent permits everything.

## 3.2 Five planes

The architecture decomposes into five planes. Each plane has a narrow
responsibility and composes with the others through well-defined interface
contracts.

**P1, the Client Trust Plane.** Device attestation at admission. Subject
and device are bound into every subsequent capability and envelope. The
plane's responsibility is to produce an attestation assertion that the
admission plane can verify. Network topology is not a trust signal in this
plane; loopback binding is not a control; only the conjunction of attested
device, authenticated subject, and role authorization is a control. The
Client Trust Plane is described in Section 4.1.

**P2, the Admission Plane.** Single front door via `/v1/admit`. Three
things happen in sequence: the attestation is validated against the
attestation floor, the requested role is authorized against the signed
policy bundle, and a short-time-to-live scoped capability is issued. No
credentials are stored on the client at rest. The plane's responsibility
is to produce a capability token whose scope is the intersection of the
requested operations and the role's permitted operations, and to record
that issuance as a Providence event. The Admission Plane is described in
Section 4.2.

**P3, the Action Mediation Plane.** Every OpenClaw operation flows through
`/v1/invoke`. The plane runs five checks in sequence: capability
verification against the admission record, TSTL envelope validation
against the sealed cryptographic binding, policy evaluation against the
signed role matrix and classification rules, FHE gate routing for
sensitive context, and MCP boundary mediation for inbound external
content. Only operations that pass all five checks reach the adapter that
forwards to OpenClaw. Agents never address OpenClaw directly. The Action
Mediation Plane composes controls described in Sections 5, 6, 7, and 8.

**P4, the Runtime Continuity Plane.** TSTL envelopes carry per-operation
state across the full lifecycle of an operation: from admission, through
invoke, through adapter forwarding, through response return. Every
envelope includes session nonce lineage, role scope hash, operation type,
target hash, context manifest hash, intent hash, classification, counter,
and expiration. The plane's responsibility is to detect any loss of
continuity (replay, target substitution, nonce reuse, intent drift,
context manifest tampering) and to terminate the session cleanly on any
such detection. The Runtime Continuity Plane is described in Section 5.

**P5, the Audit and Revocation Plane.** Providence produces a tamper-
evident hash chain of every security-relevant decision. Revocation
propagates through in-process cache, Redis mirror, and event fan-out. The
plane's responsibility is to make every decision cryptographically
accountable and to make revocation propagate faster than an adversary can
exploit a captured token. The target intra-region revocation propagation
window is under 200 milliseconds. The Audit and Revocation Plane is
described in Section 10.

## 3.3 Hero controls, labelled A1 through A10

Across the five planes, ten named controls implement the specific defensive
mechanisms this paper describes. Sections 4 through 10 expand each in
detail; the enumeration here fixes the identifiers used throughout the
paper.

**A1, FHE Context Gate** (Section 6). Three-mode routing of sensitive
context through the XSOC FHE SDK: Mode A full FHE, Mode B tokenized
substitution, Mode C attested cleartext.

**A2, Agent Intent Envelope** (Section 5.3). Extension of the TSTL
envelope with a declared intent class. Adapter enforces alignment between
declared intent and operation class. Prompt-injected agents with valid
capabilities cannot invoke tools for purposes outside their declared
intent.

**A3, MCP Boundary Mediation** (Section 7). External channels (Telegram,
Slack, Discord, email, WhatsApp) treated as untrusted. Inbound MCP
responses sanitized for known prompt-injection patterns and tagged with
external-content markers before entering model context.

**A4, Context Provenance Chain** (Section 5.2). Every context element
registered with provenance, classification, and content hash. Manifest
hash anchors to Providence. Unregistered context elements rejected at the
Action Mediation Plane.

**A5, Short-TTL Scoped Capabilities** (Section 4.3). Capability tokens
default to fifteen-minute expiration, configurable per policy. Stolen or
harvested tokens expire before they can be operationalized at scale.

**A6, Dual-Control for High-Risk Operations** (Section 8.3). Operations
classified as regulated or targeting `admin.control` and `exec.run` require
a co-signed receipt from a distinct attested principal. Dual-control
converts single-principal compromise from sufficient to insufficient.

**A7, Device Fingerprint Binding** (Section 4.1). The envelope is bound to
the admitted device fingerprint. Reuse of a capability token from a
different device produces an envelope verification failure.

**A8, Capability Derivation Tree** (Section 4.4). Sub-agent flows use a
scoped derivation primitive that produces children strictly narrower than
parents. Children cannot widen scope, cannot outlive parents, and revoke
through the parent in sub-millisecond time.

**A9, Behavioral Escalation Meter** (Section 9). Per-session drift scoring
based on intent variance, target dispersion, context manifest churn, Mode
C frequency, and continuity counter pattern. Score crossing a threshold
escalates session profile from standard to strict or from strict to
restricted-information.

**A10, Signed Policy Bundles** (Section 8). Every policy change is a
signed bundle produced by a ceremony-rooted signer. Role matrix, MCP
server trust table, and skill manifest live in the bundle. Unsigned or
wrong-signer bundles rejected at load. Bundle rotation is a Providence
event.

## 3.4 Profile composition and the lethal trifecta

Four operator profiles parameterize the defaults across the ten controls:
relaxed, standard, strict, and restricted-information (SCIF-class).
Profiles encode the trade-off between agent flexibility and defense
strength. Relaxed permits the lethal trifecta and is intended for
development environments. Standard permits the trifecta but forces context
breaks via envelope counter cycles. Strict admits private data under Mode
A or Mode B only and requires intent match for external communication.
Restricted-information separates private data and external communication
into mutually exclusive sessions. Profile selection is a signed policy
bundle field and is enforced at admission; escalation via A9 BEM is
audit-recorded. Per-operation downgrade is not permitted without a
dual-control receipt.

## 3.5 Public and proprietary boundaries

The broker, policy engine, TSTL envelope schema, Providence event schema,
Context Provenance Chain design, Agent Intent Envelope design, MCP
Boundary Mediation design, Capability Derivation Tree concept, and FHE
Context Gate three-mode taxonomy are all public components of this
architecture, released under Apache 2.0 in the reference repository. The
proprietary XSOC primitives (DSKAG, SP-VERSA, X-ARC, TSTL cryptographic
sealing construction, XSOC FHE SDK internals, XRNG internals) are
referenced by public name, interface signature, stated security property,
and externally validated performance or correctness claim only, as
described in Section 1.7. Internal construction details are not disclosed
here and are enforced mechanically in the reference repository by a
disclosure-lint continuous integration check.

---

*End of Section 3.*
