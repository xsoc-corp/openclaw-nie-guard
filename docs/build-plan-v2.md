# OPENCLAW-NIE-GUARD — Build Plan v2

**Revision:** v2, strategic posture update
**Status:** Approved for execution at supreme-impact scope
**Changes from v1:** FHE-SDK promoted to Tier A lead primitive. All former Tier B items (CDT, BEM, Signed Policy Bundles, VectorShield, Compliance Map) promoted to Tier A mandatory. Strategic posture updated for post-acquisition landscape. Telegram vector added to threat model as concrete external-channel exploitation case.

---

## 0. Strategic Framing

The v1 plan treated OpenClaw as an untrusted execution surface that needed a cryptographic mediator. That framing stands, but the context around it has shifted materially. OpenAI ownership of OpenClaw means regulated buyers now face a single-vendor trust stack in which the model provider, the agent framework, and the execution context are all inside the same commercial boundary. This is not an acceptable posture for any regulated customer operating under NIST SP 800-53, SWIFT CSP, FedRAMP Moderate or High, ISO 42001, or EU AI Act Article 14.

The opening is therefore not "help secure OpenClaw." The opening is "hold the only keys that matter in an OpenAI-dominated agent ecosystem." This POC is the technical argument for that position. Every Tier A feature below is selected to make that argument irrefutable.

The hero technical claim: first commercial deployment of FHE in an AI agent flow, with honest benchmarks, independent validation, and four named regulated use cases. No other party in the AI security space can currently make this claim.

The hero commercial claim: a customer running OPENCLAW-NIE-GUARD can operate OpenClaw over sensitive data without OpenClaw (or OpenAI) ever possessing cleartext, without either party holding policy authority, and without either party controlling the audit record.

---

## 1. Revised Tier Structure

Tier A is now the entire delivery scope. Every item below ships in the POC.

### Tier A — Core (mandatory)

| # | Capability | Role |
|---|---|---|
| A1 | **FHE Context Gate** (new, hero) | Sensitive context never reaches OpenClaw in cleartext without policy-approved decryption event |
| A2 | Agent Intent Envelope | Binds stated agent purpose into TSTL envelope |
| A3 | MCP Boundary Mediation | Second untrusted surface covered; Telegram and similar external channels defended |
| A4 | Context Provenance Chain | Every context element has a Providence-anchored ID |
| A5 | Fail-Closed Streaming | Mid-stream termination on continuity failure |
| A6 | Dual-Control for Admin Actions | Co-sign via nie-enrollment ceremony for admin.control and exec.run |
| A7 | Shadow Mode and Attack Replay | Policy regression detection without production impact |
| A8 | Capability Derivation Tree | Sub-agent scoping via DSKAG derivation |
| A9 | BEM-Driven Adaptive Profile Escalation | Behavior-driven profile tightening |
| A10 | Signed Policy Bundles | Policies are signed artifacts with ceremony-rooted keys |
| A11 | VectorShield Integration | RAG chunks through VectorShield, composes with A1 |
| A12 | Compliance Control Mapping | Named-framework map as first-class artifact |

### Tier B — Roadmap (named timelines, post-POC)

| # | Capability | Target |
|---|---|---|
| B1 | SDD Diode Mode for scif profile | Air-gap deployments, 16th AF use case |
| B2 | Replay-Immune Nonce Merkle Lineage | Detects broker compromise |
| B3 | Full Prompt/Context Envelope (per-token provenance) | scif profile extension |
| B4 | CAISI Alignment Package | Direct submission to Carlson/Brown thread |

---

## 2. FHE Context Gate (A1) — Detailed Architecture

This is the hero feature. It deserves a full architectural section because it is novel and because it is the public-narrative anchor.

### 2.1 Design principle

OpenClaw, and by extension OpenAI, is a cleartext-hungry execution surface. The FHE Context Gate refuses that assumption. Sensitive context is classified at admission, encrypted under CKKS at the adapter boundary, and either operated on as ciphertext (where FHE semantics apply) or held encrypted until a policy-approved, Providence-logged decryption event. The gate is a policy enforcement point, not a blanket encryption layer.

