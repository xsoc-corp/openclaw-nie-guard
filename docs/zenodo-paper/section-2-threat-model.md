# Section 2. Threat Model

*Draft v1.0 for Pass 1 quality review alongside Section 6.
Target 1,400 words. Current count approximately 1,450.*

---

## 2.1 Framing: aligning the threat model with the published taxonomy

We adopt the AI Agent Traps taxonomy of Franklin et al. [1] as the organizing
frame for the threat model. Their six categories (Content Injection, Semantic
Manipulation, Cognitive State, Behavioural Control, Systemic, and
Human-in-the-Loop) are not themselves threat paths against a concrete system,
but they provide a classification under which concrete threats can be
organized and which is recognized by the research community to which this
paper is addressed. Section 2.3 enumerates the specific threat paths we
defend against, each tagged with the Franklin category or categories it
occupies. Section 2.4 enumerates the threat paths we explicitly do not
defend against and states the reason for each exclusion.

The threat model is informed by the public record of the OpenClaw security
crisis of late 2025 and early 2026, summarized in Section 1.1, and by the
broader agent security literature including [2], [3], [4], [5], [6], [35],
and [36]. Where the OpenClaw public record provides a representative
instance of a Franklin category, we cite the specific CVE or public
analysis.

## 2.2 Assets, actors, and assumptions

**Assets under protection.** Subject identity (user and device pair, attested
at admission), capability tokens (short-TTL derived artifacts), session nonce
lineage, TSTL continuity envelopes, signed policy bundles, the Providence
audit chain, sensitive context (user prompt content, retrieval-augmented
generation chunks, tool outputs, MCP responses), and cryptographic keys
(NIE-resident, never crossing the trust boundary of the mediation layer).

**Legitimate actors.** The enrolled user on an attested device; the operator
running the broker; the auditor with read access to the Providence chain;
the administrator with co-signing authority over policy bundles.

**Adversaries.** Eight adversary classes are considered. *A1* is an external
prompt injector who posts content to a messaging channel (Telegram, Slack,
Discord, WhatsApp), sends email, or publishes a web page whose content is
later ingested by the agent. *A2* is a compromised OpenClaw instance running
unpatched, pairing-escalated, or hosting a malicious ClawHub skill. *A3* is a
malicious skill author who publishes to the skill marketplace to achieve
execution inside the agent's context. *A4* is an honest-but-curious model
vendor who operates the LLM API and has legitimate access to prompts and
responses in transit and at rest within their own infrastructure. *A5* is an
insider administrator with legitimate broker write access who attempts
unilateral action outside policy. *A6* is a network adversary (on-path or
local LAN) capable of replay, capture, or tampering. *A7* is a stolen-device
scenario in which a legitimate device is in attacker hands post-theft. *A8*
is a supply chain implant hidden in a transitive dependency that attempts to
compromise the broker at runtime.

**Assumptions.** NIE cryptographic primitives are sound at the interface
level; the broader XSOC cryptographic stack has been externally validated
through the Perrin and Biryukov confidential audits of the legacy
cryptosystem at the University of Luxembourg in 2020 and 2024 (mandatory
findings incorporated into the current canonical build) [16], Cal Poly San
Luis Obispo Dieharder v3.31.1 at 99.4 percent aggregate across 98 tests [17],
and the George Mason University SENTINEL laboratory audit FP5223 (full
report scheduled for public release in June 2026) [18]. Device attestation
is trustworthy up to the stated attestation floor; ceremony-rooted signing
keys are held in hardware security module or equivalent; Redis is available
for revocation propagation, with in-process cache fallback under conservative
time-to-live when unavailable. The OpenClaw instance itself is treated as
untrusted even when operated by the customer, reflecting both the 138-CVE
public record and the structural failure analysis of Section 1.2.

## 2.3 Threat paths in scope

Ten threat paths are in scope for structural defense by XSOC-NIE-GUARD. Each
is labelled T-01 through T-10 and tagged with its Franklin category.

**T-01, Prompt injection via messaging channel** (Franklin Content Injection
and Behavioural Control). Adversary posts to Telegram, Slack, Discord, or
WhatsApp content the agent will ingest. The OpenClaw MCP server retrieves it
into model context. The model is injected and emits tool-invocation
instructions against legitimate targets. Absent mediation, the injected
invocation executes under the agent's full capability. The public record on
CVE-2026-33579 pairing escalation composes with this path to produce full
administrative takeover in the common case.

**T-02, Plaintext credential theft at rest** (Franklin Behavioural Control
via credential reuse). The OpenClaw default configuration stores API keys,
OAuth tokens, bot tokens, and conversation memories in plaintext under a
well-known filesystem path. Commodity infostealer malware families (RedLine,
Lumma, Vidar, Atomic Stealer) documented by Hudson Rock are actively
harvesting this structure. A routine endpoint compromise escalates to
compromise of every connected enterprise service.

