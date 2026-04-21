# Section 6. FHE Context Gate

*Draft v1.0 for quality review before pattern extension to Sections 2-5, 7-14.
Target 1,600 words. Current count: approximately 1,650.*

---

## 6.1 Motivation: the residual cleartext problem

The mediation controls described in Sections 4 and 5 address three of the four
axes of agent compromise. Admission and capability derivation bound what an
agent is permitted to do. Runtime continuity and intent binding bind the agent
to the operation it declared, defeating post-admission capability reuse. A
fourth axis remains: the content of the model's reasoning context itself.

Any large language model agent, regardless of how narrowly scoped its
capabilities, must receive its operating context as tokens that the model can
attend to. This reasoning context typically contains the user's current
instruction, retrieved material from retrieval-augmented generation or tool
outputs, and recent conversational history. When that context contains
regulated data (personally identifiable information, protected health
information, payment card data) or sensitive organizational material, three
distinct exposures apply. First, the model vendor operates infrastructure that
sees the prompt in cleartext; transport encryption protects the tokens in
transit but not during model inference, creating both a compliance surface
(HIPAA Business Associate status, PCI cardholder data environment extension,
GDPR data processor obligations) and a residual technical surface (vendor-side
logging, debugging artifacts, model training pipelines that may or may not
honor retention policies). Second, a compromised or prompt-injected agent may
egress context into adversary-controlled channels under the correctly-scoped
capability set it legitimately holds; the Franklin et al. taxonomy [1]
classifies this class under Content Injection and Cognitive State. Third,
multi-agent and shared-memory architectures surveyed in [37] and the memory
injection literature [35, 36] can cross contamination boundaries through the
reasoning context, with an encrypted context scoped to the deriving role
demonstrably not recoverable by a sibling agent or a later session under
different authorization.

The FHE Context Gate is the mediation layer's response to this residual
exposure. It routes sensitive context elements, at classification time,
through the XSOC FHE SDK to produce ciphertexts that the model operates on
without seeing cleartext.

## 6.2 Gate architecture: three modes

The gate supports three modes, selected by classification and operator policy.

**Mode A (Full FHE)** executes the operation on ciphertext end-to-end. The
model vendor and the OpenClaw instance receive only FHE ciphertexts, perform
homomorphic evaluation on encrypted payloads, and return encrypted results.
Cleartext never crosses the cryptographic boundary. This mode applies to the
highest classifications and to operations with established Universal Circuit
Template (UCT) coverage.

**Mode B (Tokenized Substitution)** replaces sensitive fields in the prompt
with opaque tokens before the OpenClaw instance sees the prompt. The model
reasons over tokens and returns a response containing the same token
references. On the return path, the adapter substitutes cleartext back for
approved output destinations only, with every substitution recorded as a
Providence event (Section 10). Mode B is the operational compromise for cases
where full FHE evaluation is impractical (free-form generation, novel
reasoning patterns) but cleartext must not transit the model layer.

**Mode C (Attested Cleartext)** permits cleartext to reach the model, but only
with endpoint attestation, policy approval, and a Providence-logged decryption
receipt. Mode C is the operational necessity mode for operations that
genuinely require cleartext reasoning (legal drafting with sensitive facts,
medical case review where synthesis across free-text notes is required). It
is never the default. For regulated classifications, Mode C additionally
requires a co-signed dual-control receipt.

The classification-to-mode compatibility matrix is part of the public
architecture and is enforced by the gate. The `public` classification permits
all three modes. The `sensitive` and `regulated` classifications also permit
all three modes, with Mode B as the typical default and Mode C gated by
additional checks. The `classified-adjacent` classification permits only Mode
A by construction; Modes B and C are denied regardless of other authorization.
The gate enforces three additional checks beyond simple matrix compatibility.
Mode C requires a valid endpoint attestation identifier; absence produces
`ERR_ENDPOINT_ATTESTATION_FAILED`. Mode C on a regulated classification
requires a dual-control receipt; absence produces
`ERR_DUAL_CONTROL_REQUIRED`. Mode C on classified-adjacent is denied under
`ERR_MODE_C_UNAUTHORIZED` even if the matrix alone would allow it, providing
defense in depth at the highest sensitivity tier.

## 6.3 The underlying FHE SDK: not a SEAL wrapper