### 2.2 Context classification

At admission, every context element is tagged with one of four classifications. Classification is bound into the TSTL envelope and into the Context Provenance Chain (A4).

- `public` — no restriction, flows to OpenClaw in cleartext
- `sensitive` — passes through FHE gate, Mode B default (tokenized) or Mode C with approval
- `regulated` — must pass through FHE gate, Mode A or Mode B only, Mode C requires dual-control cosign
- `classified-adjacent` — Mode A only, cleartext path is deny by default at every profile above relaxed

### 2.3 Processing modes

**Mode A — Full FHE.** Operation runs on ciphertext. OpenClaw and model endpoint never see cleartext. Applies to:

- Embedding similarity search
- Vector aggregations
- Certain structured numerical reasoning
- Statistical summaries
- Classification against reference vectors

Benchmarks (from XSOC FHE SDK production numbers, CKKS scheme):

- Encrypt: 40.28 ms
- Multiply: 1.29 ms
- Overhead target: acceptable for the operation classes above, measured per operation in Phase 7

VectorShield (A11) composes directly in Mode A. Retrieved chunks are FHE-encrypted by VectorShield before entering the retrieval pipeline, remain encrypted through similarity scoring, and decrypt only on Mode C transition.

**Mode B — Tokenized Substitution.** Sensitive fields in prompts are replaced with opaque tokens before OpenClaw sees the prompt. The model reasons over tokens. On the response path, the adapter substitutes cleartext back only for approved output destinations, with every substitution recorded as a Providence event.

This mode is the workhorse for most regulated-data text generation cases. The model does not need to comprehend the sensitive field; it needs to reference it. Account numbers, patient identifiers, classified-adjacent identifiers, client names all fit here.

**Mode C — Attested Cleartext.** Where free-form generation requires cleartext on the sensitive field itself (rare in well-designed flows), it happens only with:

- Attested model endpoint (inherits from TSTL device attestation semantics applied to the model runtime)
- Explicit per-request policy approval
- FHE-encrypted audit trail of the cleartext
- Providence decryption event as the audit anchor
- Dual-control cosign for regulated or classified-adjacent classifications

Mode C is the release valve. It should be the least-used path. Metrics per session and per subject track Mode C frequency; sustained high Mode C rate is a BEM input (A9) that triggers profile escalation.

### 2.4 Package structure

```
packages/fhe-gate/
├── src/
│   ├── classify.ts          # Context classification from admission tags
│   ├── mode-a.ts            # Full FHE pipeline
│   ├── mode-b.ts            # Tokenization and substitution
│   ├── mode-c.ts            # Attested cleartext gate
│   ├── ckks-bridge.ts       # Bridge to XSOC-FHE-SDK
│   ├── policy-binding.ts    # Policy engine integration
│   └── providence-hooks.ts  # Audit event emission
├── test/
└── package.json
```

The CKKS bridge invokes XSOC-FHE-SDK through its Java gRPC wrapper (the 5-10x performance path over JNI, per the existing stack). Node.js calls the wrapper; no native FHE linkage inside Node.

### 2.5 Launch use cases

Each bound to a live customer conversation:

| Use case | FHE mode | Customer thread | Differentiator |
|---|---|---|---|
| Storage-layer sensitive data, agent analysis | A | Pure Storage DIM | Data never decrypted at rest or in retrieval |
| Financial memo review with client PII | A + B hybrid | JPMorgan GTAR, SRI | Client-identifying fields never leave FHE envelope |
| PHI retrieval and aggregation | A | Healthcare vertical | HIPAA posture without trusting model vendor |
| Classified-adjacent context, one-way output | A + SDD (B1) | 16th AF air-gapped | No cleartext in, no return channel out |

### 2.6 Public narrative