**T-03, Pairing privilege escalation** (Behavioural Control). CVE-2026-33579,
CVSS 8.1 to 9.8, allows any client with pairing-level access to escalate to
full administrative control via a bug chain. The escalated role inherits
every permission the OpenClaw instance holds.

**T-04, Malicious skill supply chain** (Content Injection via the skill
ingestion vector). The Koi Security audit found approximately twelve percent
of 2,857 audited ClawHub skills to be malicious [30]. The ClawHavoc campaign
distributed Atomic Stealer via affected skills. A skill loaded into an agent
executes with the agent's standing privileges.

**T-05, Browser pivot defeating loopback binding** (Behavioural Control). The
Conscia analysis of CVE-2026-33579 exploitation shows the exploit pivoting
through a victim browser, which means a loopback-bound OpenClaw is still
compromisable. Network topology is not a control.

**T-06, Honest-but-curious model vendor** (composes with Franklin Behavioural
Control data exfiltration traps). The model vendor reads prompt content from
logs, monitoring, or runtime infrastructure and extracts sensitive customer
data. This variant is not directly taxonomized by Franklin but composes with
their data exfiltration analysis.

**T-07, Insider administrator unilateral action** (Semantic Manipulation via
oversight evasion; Behavioural Control via policy relaxation). An
administrator with broker write access attempts a policy change to relax
enforcement, or attempts to issue credentials and silently expand role
definitions.

**T-08, Replay and time-of-check time-of-use on long-running operations**
(Behavioural Control). An attacker captures a valid capability token or
sealed envelope and replays it later or against a substituted target.

**T-09, Lethal trifecta interaction** (composes multiple Franklin categories
under the framing of Willison [3]). The agent has concurrent access to
private data, untrusted content, and external communication; the composition
permits silent exfiltration under prompt-injection influence.

**T-10, Agent intent drift** (Semantic Manipulation biased phrasing;
Behavioural Control embedded jailbreak). The agent holds a legitimate
capability for `tool.invoke`. A prompt injection changes the agent's
effective intent from `analyze` to `export`. The agent invokes the tool with
a legitimate target but for an illegitimate purpose. This class is
under-addressed in prior work and is the specific class our Agent Intent
Envelope construction targets (Section 5).

## 2.4 Threat paths explicitly out of scope

Three threat paths adjacent to Franklin categories are enumerated here as
scope boundaries rather than as paths we defend against structurally. Naming
them explicitly is part of the honest-scoping posture established in
Section 1.4.

**T-11, Persona hyperstition** (Franklin Semantic Manipulation). Self-
reinforcing narratives about a model's persona that feed back into its
behavior via retrieval and retraining. Per Shanahan and Singler [cited via
1] and the Anthropic documentation of the Claude spiritual bliss attractor
state [13], this phenomenon operates at the model's training-data level and
is not addressable by a runtime mediation layer. The mediation layer limits
the blast radius of a persona-drifted agent through intent binding and
dual-control but cannot prevent the drift itself.

**T-12, Systemic multi-agent failure modes** (Franklin Systemic category in
full). Congestion traps, interdependence cascades, tacit collusion,
compositional fragment traps, and cross-operator Sybil attacks [11]. These
require ecosystem-level coordination infrastructure (shared identity,
cross-operator Providence anchoring, aggregation-level semantic analysis)
outside the scope of a per-agent cryptographic mediation layer.

**T-13, Steganographic payloads in multi-modal content** (Franklin Content
Injection, the perturbation variant). Adversarial perturbations encoded into
legitimate images or audio that a multi-modal model processes. Our content
hash mechanism catches binary replacement but not perturbation-based attacks
within a single legitimate file. Scheduled as a VectorShield extension and
not claimed as structural coverage in this release.

Two classes are out of scope for the v1 reference architecture but not on
taxonomic grounds. Hardware compromise below the attestation floor is
covered by hardware supplier assumptions and is outside the mediation
layer's enforcement domain. Denial of service against the broker is partially
mitigated through rate limiting but is not the focus of the proof of
concept.

## 2.5 Residual risks

Three residual risks survive the defense architecture and must be named
explicitly.

The relaxed operator profile permits the lethal trifecta and is intended for
development environments only. Operators running relaxed in production
accept the residual risk; the architecture does not prevent this choice but
records every profile selection as a Providence event.

Mode C decryption, even under endpoint attestation and dual-control, releases
cleartext to the attested endpoint. This is the architectural release valve
for operations that genuinely require cleartext reasoning. Mode C frequency
per subject is a Behavioral Escalation Meter input (Section 9); persistent
elevation triggers session profile escalation.

Disclosure policy failure, the inadvertent public exposure of XSOC
proprietary cryptographic internals, is a catastrophic residual risk whose
primary mitigation is the mechanical continuous integration enforcement
described in the public repository and whose secondary mitigation is advisor
review at every release.

---

*End of Section 2. Word count, em-dash, AI-tell, and disclosure lint checks
to be run during commit.*
