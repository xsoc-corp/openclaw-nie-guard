//! Public stub for the XSOC NIE core workspace.
//!
//! The real nie-core workspace contains the following crates and is referenced
//! from the private deployment repo, not from this public repository:
//!
//!   - nie-crypto       (DSKAG derivation, FIPS 203 ML-KEM, session key lifecycle)
//!   - nie-tpm          (TPM 2.0 / Secure Enclave / StrongBox abstraction)
//!   - nie-token        (Token construction, signing, validation, TTL)
//!   - nie-providence   (Hash-chained audit trail)
//!   - nie-rbac         (Signed role tree, attestation floor enforcement)
//!   - nie-enrollment   (Co-sign ceremony, admin token, FIDO2)
//!   - nie-revocation   (Redis cache mirror, three-channel propagation)
//!   - nie-wasm         (WASM bridge, 3-export surface, SRI manifest)
//!   - nie-ffi          (C-compatible FFI for Go cgo consumption)
//!   - nie-embedded     (no_std for air-gap / OT deployments)
//!
//! Interface shape and stated security properties are described in
//! ../../docs/nie-integration.md. Construction details are not disclosed in this repo.

pub const PUBLIC_STUB_VERSION: &str = "0.1.0";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stub_version_present() {
        assert_eq!(PUBLIC_STUB_VERSION, "0.1.0");
    }
}
