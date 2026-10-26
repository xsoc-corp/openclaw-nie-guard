# @xsoc/openclaw-adapter changelog

## 0.3.0

- `OpenClawGatewayTransport`: forwards mediated reads to an OpenClaw gateway over `POST /tools/invoke`, on loopback only (`http://127.0.0.1` or `http://[::1]`), with the gateway's shared token.
  - Reads (`operator.read`, `file.read`, `export.data`) map through a fixed target table, targetId to `{ tool, path }`.
  - An unknown target and every other operation class are refused before any call (`forwarded: false`).
  - Answers map to recorded codes:
    - non-200 by status (401 `ERR_OPENCLAW_UNAUTHORIZED`, 404 `ERR_OPENCLAW_TOOL_NOT_AVAILABLE`, ...);
    - the tool's own refusal, which OpenClaw sends as HTTP 200, by `details.status` (`ERR_OPENCLAW_MEMORY_PATH_NOT_ALLOWED`, `ERR_OPENCLAW_NOT_FOUND`);
    - no answer as `ERR_OPENCLAW_UNREACHABLE`.
  - The transport is named `openclaw-gateway`, with the pinned OpenClaw version.

## 0.2.0

- `MediatedOperation.brokerSignature` is renamed `bindingHash`, which is what it is: SHA-256 of `correlationId:targetId:operationClass`, a hash anyone can compute, not a signature. There is no alias; a caller using the old name fails to compile. A broker signature under a separate key waits until something verifies it.
- `OpenClawTransport` gains `name` (required) and `version` (optional): what a forwarded record carries in its metadata.
- `AdapterResponse` gains `forwarded`, set by `OpenClawAdapter.forward`: `true` when the transport answered, `false` when the adapter refused the operation itself (a default-deny category, a profile it does not permit, an unknown operation class) without calling the transport.

## 0.1.0

- The adapter and its transport interface, before this changelog.
