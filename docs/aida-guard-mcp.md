# AIDA-Guard for MCP: the Guard, its checks and its record

AIDA-Guard is XSOC's agent governance product. MCP is a transport, and the Guard is AIDA-Guard's binding to it: one enforcement point in front of the tool servers an agent reaches. This document describes the Guard at the level of its capabilities and the properties it holds. Its implementation is in XSOC's production deployment repository; `docs/what-stays-private.md` says what stays there, and why.

## Conformance

The Guard conforms to **XSOC-MCP-DN-001 v1.3**, *Agent Capability Enforcement for MCP* (November 2026), and its Appendix A, the canonical check names. The note as issued has SHA-256 `55a1efcfde7645ca1f781f47d0ce02a4fec93e91687374b8accdbc1253416370`. A Guard conforms only if it records exactly the names below.

Every decision is one record on a Providence chain, record encoding v3 (`docs/providence-record-v3.md`). The known-answer vectors, `packages/providence-log/test/vectors/guard-providence-v3.json`, are byte for byte the ones the production writer and the offline verifier test against.

## The thesis

Software cannot read a model's mind to decide whether a plan is malicious or merely creative, so the Guard does not try. The agent carries a capability token that names exactly which tools it may call, under which argument constraints. A compromised orchestrator acts only within that grant, whatever it was persuaded to attempt. Prompt injection can succeed at the semantic layer and still fail at the authority layer.

The enforcement point is `tools/call`.

## Placement

The Guard terminates MCP from the client and re-originates to the servers. One Guard may front several servers.

**What is trusted:**
- the Guard;
- the authority that mints tokens, bound to the Nexus Identity Engine;
- the epoch registry, whose increment revokes every outstanding token of a tenant at once;
- Providence, which seals every decision.

**Outside the trust boundary:** the host, the agent and every MCP server. A server is untrusted because a malicious server is a live attack path in MCP: it can return content designed to steer the agent's next action.

**Where the key lives:** the Guard runs apart from the agent and from each server. Its key is out of their reach. The key a Guard holds serves that Guard alone, so the loss of one Guard's key is the loss of one Guard.

## Authority separation

Authority is split across parties that do not hold one another's keys. Each holds only what its own part needs:
- **The agent carries authority it cannot change.** It holds a token, never a key. A token whose content is altered fails `tag_verifies`.
- **Granting is held apart from enforcing.** Tokens are minted by an authority bound to an identity enrolled in the Nexus Identity Engine. The Guard checks tokens and does not issue them.
- **Each Guard's key serves that Guard alone,** so a key taken from one Guard is no use at another.
- **Servers hold no authority.** The Guard removes the token before it relays a call, so no server receives it or can replay it. What a server receives is the Guard's own serialization of the arguments the checks evaluated.
- **Revocation is held apart from both.** Advancing a tenant's epoch revokes its tokens whatever they say.
- **The record is held apart from the token.** The Guard anchors its chain under a signing key separate from the key that checks tokens, and a TPM outside the Guard certifies the chain's head.

## What the token grants

Each grant names a `(server, tool)` and the constraints its arguments must satisfy. The token also states:
- the Guard it is for;
- the client endpoint it is for, where the transport names one;
- when it is valid;
- the assurance floor of the session it was minted from;
- the epoch of its tenant;
- a call budget per grant.

**The constraints are structural predicates over typed arguments.** They are deterministic and terminating, with no model in the path:
- string prefix and suffix;
- an anchored regular expression, size-bounded;
- membership in a set;
- numeric and integer range;
- array length;
- lexical path containment;
- absence.

**Where the constraints stop.**
- A path within `/srv/reports` is in scope. Whether an email body amounts to exfiltration is a judgment for the output boundary, which EXIOM governs.
- Path containment is lexical: it resolves `.` and `..` against a fixed root as a pure function of the string. Symbolic links are resolved by the server's own root confinement, which is the second line for that case.

## The decision path

The checks run in three phases. Every check is fail-closed, and a check that errors denies.

| Phase | Name | Passes when | Recorded on failure |
|---|---|---|---|
| 1 | `token_present` | A token is present on the request | `Absent` |
| 1 | `token_well_formed` | The token is within its size limit and well formed, with a known claims version | `TooLarge`, `Malformed`, `Version` |
| 1 | `tag_verifies` | The token's tag verifies under the key for the tenant and audience it names | `TenantMismatch`, `AudienceMismatch`, `Signature`, `Provider` |
| 2 | `audience` | The token names this Guard | `AudienceMismatch` |
| 2 | `endpoint_match` | The token names the endpoint the call arrived on; it runs only where the transport names one | `EndpointMismatch` |
| 2 | `time` | The current time is within the token's validity, with leeway at the start only | `NotYetValid`, `Expired` |
| 2 | `tool_granted` | A grant names the requested `(server, tool)` | `ToolNotGranted` |
| 2 | `constraints` | The arguments satisfy every constraint of a matching grant | `ConstraintViolated`, or `ToolNotGranted` when no grant names the tool |
| 2 | `floor` | The token's floor is at or above the Guard's minimum | `FloorBelowMinimum` |
| 3 | `epoch` | The token's epoch is the one the Guard holds for its tenant | `EpochStale` |
| 3 | `budget` | The matched grant's call budget is not spent | `BudgetExhausted` |

