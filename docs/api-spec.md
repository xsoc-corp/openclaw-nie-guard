# API Specification

Broker endpoints. All endpoints return structured errors with a `code` from
`@xsoc/shared-types/errors` on failure.

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

## GET /v1/audit/:correlationId

Retrieve Providence events for a correlation ID.

## GET /health

Liveness probe.

## GET /version

Broker version and binding version info.
