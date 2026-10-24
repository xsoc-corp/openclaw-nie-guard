# Changelog: @xsoc/tstl-envelope

## Unreleased

- `validateEnvelope` passes `ERR_SESSION_EXPIRED` through when the bindings report
  an envelope that authenticated but has expired. Every other refusal from the
  bindings, an authentication or comparison failure among them, stays
  `ERR_CONTINUITY_FAILED`.