How the phases run:
- **Phase 1** is unauthenticated, and stops at its first failure: nothing in the token can be trusted until its tag verifies.
- **Phase 2** is authenticated and local. Every check in it runs and is recorded, whether or not an earlier one failed, so the record says everything wrong with a request, not only the first thing.
- **Phase 3** is stateful, and runs only after a clean phase 2.

**The pre-check.** A `tools/call` whose tool name is not a string, or whose arguments are not an object, is refused before the checks run. Over HTTP, so is a `tools/call` whose headers disagree with its body. It is recorded under its own name, `request_malformed`, so the checks keep their names.

## Record, then forward

- **The record comes first.** The decision is appended to the chain and sealed before anything is forwarded. A forwarded call always has a record that predates it.
- **A decision that cannot be recorded is refused.** Once the chain writer has failed, it refuses every later append, so the Guard refuses every later call.
- **Anchors fail closed too.** An anchor that fails twice stops the chain.

**Every refusal is the same refusal.** It is the JSON-RPC error `-32001` with message `refused` and no `data` member, identical in its bytes whatever the cause. Which check refused is in the record, where a defender can read it and an attacker cannot.

## The record

| Event type | When |
|---|---|
| `invoke` | A forwarded call |
| `invoke_refused` | A refusal. Its reason code names the first failed check in decision order, or `request_malformed` |
| `server_request_refused` | A request a server sent toward the client, refused back to the server, with reason code `server_initiated` |

What else the record carries:
- **The decision vector:** every check that ran, in order, with `pass` or the error that failed it.
- **Where the call went:** the server the call addressed, the tool, and the digest of its arguments.
- **What the path check saw:** where a grant has a path constraint, the path that check evaluated.
- **How it arrived,** over HTTP: the endpoint and the protocol revision.
- **Long tool names:** a tool name over 128 bytes cannot match a grant and is not written into the chain. The record carries its SHA-256 instead.

**How the chain is protected:**
- **Anchors:** ML-DSA-65 signatures over the chain's head, made by the Guard.
- **Checkpoints:** a TPM certifies the chain's head under a nonce chained from the previous checkpoint, and the endorsement certificate ties the part to its maker.

An offline verifier checks:
- the encoding, the linkage and the head;
- every anchor, against a pinned key;
- every checkpoint, against pinned roots, the endorsement key and the attestation key.

The verifier, `xsoc-audit-verify`, is published as binaries in XSOC AIDA-Guard's Zenodo record, https://doi.org/10.5281/zenodo.19685360, beside their license notice. `evidence/aida-guard-hosted-checkpoint-1` is a set you can check with it yourself.

## Transports

**stdio.** The token rides in the request's `_meta`. No endpoint is named, so `endpoint_match` does not run.

**Streamable HTTP.** One endpoint serves two protocol revisions:
- **MCP 2026-07-28,** where every request describes itself in its headers;
- **the 2025-11-25 handshake,** for clients that open with `initialize`. Its sessions are bounded in number, and each ends with the token presented on it.

**Where the token rides over HTTP.** The token rides in `X-XSOC-Agent-Token` or in `Authorization: Bearer`, and either is accepted. Carriers on one request must agree, or `token_well_formed` fails.

**The body is what the Guard acts on.** The Guard never routes on the headers. A header that disagrees with the body is refused, so a header claiming one method cannot carry a call to another.

**What reaches a server, and what reaches the client:**
- **Relayed:** only `tools/call`, and a cancellation, go to the server that holds the call.
- **Answered by the Guard itself:** the session methods.
- **Refused:** every other client request.
- **Server requests** toward the client are refused back to the server and recorded.
- **Server responses** reach the client only when they answer a call forwarded to that same server, so one server cannot answer for another.

## Revocation

Each tenant has an epoch. Advancing it revokes every outstanding token of that tenant at once: their next call is refused at `epoch`. The Guard holds the current epoch and refreshes it, and it refuses every call when the epoch it holds is older than its bound allows.

## Where the Guard's responsibility ends

- The Guard decides authority. Judging intent, inspecting responses and scoring behavior belong to other layers: EXIOM governs the output boundary, and XEI scores exposure.
- A grant is the operator's statement of what the agent may do, and the Guard enforces it exactly; writing grants well is the operator's real work.
- The agent sees every tool its servers offer and is answered at the call.
- The Guard is the enforcement layer a platform stands on.

XSOC Corp. XSOC's approved-algorithm cryptography runs through AWS-LC in FIPS-approved mode today, and the XSOC cryptographic module is in CMVP validation with Leidos.
