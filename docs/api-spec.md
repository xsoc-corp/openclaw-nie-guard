# API Specification

Broker endpoints. All endpoints return structured errors with a `code` from
`@xsoc/shared-types/errors` on failure.

**Operator authentication.** Every write route (any method other than GET, HEAD
and OPTIONS) and `GET /v1/audit` require `Authorization: Bearer <token>`, where the
SHA-256 of the token is one of those in `BROKER_OPERATOR_TOKEN_SHA256`
(comma-separated, 64 lowercase hex). A request without an accepted token is
answered 401 before the route runs, and nothing is recorded. With no token
configured, all of these routes refuse every request. Agent-facing routes such as
`/v1/admit` and `/v1/invoke` check their own NIE credentials as well; viewer,
operator and presenter roles are separated in a later release.

## POST /v1/admit

Admit a client. Submits attestation, receives scoped capability.

Request body: `AdmissionRequest`
Response 200: `AdmissionResponse` with correlationId
Response 400: `ERR_ATTESTATION_FAILED` on malformed request
Response 401: `ERR_ATTESTATION_FAILED` on attestation failure

## POST /v1/invoke

Invoke an OpenClaw operation. Capability and envelope required.

Request body: `InvokeRequest`
Response 200: `InvokeResponse`
Response errors include the full ErrorCodes taxonomy

## POST /v1/revoke

Revoke a subject, session, or device.

Request body: `{ kind, id, reason }`
Response 200: `RevocationResult` with correlationId

## GET /v1/session/:id

Get session state.

## GET /v1/audit?from=<seq>&limit=<n>

The Providence chain, read-only, by sequence. Operators only: the request carries
`Authorization: Bearer <token>`, and the broker accepts a token whose SHA-256 is
listed in `BROKER_OPERATOR_TOKEN_SHA256` (comma-separated, 64 lowercase hex each).
With none listed, every request is refused.

`from` defaults to 0 and `limit` to 100, at most 1000. Any other query parameter
is refused.

Response 200:

    {
      "chain_id": "aida-guard/<deployment-id>",
      "head": { "chain_id", "seq", "head_digest", "commitment" },
      "from": <seq>,
      "next": <seq to ask for next; equals head.seq at the head>,
      "records": [ { "seq", "digest", "line" } ],
      "anchors": [ <anchor objects whose head_seq is in the page> ],
      "refusal": "<why the chain refuses appends>"     (only when it does)
    }

Each `line` is the record's line in `chain-v3.jsonl` byte for byte, so the pages
written back as `chain-v3.jsonl`, `head-v3.json` and `anchors/` are a chain
directory `xsoc-audit-verify --chain guard` reads.

Response 400: a malformed query. Response 401: no accepted operator token.
Response 503: the chain could not be opened, with the reason.

## GET /health

Liveness probe.

## GET /version

Broker version and binding version info.
