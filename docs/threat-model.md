# Threat Model

**Version:** 0.1.0 (Phase 0 draft)
**Scope:** OPENCLAW-NIE-GUARD broker, adapter, and associated plane primitives.

This is the initial threat model produced in Phase 0. It is a living document and
will be updated as implementation proceeds.

## 1. Assets

- Subject identity (user plus device pair, attested at admission)
- Capability tokens (short-TTL derived artifacts)
- Session nonce lineage
- TSTL continuity envelopes
- Policy bundles (signed artifacts)
- Providence audit chain
- Sensitive context (user prompt content, RAG chunks, tool outputs, MCP responses)
- Cryptographic keys (NIE-resident, never leave trust boundary)

## 2. Actors

### 2.1 Legitimate actors

- Enrolled user on an attested device
- Operator running the broker
- Auditor with read access to Providence chain
- Admin with co-sign authority

### 2.2 Adversaries

- **A1 External prompt injector.** Posts content to a Telegram/Slack/Discord channel, sends
  email, or publishes a web page whose content is later ingested by the agent.
- **A2 Compromised OpenClaw instance.** Instance is running unpatched, pairing privilege
  escalated, or running malicious ClawHub skills (ClawHavoc class).
- **A3 Malicious skill author.** Publishes a skill to ClawHub that exfiltrates data once
  loaded into an agent's context.
- **A4 Honest-but-curious model vendor.** Operates the LLM API and has access to prompts
  and responses in transit and at rest in their logs.
- **A5 Insider admin.** Has legitimate administrative access to the broker deployment
  and attempts unilateral action outside policy.
- **A6 Network adversary.** On-path or local LAN; can attempt replay, capture, or tamper.
- **A7 Stolen device.** Legitimate device in attacker hands post-theft.
- **A8 Supply chain implant.** Malicious code in a dependency that attempts to
  compromise the broker at runtime.

## 3. Assumptions

- NIE cryptographic primitives are sound (interface-level assumption; externally
  validated by University of Luxembourg, Cal Poly SLO, GMU SENTINEL)
- Device attestation is trustworthy up to the stated attestation floor
- Ceremony-rooted signing keys are held in HSM or equivalent
- Redis is available for revocation propagation (fallback to in-process cache
  with conservative TTL if unavailable)
- OpenClaw instance is treated as untrusted even when operated by the customer

## 4. Threat Paths

### T-01 Prompt injection via messaging channel (Telegram, Slack, Discord, WhatsApp)

**Public reference:** Coverage of OpenClaw structural exposure across messaging integrations
in early 2026 (Prime Rogue, Adversa, Startup Fortune). CVE-2026-33579 pairing escalation
composes with this path to produce full admin takeover in the common case.

**Attack shape:**

1. Adversary posts content to a messaging channel the agent ingests
2. OpenClaw MCP server retrieves the content and includes it in the model context
3. Model is prompt-injected and emits tool-invocation instructions against legitimate targets
4. Absent mediation, injected tool invocation executes with the agent's full capability

**Controls:**

- A3 MCP Boundary Mediation: every MCP response sanitized; external content tagged
- A2 Agent Intent Envelope: agent's declared intent is bound before MCP fetch; post-fetch
  intent drift detected
- A4 Context Provenance Chain: every MCP-sourced element registered and classified as external
- A1 FHE Context Gate: MCP content touching sensitive data classified before admission to context
- A9 BEM: anomalous ingestion patterns escalate session profile

### T-02 Plaintext credential theft at rest

**Public reference:** OpenClaw stores API keys, OAuth tokens, bot tokens, and conversation
memories in plaintext under ~/.openclaw/. Hudson Rock warned that RedLine, Lumma, and Vidar
malware families are already harvesting these file structures.

**Attack shape:**

1. Endpoint compromise via infostealer malware
2. Malware harvests ~/.openclaw/ filesystem
3. Attacker replays harvested credentials against external services

**Controls:**

- XSOC-NIE-GUARD never stores credentials on the client at rest
- Capability tokens are short-TTL (default 15 minutes, configurable)
- Device revocation invalidates all outstanding tokens

### T-03 Pairing privilege escalation

**Public reference:** CVE-2026-33579 (CVSS 8.1-9.8). Lowest permission level
("pairing privileges") escalates to full administrative control in unpatched OpenClaw.

**Attack shape:**

1. Attacker obtains pairing-level access (physical, LAN, or via browser pivot)
2. Exploits bug chain to escalate to admin role
3. Inherits every permission the OpenClaw instance holds

