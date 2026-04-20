// Demo client. Drives admission and invoke flows against a running broker for local dev.
// TODO(xsoc-openclaw-poc): implement happy-path admission, CDT derivation, invoke with envelope.

const brokerUrl = process.env.BROKER_URL ?? 'http://localhost:8443';
console.log(`[demo-client] target broker: ${brokerUrl}`);
console.log('[demo-client] skeleton; implementation deferred to Phase 6.');
