# The disclosure boundary: what is published, what is held, and why

This repository publishes AIDA-Guard at the level of its capabilities and the properties it holds, and this page states the boundary. What it publishes:
- the Guard's checks and their canonical names (`docs/aida-guard-mcp.md`);
- the Providence record format with its known-answer vectors (`docs/providence-record-v3.md`);
- the reference broker and its mock bindings;
- an evidence set anyone can verify (`evidence/aida-guard-hosted-checkpoint-1`).

What follows stays in XSOC's private repositories and systems. `docs/disclosure-policy.md` sets the rules, and the disclosure lint enforces them in CI. This page adds the AIDA-Guard v3 items and the reason for each.

| Stays private | Why | What is public instead |
|---|---|---|
| **The production deployment repository:** the Guard's implementation, the console, the launcher and the deployment files | It links the production primitives and carries the deployment's configuration. The public reference implementation substitutes mock bindings at a fixed seam (`docs/disclosure-policy.md`, "Substitution seam"). | The checks and their names, the record format, the vectors, and the transports' behavior |
| **The capability token's construction:** its encoding, its tag, its key selection and its key derivation, with their labels | These are construction internals of XSOC primitives. Publishing a derivation's labels would publish part of the construction. | What a token grants and what each check establishes |
| **The design notes,** XSOC-MCP-DN-001 and XSOC-AG-DN-002 | They carry the token's construction and the deployment's operational detail beside the design. | The conformance pin: XSOC-MCP-DN-001 v1.3 by version and SHA-256, and its Appendix A names |
| **The offline verifier's source,** `xsoc-audit-verify` | The Zenodo v3 brief publishes the verifier as binaries, and its source stays private. | The verifier's binaries, as files in XSOC AIDA-Guard's Zenodo record beside their license notice, with their build and SHA-256s; and the record format and the vectors, from which an independent verifier can be built and tested |
| **The TPM checkpoint producer** and its hardware integration | It holds the part's integration and its key handling. | The checkpoint format, the pins, and checkpoints anyone can verify |
| **Nexus Identity Engine, TrustLayer and XSOC FHE SDK internals** | They are proprietary primitives (`docs/disclosure-policy.md`, "Private"). | Their interfaces and stated security properties, through the mock bindings |
| **Key ceremonies and key custody:** where keys are made and kept, and the names of the stores and the secrets | Custody details are an attack surface and verify nothing. | Public keys only, each checked against the anchors it signs before it is published |
| **Deployment identifiers:** resource names, addresses, vault and share names | They describe where to aim, and nothing a reader verifies depends on them. A build host's name inside an already-published test vector is outside this line: a published vector is not changed, and the name is not a secret. | Nothing; none is needed |
| **Operator tooling for XSOC's hosted deployments:** the operator routes, their credentials and the scheduled checkpoint pass | It acts on live deployments under operator credentials. | The evidence it produces |
| **Evidence that carries bearer values:** records with session handles or tokens, and the secrets files a deployment uses | A session handle or a token is a bearer value, and does not belong in anything published, expired or not. A record's digest covers it, so it cannot be removed from a chain that must still verify. | Chains whose records carry none, checked before publication |
| **People's data:** names, email addresses and organizations of anyone who asked for access | It is personal data. | Nothing |
| **Customer policy bundles and deployment configurations** | They belong to customers (`docs/disclosure-policy.md`). | The bundle format at the schema level, and the default development bundle |

**How a public evidence set is checked.** XSOC publishes a set only after a check, run from the private side, passes:
- it holds no member that carries a secret and no secret file form;
- it holds no private key or seed, and every key in it is one of its pinned public keys;
- it holds no construction label and no deployment identifier;
- every opaque value in it is a digest, a public key, a signature, a public TPM structure or an identifier;
- no string in it is an operator token, which the check tells by each token's SHA-256, never the token.

The check's own list of labels stays private, since publishing it would publish them.
