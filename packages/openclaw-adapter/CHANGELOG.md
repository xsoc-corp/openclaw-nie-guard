# @xsoc/openclaw-adapter changelog

## 0.2.0

- `MediatedOperation.brokerSignature` is renamed `bindingHash`, which is what it is: SHA-256 of `correlationId:targetId:operationClass`, a hash anyone can compute, not a signature. There is no alias; a caller using the old name fails to compile. A broker signature under a separate key waits until something verifies it.
- `OpenClawTransport` gains `name` (required) and `version` (optional): what a forwarded record carries in its metadata.
- `AdapterResponse` gains `forwarded`, set by `OpenClawAdapter.forward`: `true` when the transport answered, `false` when the adapter refused the operation itself (a default-deny category, a profile it does not permit, an unknown operation class) without calling the transport.

## 0.1.0

- The adapter and its transport interface, before this changelog.