The gate delegates cryptographic operations to the XSOC FHE SDK v3.0.0.0 [42].
A natural assumption is that an FHE-using product is a thin integration over
Microsoft SEAL or OpenFHE. The XSOC FHE SDK is not such an integration. It is
a four-layer architecture that composes an entropy-hardened CKKS backend,
built on SEAL's underlying primitives, with three additional cryptographic
layers that collectively address the five enterprise adoption barriers
documented in [42]: performance overhead, key management complexity,
implementation complexity, deployment friction, and security policy
enforcement. Each of the three additional layers produces security properties
orthogonal to CKKS's computational security.

**Layer 1, the FHE Core,** implements the Cheon, Kim, Kim, Song scheme [15]
over a cyclotomic polynomial ring with lattice parameters drawn from the
Homomorphic Encryption Standard [17, as cited in 42]. No proprietary CKKS
parameter tuning is employed; the SDK operates at standard 128, 192, or
256-bit security levels with published polynomial degree choices.

**Layer 2, DSKAG (Deterministic Symmetric Key Agreement Generator),** enables
multiple parties to derive identical FHE keys from shared policy context
without transmitting key material. The derivation is constructed from
NIST-approved primitives (HKDF per RFC 5869, HMAC-SHA-512) composed over a
shared master secret and a policy-binding context. Parties with equivalent
authorization derive compatible keys by local computation; parties with
different authorization derive cryptographically independent keys. This
eliminates key distribution as an attack surface and removes the need for
online key servers or certificate authorities in the multiparty case.

**Layer 3, SP-VERSA (volatile memory protection),** addresses FHE's key
storage problem. Complete FHE keys, approximately 12 MB in standard
configurations, are never stored at rest. The SDK stores policy-bound seeds
of approximately 1 MB and derives complete keys into volatile memory at
operation time, with enforced zeroization on operation completion. SP-VERSA
reduces key-at-rest material by roughly 92 percent and eliminates forensic
recovery of complete key material from disk images, backup snapshots, or
cold-boot memory captures.

**Layer 4, NexusKey (policy-bound key derivation),** eliminates the separation
between keys and policies. Decryption capability is not stored independently
of policy; it is derived from policy context at decryption time. The
derivation function is `K_fhe = DSKAG(MasterSecret, PolicyCommit ||
RoleSetDigest || MFADigest || FheContext)` where `PolicyCommit` is the hash
of the operative policy document, `RoleSetDigest` is the HMAC of the
canonicalized role set, and `MFADigest` is proof of recent multi-factor
authentication. Any change to any of these inputs produces a cryptographically
independent key. An adversary who obtains storage access but cannot produce
valid policy context derives a key that cannot decrypt. Formally, for all
policy contexts ctx' not equal to ctx, the probability that
`Decrypt(DeriveKey(ctx'), Encrypt(DeriveKey(ctx), m)) = m` is negligible in
the security parameter [42, Theorem 2].

Instant revocation is implemented through the Persistent Globally Unique
Identifier (PGUID) mechanism. Each key derivation includes a PGUID check;
revocation is a database write that invalidates subsequent derivation
attempts. This eliminates certificate revocation list propagation delays and
removes the FHE re-encryption burden that traditional key rotation would
require.

The integration matters operationally. A mediation layer that used a raw
SEAL integration would require the operator to solve each of the five
enterprise adoption barriers independently. The XSOC FHE SDK solves them in
composition, which is why an FHE context gate is deployable as an agent
mediation control rather than a research prototype.

## 6.4 Performance envelope

Published validation of the SDK [42] establishes the following operational
characteristics: encryption at 40.28 ms, homomorphic addition at 0.022 ms,
homomorphic multiplication at 1.29 ms, end-to-end pipeline at 19.43 ms, and
key rotation at 0.58 ms. The 40.28 ms encryption latency fits within the
mediation layer's per-operation budget for interactive agent operations.
Homomorphic addition at 0.022 ms supports inner-product operations on vectors
of sensitive features without user-observable latency. Key rotation at 0.58 ms
permits treating rotation as a per-session operation rather than a
cost-amortized event, enabling tight revocation response.

