import type { FastifyInstance } from 'fastify';
import { InvokeRequest, OPERATION_TO_INTENT } from '@xsoc/shared-types';
import { validateEnvelope } from '@xsoc/tstl-envelope';
import type { PolicyEvaluationInput } from '@xsoc/policy-engine';
import { randomUUID } from 'node:crypto';

// Full /v1/invoke pipeline.
//
// Composition order matters: token verification gates envelope validation gates
// policy evaluation gates FHE gate selection gates adapter forwarding. Each layer
// is fail-closed. Every decision is logged to Providence with a correlation id.
export async function registerInvokeRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/invoke', async (req, reply) => {
    const correlationId = randomUUID();
    const { bindings, policy, providence } = app.services;

    // Layer 1: request shape.
    const parsed = InvokeRequest.safeParse(req.body);
    if (!parsed.success) {
      providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: 'ERR_POLICY_VIOLATION',
        metadata: { validation: parsed.error.flatten() }
      });
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid invoke request shape.', correlationId });
    }
    const body = parsed.data;

    // Layer 2: capability token verification.
    const tokenResult = await bindings.verifyToken(body.capabilityToken);
    if (!tokenResult.valid) {
      providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: tokenResult.reasonCode ?? 'ERR_SESSION_EXPIRED',
        metadata: { stage: 'token-verify' }
      });
      return reply.code(401).send({ code: tokenResult.reasonCode ?? 'ERR_SESSION_EXPIRED', message: 'Capability token invalid.', correlationId });
    }

    // Layer 3: TSTL envelope validation. Expected target id and scope are implied by the operation class
    // and target id; the envelope carries hashes that must match.
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
        metadata: { stage: 'envelope-validate' }
      });
      return reply.code(403).send({ code: envelopeCheck.reasonCode ?? 'ERR_CONTINUITY_FAILED', message: 'Envelope validation failed.', correlationId });
    }
    const envelope = envelopeCheck.envelope;

    // Layer 4: intent alignment. Intent envelope binds declared intent class; operation class must match.
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

    // Layer 5: policy evaluation. Role is resolved from the session; operation and classification drive
    // profile, dual-control, and FHE mode compatibility.
    // TODO(xsoc-openclaw-poc): resolve role from session store; for now derive from token subject as a placeholder.
    const policyInput: PolicyEvaluationInput = {
      subjectId: tokenResult.subjectId ?? 'unknown',
      role: 'operator',
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
        metadata: { stage: 'policy-evaluate', reason: decision.denyReason }
      });
      return reply.code(403).send({ code: decision.denyReasonCode, message: decision.denyReason, correlationId });
    }

    // Layer 6: dual-control check. If the operation requires dual-control and no cosign receipt is present,
    // emit dual_control_requested and return 202 so the client can retry with a cosign receipt.
    // TODO(xsoc-openclaw-poc): wire cosign receipt verification.
    if (decision.requiresDualControl) {
      providence.append({
        eventType: 'dual_control_requested',
        correlationId,
        sessionId: tokenResult.sessionId,
        subjectId: tokenResult.subjectId,
        operationClass: body.operationClass,
        reasonCode: 'ERR_DUAL_CONTROL_REQUIRED',
        metadata: { stage: 'dual-control-gate' }
      });
      return reply.code(202).send({
        code: 'ERR_DUAL_CONTROL_REQUIRED',
        message: 'Operation requires cosign receipt.',
        correlationId
      });
    }

    // Layer 7: forward to OpenClaw adapter. Mediated operation includes broker signature and correlation id.
    // TODO(xsoc-openclaw-poc): wire production adapter once OpenClaw transport is connected.
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
        allowedFheModes: decision.allowedFheModes
      }
    });

    return reply.code(200).send({
      correlationId,
      result: {
        mocked: true,
        operationClass: body.operationClass,
        profile: decision.profile,
        classification: envelope.classification
      },
      providenceEventId: providenceEvent.eventId
    });
  });
}
