# Section 8. Policy Bundle Signing and Rotation

*Draft v1.0, Pass 2. Target 600 words.*

---

## 8.1 Policy as signed artifact

Every policy change in XSOC-NIE-GUARD is a signed policy bundle, control
A10 in Section 3.3. The bundle is a versioned JSON artifact that contains
the role matrix (which operations each role may perform at which
profile), the classification-to-mode compatibility rules that the FHE
Context Gate enforces (Section 6.2), the `OPERATION_TO_INTENT` map used
by the Agent Intent Envelope (Section 5.4), the MCP server trust table
(Section 7.4), the skill manifest trust table, and the attestation
floor per profile. The bundle is signed by a ceremony-rooted signing
key held in hardware security module custody.

Policy as signed artifact makes two properties explicit. First, policy
is not a runtime-mutable configuration file; changes are ceremony-
gated and leave an audit trail. Second, the broker's behavior is
deterministic for a given bundle hash; two broker instances running
the same bundle hash against the same inputs produce the same
decisions. This determinism is what makes shadow policy evaluation
(Scenario 13 in Section 11) a tractable operational control.

## 8.2 Bundle rotation ceremony

Rotation is a ceremony: the new bundle is constructed, reviewed by at
least one cryptographic reviewer and one policy reviewer, signed by the
ceremony-rooted key, published to the bundle store, and activated via a
signed activation record. The broker refuses to load a bundle whose
signature does not verify against the ceremony root public key, which
is compiled into the broker image at build time. Scenarios 12 and 18 in
Section 11 are the skeleton placeholders that exercise the Redis
tampering and signature forgery paths respectively; both are scheduled
for wiring in Phase 4.

Bundle activation emits a Providence event of type `bundle_rotation`
that records the new bundle hash, the ceremony participants, the
activation timestamp, and the predecessor bundle hash. The audit
record is sufficient to reconstruct the full policy history for any
operation.

## 8.3 Dual-control for high-risk operations

Control A6 in Section 3.3, dual-control, is enforced as a policy bundle
field rather than a broker-hardcoded behavior. For each operation
class, the bundle declares whether dual-control is required and, if
so, which role set is authorized to co-sign. Operations marked as
dual-control-required (typically `admin.control`, `exec.run`, and
`export.data` on regulated classifications) return HTTP 202 with
reason code `ERR_DUAL_CONTROL_REQUIRED` on initial submission; the
submission is parked pending a co-sign receipt from a distinct
attested principal. Scenario 11 in Section 11 exercises this path.

The co-signer cannot be the same subject as the original submitter;
cannot be the same device fingerprint; and must be attested at or
above the floor that the operation's classification requires. These
checks are structural rather than advisory; a single-principal
compromise cannot satisfy them even if the compromised principal
holds multiple roles.

## 8.4 Shadow policy

The reference architecture includes a skeleton for shadow policy
evaluation (Scenario 13). Shadow policy runs a candidate policy
bundle against production traffic in parallel with the active bundle
and records the decisions that would differ. Shadow policy is how a
proposed bundle change is validated before activation; it is the
safety rail against accidentally restrictive or accidentally
permissive policy rotations. The runtime for shadow evaluation is
scheduled for Phase 4, which is why Scenario 13 is classified as
skeleton in Section 11.

## 8.5 Summary

Signed policy bundles, ceremony-gated rotation, dual-control for
high-risk operations, and shadow policy evaluation compose into a
policy surface that is auditable, recoverable, and resistant to
unilateral administrative action (threat path T-07 in Section 2).
This posture is the structural answer to the insider-administrator
adversary class.

---

*End of Section 8.*
