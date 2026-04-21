# Section 4. Admission and Capability Derivation

*Draft v1.0, Pass 2. Target 1,000 words.*

---

## 4.1 Client Trust Plane: attestation floor and device binding

The Client Trust Plane runs on every enrolled device and produces an
attestation assertion suitable for validation at admission. The plane's
contract is narrow: given a request for admission, produce a signed
structure that binds the subject identity, the device fingerprint, and a
claim about the device's trust posture at the stated attestation floor.

Four attestation floors are defined in ascending order of assurance:
software-min, software-plus, hardware-tee, and hardware-attested. The
software-min floor accepts any signed assertion and is intended for
development only; its presence in the architecture is to provide a path
for local testing without hardware dependencies. The software-plus floor
requires a cryptographic signature from a registered device key with
recent multi-factor authentication proof. The hardware-tee floor requires
a signature from a trusted execution environment (Intel SGX, AMD SEV,
ARM TrustZone, Apple Secure Enclave, Android StrongBox) with attestation
to the execution environment's measurement register. The hardware-
attested floor additionally requires a platform-level attestation quote
(TPM 2.0 PCR quote or equivalent) covering the full platform firmware
and boot state.

The Admission Plane rejects any attestation below the floor specified in
the active policy bundle. A regulated profile typically requires hardware-
tee; a restricted-information profile typically requires hardware-attested.
Scenario 22 in the evaluation harness (Section 11) exercises the rejection
path for an attestation package that carries a browser-pivot marker, which
is the CVE-2026-33579 exploit class in which a browser-originated request
presents a forged software-min attestation against a localhost-bound
gateway.

Device fingerprint binding (control A7 in Section 3.3) is the
counterpart on the admission side. The envelope sealed at invoke time
carries a hash of the admitted device fingerprint. Reuse of a capability
token from a different device produces an envelope verification failure
at the Runtime Continuity Plane and a Providence event of type
`device_mismatch`. This defeats capability token theft from a
compromised endpoint; the stolen token cannot be used from the attacker's
device because the envelope the attacker can produce will not match the
device fingerprint the broker recorded at admission.

## 4.2 Admission Plane: the single-front-door contract

The Admission Plane exposes `/v1/admit` as the sole entry point for
capability issuance. The admission request carries the attestation
package, the requested role, the requested operation set, and client
metadata. The response is either an admission record with a capability
token or a structured denial.

Three checks run in sequence on every admission request. First, the
attestation package is validated against the floor. Failures emit
Providence events with reason code `ERR_ATTESTATION_FAILED` and return
401. Second, the requested role is authorized against the signed policy
bundle; the role matrix in the bundle enumerates which operations each
role may perform. An unknown role or a role that is not permitted to
perform any operation in the requested set produces
`ERR_ROLE_INVALID`. Third, a short-time-to-live capability is issued,
scoped to the intersection of the requested operations and the role's
permitted operations.

The capability token is a deterministic hash of the session context. It
is not a random opaque identifier; it is a verifiable binding of session
identity, subject identity, device fingerprint, and admission timestamp,
which the Action Mediation Plane verifies on every `/v1/invoke` call
without a database lookup. The underlying NIE binding implementation
(production substitution of the mock package described in the reference
repository) is responsible for the cryptographic construction of the
token; the broker treats the token as opaque beyond its structural
shape.

## 4.3 Short-time-to-live scoped capabilities

Capability tokens default to fifteen-minute expiration, configurable per
policy bundle between one minute and one hour. Short TTL is control A5 in
the hero enumeration of Section 3.3. The rationale is that stolen or
harvested tokens must expire before they can be operationalized at scale
by an adversary. Fifteen minutes is the operational sweet spot: short
enough to constrain adversary windows, long enough to cover interactive
agent flows without forcing re-admission mid-operation.

Two refresh paths are provided. Silent refresh produces a new capability
for the same admission record without re-running attestation, valid for
sessions shorter than the policy-specified hard ceiling (default four
hours). Hard refresh re-runs the full admission sequence including
attestation validation and is required for sessions exceeding the
ceiling. Both refresh paths are recorded as Providence events; neither
extends an existing token's expiration in place, because extension-in-
place would create an audit gap.

## 4.4 Capability Derivation Tree for sub-agent flows

Sub-agent flows, such as an orchestrator agent spawning a specialist
sub-agent, require that the sub-agent hold a capability narrower than
the orchestrator's. We implement this through a Capability Derivation
Tree (CDT), control A8 in the hero enumeration.

The CDT primitive `deriveScopedCapability` takes a parent capability
and a scope restriction (operation subset, target restriction,
time-to-live restriction) and produces a child capability whose scope is
strictly contained in the parent's. Three invariants are enforced
cryptographically at the NIE binding layer. The child's operation set
is a subset of the parent's. The child's expiration is bounded by the
parent's; a child cannot outlive its parent. Revocation of the parent
cascades to all descendants in sub-millisecond time via the revocation
cache.

The CDT structural property is that the capability space forms a tree
under the child-of relation, rooted at the admission capability.
Widening is not a permitted operation: there is no primitive that
produces a capability broader than any of its ancestors. This is the
direct structural answer to the sub-agent spawning class of attacks
catalogued by Triedman et al. [5], who report 58 to 90 percent success
rates on unconstrained orchestrators. An orchestrator built over CDT
cannot delegate a capability it does not hold, regardless of how the
orchestrator is prompt-injected.

## 4.5 Summary

The Admission and Capability Derivation design composes four controls:
attestation floor (the trust baseline), device fingerprint binding
(token portability restriction), short-time-to-live scoping (adversary
window constraint), and Capability Derivation Tree (sub-agent scope
narrowing). Each control addresses a specific class of OpenClaw-era
attack documented in Section 2. The composition is load-bearing for the
claim that compromised endpoints cannot promote themselves to broader
capabilities than their admission granted.

---

*End of Section 4.*