Universal Circuit Templates, described in [42], are pre-validated FHE circuits
for common operations (activation functions, statistical aggregations, linear
algebra operations, and industry-specific bundles for finance, healthcare,
and machine learning). Their operational effect for the mediation layer is to
provide end-to-end Mode A coverage for common agent operations (encrypted
similarity scoring, encrypted statistical aggregation, encrypted feature
extraction against an encrypted index) without requiring the operator to
author and validate custom FHE circuits. The UCT mechanism is what makes
Mode A practical for operational deployment rather than only for narrow
specialized applications.

## 6.5 Gate evaluation logic

Gate evaluation is a deterministic function of operation inputs and policy
state. The core decision procedure:

```
evaluate(input: GateInput) -> GateDecision:
    allowed_modes = MODE_COMPATIBILITY[input.classification]
    if input.requested_mode not in allowed_modes:
        return deny("ERR_CLASSIFICATION_VIOLATION", input)

    if input.requested_mode == C:
        if input.endpoint_attestation_id is None:
            return deny("ERR_ENDPOINT_ATTESTATION_FAILED", input)
        if input.classification == "regulated"
           and input.dual_control_receipt_id is None:
            return deny("ERR_DUAL_CONTROL_REQUIRED", input)
        if input.classification == "classified-adjacent":
            return deny("ERR_MODE_C_UNAUTHORIZED", input)
        return Mode_C(
            elements, endpoint_attestation, dual_control_receipt
        )

    if input.requested_mode == B:
        token_map = provider.build_token_map(input.elements)
        return Mode_B(elements, token_map)

    return Mode_A(elements)
```

Denials are structured. Each denial returns the attempted mode, the
classification, and a machine-readable reason code. Denials are themselves
Providence events (Section 10), forming an auditable record of attempted
transitions that did not occur.

## 6.6 Relationship to the Franklin et al. threat categories

Mapping the gate's structural coverage to categories in the agent traps
taxonomy [1]:

The **Content Injection** category covers adversary-authored material
entering the agent's reasoning context. Mode A structurally eliminates the
cleartext exfiltration pathway. A prompt injection that instructs the agent
to include regulated data in an outbound message produces a ciphertext that
the adversary cannot read. The injection may still execute, but its
informational yield is bounded by what the adversary can recover from FHE
ciphertexts, which under the SDK's security properties [42, Theorem 1] is
cryptographically nothing.

The **Cognitive State** category covers long-term memory manipulation.
Encrypted memory scoped to the deriving role under NexusKey policy binding is
not manipulable by an adversary who cannot produce valid policy context.
Memory injection attacks of the class surveyed in [35, 36] are reduced in
scope to the Franklin **Behavioural Control** category: the adversary may
still manipulate the agent's current-operation behavior but cannot extend the
manipulation into persistent-corruption attacks against the encrypted memory
store.

The **Behavioural Control** category remains partially addressed. The gate
does not prevent an adversary who has obtained legitimate Mode C authorization
from using that authorization correctly. What the gate does provide is an
audit-complete record of every Mode C release with attestation identifier and
dual-control receipt bound into each Providence event, enabling forensic
reconstruction (Section 10). This is coverage of the detection-and-response
axis of Behavioural Control, not of the prevention axis.

The **Systemic**, **Semantic Manipulation**, and **Human-in-the-Loop**
categories are largely outside the gate's direct scope, as stated in the
coverage boundaries of Section 1.4.

## 6.7 Limitations

The gate's protection is bounded by what the underlying SDK can express
efficiently. Operations requiring multiplicative depth beyond standard CKKS
parameters, such as those exceeding ten levels at 256-bit security [42], must
be expressed through UCTs that manage depth internally or must downgrade to
Mode B with structured token substitution. Operations involving free-form
natural language generation from encrypted context remain outside Mode A's
practical envelope and are handled in Mode B. CKKS is an approximate scheme;
applications requiring exact integer arithmetic use BGV or BFV variants also
supported by the SDK, with the same four-layer architecture wrapping them.

The gate assumes trustworthy endpoint attestation for Mode C releases.
Attestation failure modes, specifically attesting a compromised endpoint, are
outside the gate's scope and are addressed at the attestation floor in the
Admission Plane (Section 4). The gate and the admission plane enforce layered
controls; compromise of either one in isolation does not compromise the
other.

---

*End of Section 6. Word count check, em-dash check, AI-tell check, disclosure
lint check all to be run before integration into the full paper.*