This is the first commercial FHE deployment in an AI agent flow. No other vendor in the AI security space has put FHE into production in this context. The surrounding credibility wall includes Cal Poly San Luis Obispo Dieharder v3.31.1 at 99.4 percent aggregate across 98 tests, Perrin and Biryukov audits of the legacy XSOC cryptosystem at the University of Luxembourg in 2020 and 2024 (predating DSKAG, with mandatory findings incorporated into the canonical build), and GMU SENTINEL FP5223 (full report June 2026). Competitive disambiguation from FHE-washing (DataKrypto's FIPS cert is SafeLogic rebranding of standard algorithms, not FHE; their zero-overhead claim is mathematically impossible) is direct and defensible.

Publication vehicles:

- Zenodo companion paper to the QSIG/CGA pair, with DOI reservation
- arXiv cs.CR candidate (strengthens the endorsement ask already in motion)
- NIST CAISI submission extension through the Carlson/Brown thread
- RSA Conference 2027 submission if timing fits
- LinkedIn thought leadership sequence, including commentary from Avanzi and Aranha audience
- Direct competitive response post to EternaX positioning

---

## 3. Revised Architectural Section

The five-plane decomposition from v1 stands. Additions:

### 3.1 New plane interaction: FHE transverses all planes

The FHE Context Gate is not a sixth plane. It is a transverse primitive that binds into:

- **Client Trust Plane** — classification tags originate here
- **Admission Plane** — broker validates classification-to-role compatibility at admit time
- **Action Mediation Plane** — gate enforces mode selection per operation
- **Runtime Continuity Plane** — TSTL envelope carries classification hash; drift triggers mode downgrade denial
- **Audit and Revocation Plane** — every mode transition is a Providence event

### 3.2 Updated threat model additions

New threat paths added for the v2 scope:

| # | Threat | Actor | Control |
|---|---|---|---|
| T-12 | Model vendor extracts sensitive context for training or logging | OpenAI as honest-but-curious operator | FHE Context Gate (A1) Mode A/B; Mode C only with explicit policy approval |
| T-13 | External messaging channel exploitation (Telegram class) | Adversary with access to MCP server backing a messaging provider | MCP Boundary Mediation (A3) with response sanitization and external content tagging |
| T-14 | Hyperscaler insider access to prompt logs | Privileged operator at model vendor | Mode A/B leave no cleartext for insider to read; Mode C decryptions are Providence-anchored and dual-controlled at regulated and classified-adjacent levels |
| T-15 | Policy rewrite by attacker with broker write access | Compromised admin or supply-chain implant in broker deployment | Signed Policy Bundles (A10) with ceremony-rooted signing key |
| T-16 | Session drift toward exfiltration over long workflow | Prompt-injected agent, slow-burn data exfiltration | BEM (A9) with adaptive escalation; Mode C rate as BEM input |
| T-17 | Sub-agent scope widening | Multi-agent orchestration with flat capability reuse | Capability Derivation Tree (A8) with strict narrowing |

### 3.3 Telegram-class external channel threat

Called out specifically because you flagged it. The pattern: an MCP server that bridges to an external messaging channel (Telegram, Slack, Discord, email, SMS) introduces an attacker-controlled input path. Adversary posts content to the channel; OpenClaw's MCP server ingests it; the ingested content enters the model context; the model is prompt-injected through the channel content; the injected model uses legitimate capabilities against legitimate targets for adversary purposes.

Controls stacked against this class:

- **A3 MCP Boundary Mediation** — every MCP response passes through the broker's reverse-mediation proxy, scanned for injection patterns, tagged as `<external_content>` for the model's system prompt to treat skeptically
- **A2 Agent Intent Envelope** — the agent's declared intent is bound before the MCP response is fetched, so post-fetch intent drift is detectable
- **A4 Context Provenance Chain** — every MCP-sourced content element has a Providence-anchored ID and is marked as `external` provenance class
- **A1 FHE Context Gate** — MCP content touching sensitive data surfaces is classified before being admitted to the context, and is not permitted to cross Mode C without approval
- **A9 BEM** — anomalous MCP ingestion patterns are baseline inputs; a session that suddenly starts pulling large volumes of external-channel content is escalated

Send the specific Telegram advisory or internal writeup and I will map each identified exploitation step to a specific broker deny path with test coverage in the attack sim.

---

## 4. Revised Execution Sequence

Phase structure from v1 retained. Adjustments:

- **Phase 0 (threat model, policy drafts)** extended to 1.5 days to include FHE classification schema and Telegram-class threat path.
- **Phase 2 (NIE bindings abstraction)** extended to 1.5 days to include FHE bridge into the binding surface (`encryptContext`, `decryptResponse`, `enforceMode`). FHE is a first-class binding, not an adapter concern.
- **Phase 3 (shared packages)** extended to 3 days. Four parallel packages (shared-types, policy-engine, tstl-envelope, providence-log) plus the FHE gate package (fhe-gate). Policy engine gains classification-to-mode mapping responsibility.
- **Phase 5 (adapter)** extended to 2.5 days. Adapter must invoke FHE gate on every forwarded operation and handle mode-specific request/response shapes.
- **Phase 7 (tests)** extended to 3 days to include FHE-mode-specific attack scenarios and Mode C dual-control paths.
- **Phase 8 (former enhancement phase)** collapses. Enhancements are no longer a discrete phase; they are embedded in the core phases.
- **Phase 9 (docs)** extended to 2.5 days. Compliance map becomes substantial; Zenodo draft paper for FHE use case produced here.

**Revised total critical path:** approximately 15 working days for full Tier A delivery. This is a real POC with novel cryptographic integration, not a surface demo.

---

## 5. Revised Compliance Map

With FHE as hero and full Tier A in scope, the compliance map now covers these framework pairings directly. Each Tier A item maps to specific control families; this is the customer-facing artifact.

| Framework | Primary controls addressed | POC artifacts that demonstrate |
|---|---|---|
| NIST AI RMF 1.0 | GOVERN-1, GOVERN-4, MAP-5, MEASURE-2, MANAGE-2 | All Tier A items; compliance-map.md; attack-sim reports |
| OWASP LLM Top 10 (2025) | LLM01 (Prompt Injection), LLM02 (Insecure Output Handling), LLM03 (Training Data Poisoning, via context provenance), LLM06 (Sensitive Info Disclosure), LLM07 (Insecure Plugin Design, via MCP mediation), LLM08 (Excessive Agency), LLM10 (Model Theft, via FHE for sensitive context) | A1-A12 collectively; narrative-ready |
| NIST SP 800-53 Rev 5 | AC-3, AC-3(2), AC-4, AU-2, AU-10, AU-14, IA-2, IA-4, SC-8, SC-12, SC-13, SC-28, SI-7 | Signed bundles, Providence, FHE, dual-control |
| ISO/IEC 42001 AIMS | 6.1.2, 6.1.3, 6.1.4, 8.2, 8.4, 9.1 | Policy engine + Providence + compliance map |
| EU AI Act | Article 14 (human oversight), Article 15 (accuracy, robustness, cybersecurity), Article 50 (transparency) | Dual-control, continuity profiles, audit chain |
| FedRAMP Moderate | AC, AU, IA, SC, SI baseline overlays | Full Tier A posture |
| SWIFT CSP v2025 | 1.2, 1.4, 5.1, 5.2, 6.1, 6.4 | Dual-control, audit, signed policy, FHE for financial fields |
| HIPAA Security Rule | 164.312(a)(1), 164.312(b), 164.312(e)(1) | FHE for PHI, Providence, access controls |

This map is the compliance-map.md artifact and will be the lead pre-sales document.

---

## 6. Revised Demo Scenarios

Original 13. Additions for v2:

| # | Scenario | Validates |
|---|---|---|
| 14 | Regulated-classification context forced into Mode C without dual-control | A1 FHE gate + A6 dual-control composition |
| 15 | Mode A embedding similarity search on FHE-encrypted RAG chunks | A1 + A11 VectorShield composition |
| 16 | Telegram-class MCP server delivers prompt-injected content | A3 MCP mediation + A2 intent envelope + A9 BEM |
| 17 | Sub-agent attempts capability use outside derivation-tree scope | A8 CDT enforcement |
| 18 | Policy bundle swapped in Redis with forged signature | A10 signed bundle verification |
| 19 | Long-running session with slow drift toward exfiltration pattern | A9 BEM adaptive escalation across profiles |
| 20 | Honest-but-curious model endpoint attempts to log Mode A context | A1 Mode A no-cleartext guarantee; verification via Providence plus model-endpoint attestation check |

Twenty total scenarios. Attack sim runs in under 90 seconds end-to-end.

---

## 7. Revised Risk Register

Additions for v2 scope:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FHE overhead breaches latency budget on Mode A operations | Medium | Medium | Published benchmarks honest; Phase 7 measures per operation; fallback to Mode B with explicit policy marker rather than Mode C |
| XSOC-FHE-SDK integration surfaces Java gRPC wrapper version drift | Medium | Medium | Pin SDK version; integration test in CI; wrapper is 5-10x faster than JNI so this is the path not an alternative |
| VectorShield-FHE composition introduces double-encryption performance cost | Low | Medium | VectorShield operates on FHE ciphertext; validate composition semantics in Phase 3 |
| Signed policy bundle key ceremony delays delivery | Medium | High | Manual key in v1 with ceremony in follow-on; bundle verification logic ships complete |
| BEM baseline insufficient at launch (no history) | High | Low | Ship with conservative default baseline and bootstrap period; escalation disabled for first 72 hours of any new session subject pair, deny-on-anomaly afterward |
| OpenAI-owned OpenClaw changes API in ways that break adapter | Medium | Medium | Adapter isolation is already a design principle; version-pin against a known OpenClaw release; document upgrade path |

---

## 8. Open Questions

Items that block nothing but sharpen the work if answered soon:

1. **Telegram exploit specifics.** Advisory, internal writeup, or public reference. Needed to attach test case to scenario 16 with real attack shape rather than generic MCP-injection template.
2. **OpenClaw version target.** Pin against which release. Affects adapter surface.
3. **Tier B priority.** Of B1 through B4, which is the first post-POC commitment. My recommendation: B4 CAISI alignment first (leverages Carlson/Brown thread and turns the POC into a government-facing reference), then B1 SDD diode mode for 16th AF.
4. **Public repo split.** OPENCLAW-NIE-GUARD as public reference architecture (maximum narrative leverage) or xsoc-corp private (preserves commercial differentiation). My recommendation: split. Public reference repo with the broker interface and mock NIE bindings, private production repo with full NIE and FHE integration. This is the same pattern used for xsoc-qsig-cga public release.
5. **Zenodo companion paper authorship.** Solo or co-authored with GMU collaborators who did SENTINEL FP5223. Co-authorship strengthens the credibility wall.

---

## 9. Next Actions

Immediate:

- Approve Tier A scope as delivered above
- Provide Telegram exploit specifics if available
- Confirm OpenClaw version target
- Confirm public/private repo split decision

On approval of the above, execution begins with Phase 0 (threat model and policy drafts including FHE classification schema and Telegram threat path), Phase 1 (monorepo and workspace), and Phase 2 (NIE bindings with FHE bridge integration).

Target: full Tier A delivery in 15 working days. First demo-ready milestone at day 10 (Phases 0-5 complete, initial scenarios running). Full 20-scenario attack sim at day 13. Documentation and compliance map complete at day 15.

---

## 10. Closing

The v1 plan produced a strong security layer. The v2 plan produces a strategic asset. The difference is scope, posture, and publication path. FHE in production is the lever that moves this from "a POC" to "the reference implementation the market will cite," and the OpenAI-owned OpenClaw context is the moment that makes that argument land without effort.

The single highest-leverage lever in v2 remains A1 (FHE Context Gate). If any single item determines whether this POC lands as a market-defining artifact or a well-engineered side project, it is that one. Everything else in Tier A supports it.
