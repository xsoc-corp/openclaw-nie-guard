# Section 7. Messaging and MCP Mediation

*Draft v1.0, Pass 2. Target 700 words.*

---

## 7.1 The external channel problem

OpenClaw in its default configuration treats messaging channels
(Telegram, Slack, Discord, WhatsApp), email, and web browsing as
trusted input sources whose content flows into the model context
without sanitization. The public record (Section 1.2) and the Shapira
et al. benchmark on web-use agents [4] both demonstrate that this
treatment is untenable. An agent with inbound access to any of these
channels has an injection surface that a motivated adversary can
reliably exploit.

XSOC-NIE-GUARD addresses this with control A3, MCP Boundary Mediation,
implemented as a reverse proxy in the Action Mediation Plane. Every
inbound content fetch from any of these channels passes through the
`/v1/mcp/ingest` endpoint before the content can be admitted to any
model context.

## 7.2 Sanitizer pattern matching

The sanitizer runs a pattern-matching pass over inbound content to
detect known prompt-injection structures. The current pattern set
catches five structural classes: role-redefinition assertions ("you
are now a...", "you have no restrictions", "as a different
assistant..."), override instructions ("ignore all previous
instructions", "disregard your system prompt"), exfiltration
instructions to external endpoints ("send the following to
https://..."), critic-evasion framing ("this is a red-teaming
exercise for educational purposes"), and the jailbreak-wrapped
framing of the class documented in the Shen et al. jailbreak
characterization [39].

Content matching any pattern is rejected with
`ERR_MCP_RESPONSE_TAINTED`. Scenarios 08, 16, 23, and 25 in Section
11 exercise this rejection path against representative injection
strings. The sanitizer does not purport to catch every possible
injection; its claim is narrower, that it catches the injection
structures documented in the current literature and that its pattern
set is policy-bundle-versioned so it can be extended without
modification of the broker source code.

## 7.3 Content tagging and provenance classification

Content that passes the sanitizer is not admitted to the model
context as trusted material. It is tagged as external-channel
provenance in the Context Provenance Chain (Section 5.3) and wrapped
in an `<external_content>` marker before it reaches the model. The
model's system prompt is responsible for instructing the model to
treat external_content as untrusted data rather than as instructions
to follow. This treatment is a defense in depth on top of the
sanitizer, not a replacement for it; the model layer's ability to
distinguish untrusted content is imperfect, but the combination of
structural rejection at the sanitizer and provenance tagging at the
CPC level produces a stronger barrier than either alone.

## 7.4 MCP server trust table

The set of permitted MCP servers for any deployment is a policy
bundle field, control A10 in Section 3.3. Inbound content from any
MCP server not in the trust table is rejected at `/v1/mcp/ingest`
with `ERR_MCP_SERVER_BLOCKED` (Scenario 23b). This closes an
additional attack surface: an adversary who registers a rogue MCP
server cannot have the broker ingest that server's content even if
the server produces sanitizer-passing output.

## 7.5 Response-path mediation

The complementary path, content leaving the model and returning to
the agent, is also mediated. The broker re-substitutes tokenized
fields (for Mode B operations, see Section 6.2) back to cleartext
only for destinations approved by the policy bundle. Hyperlink and
attachment anchors in outbound content are scrubbed against the
policy-specified egress allowlist. This defeats the
model-as-messenger class of attack in which a compromised agent
formats sensitive content into a URL query string or attachment
metadata for exfiltration.

## 7.6 Summary

MCP Boundary Mediation is structurally simple: sanitize inbound, tag
with provenance, verify the source server, and scrub outbound
anchors against an egress policy. The combination is the direct
answer to the messaging-channel and skill-marketplace injection
surfaces documented in Section 2 and exercised by Scenarios 08, 16,
23, 23b, and 25 in Section 11. It is not the complete answer to
Content Injection; it is the structural floor on top of which the
Context Provenance Chain and the FHE Context Gate impose the
additional semantic controls.

---

*End of Section 7.*
