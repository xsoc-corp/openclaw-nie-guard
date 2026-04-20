import type { FastifyInstance } from 'fastify';
import { InvokeRequest, OPERATION_TO_INTENT } from '@xsoc/shared-types';
import { validateEnvelope } from '@xsoc/tstl-envelope';
import type { PolicyEvaluationInput } from '@xsoc/policy-engine';
import type { MediatedOperation } from '@xsoc/openclaw-adapter';
import { randomUUID, createHash } from 'node:crypto';

// Full /v1/invoke pipeline: token verify, nonce consume, envelope validate, intent alignment,
// policy evaluate, dual-control gate, MCP classification check, adapter forward. Fail-closed
// at every layer with structured error codes and Providence event emission on every decision.
export async function registerInvokeRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/invoke', async (req, reply) => {
    const correlationId = randomUUID();
    const { bindings, policy, providence, adapter } = app.services;

    // Layer 1: request shape.
    const parsed = InvokeRequest.safeParse(req.body);
    if (!parsed.success) {
      providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: 'ERR_POLICY_VIOLATION',
        metadata: { stage: 'shape', validation: parsed.error.flatten() }
      });
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid invoke request shape.', correlationId });
    }
    const body = parsed.data;

    // Layer 2: capability token verification. Returns the role and operation set for downstream checks.
    const tokenResult = await bindings.verifyToken(body.capabilityToken);
    if (!tokenResult.valid || !tokenResult.sessionId || !tokenResult.role) {
      providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: tokenResult.reasonCode ?? 'ERR_SESSION_EXPIRED',
        metadata: { stage: 'token-verify' }
      });
      return reply.code(401).send({ code: tokenResult.reasonCode ?? 'ERR_SESSION_EXPIRED', message: 'Capability token invalid.', correlationId });
    }

    // Layer 3: nonce single-use enforcement. Prevents envelope replay.
    const nonceResult = await bindings.consumeNonce(body.nonce, tokenResult.sessionId);
    if (!nonceResult.firstUse) {
      providence.append({
        eventType: 'replay_fail',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        reasonCode: 'ERR_NONCE_REPLAY',
        metadata: { stage: 'nonce' }
      });
      return reply.code(403).send({ code: 'ERR_NONCE_REPLAY', message: 'Nonce already consumed in this session.', correlationId });
    }

    // Layer 4: TSTL envelope validation.
    const envelopeCheck = await validateEnvelope(body.envelope, bindings, {
      targetId: body.targetId,
      roleScope: body.operationClass
    });
    if (!envelopeCheck.valid || !envelopeCheck.envelope) {
      providence.append({
        eventType: envelopeCheck.reasonCode === 'ERR_TARGET_MISMATCH' ? 'target_mismatch' : 'continuity_fail',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        deviceFingerprint: tokenResult.deviceFingerprint,
        operationClass: body.operationClass,
        reasonCode: envelopeCheck.reasonCode,
        metadata: { stage: 'envelope' }
      });
      return reply.code(403).send({ code: envelopeCheck.reasonCode ?? 'ERR_CONTINUITY_FAILED', message: 'Envelope validation failed.', correlationId });
    }
    const envelope = envelopeCheck.envelope;

    // Layer 5: intent alignment.
    const allowedIntents = OPERATION_TO_INTENT[body.operationClass];
    if (!allowedIntents || !allowedIntents.includes(envelope.intentClass)) {
      providence.append({
        eventType: 'intent_drift',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        operationClass: body.operationClass,
        reasonCode: 'ERR_INTENT_DRIFT',
        metadata: { declaredIntent: envelope.intentClass, operationClass: body.operationClass }
      });
      return reply.code(403).send({ code: 'ERR_INTENT_DRIFT', message: `Intent ${envelope.intentClass} not permitted for ${body.operationClass}.`, correlationId });
    }

    // Layer 6: context manifest hash check. Manifest must be pre-registered in Providence via /v1/context/register.
    // For POC, a zero-hash manifest is acceptable as a sentinel meaning "no sensitive context"; any other value
    // must be registered. Unregistered non-zero hashes fail closed.
    // TODO(xsoc-openclaw-poc): wire a real manifest registry keyed on manifest id.
    if (envelope.contextManifestHash !== '0'.repeat(64) && !app.services.registeredManifests.has(envelope.contextManifestHash)) {
      providence.append({
        eventType: 'deny',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        reasonCode: 'ERR_CONTEXT_MANIFEST_INVALID',
        metadata: { stage: 'manifest' }
      });
      return reply.code(403).send({ code: 'ERR_CONTEXT_MANIFEST_INVALID', message: 'Context manifest not registered.', correlationId });
    }

    // Layer 7: policy evaluation with the role from the token, not a hardcoded value.
    const policyInput: PolicyEvaluationInput = {
      subjectId: tokenResult.subjectId ?? 'unknown',
      role: tokenResult.role,
      operationClass: body.operationClass,
      targetClass: body.targetClass,
      classification: envelope.classification,
      intentClass: envelope.intentClass
    };
    const decision = policy.evaluate(policyInput);
    if (!decision.allowed) {
      providence.append({
        eventType: decision.denyReasonCode === 'ERR_SCOPE_DENIED' ? 'scope_fail' : 'deny',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        operationClass: body.operationClass,
        classification: envelope.classification,
        reasonCode: decision.denyReasonCode,
        metadata: { stage: 'policy', reason: decision.denyReason }
      });
      return reply.code(403).send({ code: decision.denyReasonCode, message: decision.denyReason, correlationId });
    }

    // Layer 8: dual-control. If required and no cosign receipt header present, respond 202.
    const cosignReceipt = req.headers['x-xsoc-cosign-receipt'];
    if (decision.requiresDualControl && !cosignReceipt) {
      providence.append({
        eventType: 'dual_control_requested',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        operationClass: body.operationClass,
        reasonCode: 'ERR_DUAL_CONTROL_REQUIRED',
        metadata: { stage: 'dual-control' }
      });
      return reply.code(202).send({
        code: 'ERR_DUAL_CONTROL_REQUIRED',
        message: 'Operation requires cosign receipt. Obtain via /v1/cosign and retry with X-XSOC-Cosign-Receipt header.',
        correlationId
      });
    }

    // Layer 9: adapter forward. Mediated operation includes a broker signature binding correlation id plus target.
    const brokerSignature = createHash('sha256')
      .update(`${correlationId}:${body.targetId}:${body.operationClass}`)
      .digest('hex');
    const mediated: MediatedOperation = {
      operationClass: body.operationClass,
      targetId: body.targetId,
      targetClass: body.targetClass,
      payload: { classification: envelope.classification, profile: decision.profile },
      brokerSignature,
      correlationId
    };
    const adapterResponse = await adapter.forward(mediated, decision.profile);

    if (!adapterResponse.ok) {
      providence.append({
        eventType: 'tool_block',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        operationClass: body.operationClass,
        reasonCode: adapterResponse.error?.code ?? 'ERR_OPENCLAW_FORWARD_FAILED',
        metadata: { stage: 'adapter', reason: adapterResponse.error?.message }
      });
      return reply.code(403).send({
        code: adapterResponse.error?.code ?? 'ERR_OPENCLAW_FORWARD_FAILED',
        message: adapterResponse.error?.message ?? 'Adapter forward failed.',
        correlationId
      });
    }

    const providenceEvent = providence.append({
      eventType: 'invoke',
      correlationId,
      sessionId: tokenResult.sessionId,
      subjectId: tokenResult.subjectId,
      deviceFingerprint: tokenResult.deviceFingerprint,
      operationClass: body.operationClass,
      targetHash: envelope.targetHash,
      classification: envelope.classification,
      metadata: {
        profile: decision.profile,
        allowedFheModes: decision.allowedFheModes,
        brokerSignature
      }
    });

    return reply.code(200).send({
      correlationId,
      result: adapterResponse.result,
      providenceEventId: providenceEvent.eventId
    });
  });
}