**Controls:**

- Enrollment co-sign ceremony for all pairing operations
- A6 Dual-Control on admin.control and exec.run
- A10 Signed policy bundles: role expansion is a bundle change, not a runtime flag
- A8 CDT refuses sub-capability widening

### T-04 Malicious skill supply chain (ClawHub / ClawHavoc / AMOS)

**Public reference:** Koi Security audit found approximately 12% of 2,857 audited
ClawHub skills to be malicious. ClawHavoc campaign distributed Atomic Stealer.

**Attack shape:**

1. Adversary publishes malicious skill
2. Agent loads skill during ordinary operation
3. Skill exfiltrates credentials or tampers with agent behavior

**Controls:**

- A10 Signed policy bundles extended to cover skill manifests
- Skill registration requires signature from trusted signer key
- Unsigned or blocked-classification skills rejected at broker admission of any capability
  referencing them

### T-05 Browser pivot defeating loopback binding

**Public reference:** Conscia analysis of CVE-2026-33579 exploitation. Even when OpenClaw
is bound to localhost, the exploit pivots through the victim's browser, meaning the
gateway does not need to be internet-facing to be compromised.

**Attack shape:**

1. Victim visits attacker-controlled web page
2. Browser pivot initiates request to localhost OpenClaw
3. Exploit completes through same-origin confusion or CSRF variant

**Controls:**

- NIE device attestation at admission edge
- Network topology (loopback, LAN) is not a control in this architecture
- Device fingerprint binding in TSTL envelope rejects mismatched origin

### T-06 Honest-but-curious model vendor

**Attack shape:**

1. Model vendor (or their insider) reads prompt content from logs, monitoring, or runtime
2. Extracts sensitive customer data

**Controls:**

- A1 FHE Context Gate Mode A: model vendor never sees cleartext for Mode A operations
- A1 Mode B: sensitive fields tokenized; vendor sees opaque tokens
- A1 Mode C: cleartext release requires endpoint attestation, policy approval, and
  Providence-logged decryption; dual-control for regulated classification

### T-07 Insider admin unilateral action

**Attack shape:**

1. Admin with broker write access attempts policy change to relax enforcement
2. Admin attempts to issue credentials or silently expand role definitions

**Controls:**

- A10 Signed policy bundles: bundle swap requires ceremony-rooted co-signed key
- A6 Dual-control on admin.control
- Providence log: every admin action is tamper-evident; truncation detectable via anchor

### T-08 Replay and TOCTOU on long-running operations

**Attack shape:**

1. Attacker captures a valid capability token or envelope
2. Replays at a later time or with a substituted target

**Controls:**

- Short-TTL tokens
- Nonce lineage in TSTL envelope with counter monotonicity
- Target hash binding in envelope

### T-09 Lethal trifecta interaction (Willison)

**Attack shape:**

1. Agent has concurrent access to private data, untrusted content, and external
   communication
2. Composition of the three permits silent exfiltration under prompt-injection influence

**Controls:**

- Profile composition:
  - relaxed: trifecta permitted (dev only)
  - standard: trifecta permitted but context breaks forced via envelope counter
  - strict: private data Mode A/B only; external communication requires intent match
  - scif: private data and external communication mutually exclusive in a session

### T-10 Agent intent drift (prompt injection exploiting legitimate capability)

**Attack shape:**

1. Agent has legitimate capability for tool.invoke
2. Prompt injection changes agent's effective intent from analyze to export
3. Agent invokes the tool with a legitimate target but for an illegitimate purpose

**Controls:**

- A2 Agent Intent Envelope: intent_class bound into TSTL; adapter enforces class alignment
  with operation class per OPERATION_TO_INTENT map

## 5. Out of Scope (for v1 POC)

- Hardware compromise below attestation floor (covered by hardware supplier assumptions)
- Denial of service against the broker (mitigated with rate limiting but not the POC focus)
- Side-channel attacks on broker runtime memory (future work)
- Quantum-capable adversaries against non-PQ components (NIE PQ path available; deployment
  flag)

## 6. Residual Risks

- Relaxed profile permits the lethal trifecta. Operators running relaxed in production
  assume the risk.
- Mode C decryption, even with attestation, leaks cleartext to the attested endpoint.
  This is the release valve and is expected to be rare. Metrics on Mode C frequency
  per subject drive BEM escalation.
- Disclosure policy failure is a catastrophic risk (loss of trade secret IP). Mechanical
  CI enforcement is the primary mitigation; advisor review is the secondary.
