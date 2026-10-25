import type { FastifyInstance } from 'fastify';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { jcs } from '@xsoc/providence-log';
import { MODE_COMPATIBILITY, type Classification } from '@xsoc/shared-types';
import type { FheGate } from '@xsoc/fhe-gate';
import type { BrokerRecordRef } from '../services/providence.js';

// FHE Mode A inference, then the Mode C release of its result.
//
// POST /v1/fhe/infer runs a named computation from FHE_COMPUTATIONS on the request's
// values. Its classification is fixed with the computation, and the mode is a lookup
// on that classification: the gate's compatibility table, with inference asking for
// Mode A. Each value is sealed as its own ciphertext and the computation's template
// runs on the ciphertexts with its fixed plaintext weights; the result stays
// ciphertext. That step is recorded as mode_a_inference, whatever its outcome.
//
// Releasing the result is a separate, gated step: a fresh endpoint attestation from
// the gate, a dual-control receipt naming the request's two approvers, and the gate's
// Mode C decision, then the gate's release, which records mode_c_decryption. A refusal
// at any of these is recorded too. Every answer names its records; nothing returns
// without one. The write hook in server.ts puts this route behind the operator bearer.

/** A computation the broker runs under Mode A, with its weights fixed here. */
export interface FheComputation {
  name: string;
  template: string;
  classification: Classification;
  operationClass: string;
  figures: { key: string; label: string; unit: string }[];
  weights: number[];
  /** Values a card may start from. */
  example: number[];
}

export const FHE_COMPUTATIONS: Record<string, FheComputation> = {
  'q3-risk-score': {
    name: 'q3-risk-score',
    template: 'weighted-sum',
    classification: 'regulated',
    operationClass: 'fhe.infer',
    figures: [
      { key: 'revenue', label: 'Revenue', unit: 'thousand USD' },
      { key: 'receivables_90d', label: 'Receivables over 90 days', unit: 'thousand USD' },
      { key: 'largest_customer_share', label: 'Largest customer share', unit: 'percent' },
      { key: 'open_disputes', label: 'Open disputes', unit: 'count' }
    ],
    weights: [-0.02, 0.15, 0.8, 2],
    example: [1200, 180, 35, 6]
  }
};

const MAX_ABS_VALUE = 1_000_000;

const Approver = z.string().trim().min(1).max(64).regex(/^[\p{L}\p{N} .,'-]+$/u);

const InferRequest = z.object({
  computation: z.string().min(1).max(64),
  values: z.array(z.number().finite().min(-MAX_ABS_VALUE).max(MAX_ABS_VALUE)).min(1).max(16),
  approvers: z.tuple([Approver, Approver])
});

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

function reasonOf(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 300);
}

export async function registerFheRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/fhe/computations', async () => ({ computations: Object.values(FHE_COMPUTATIONS) }));

  app.post('/v1/fhe/infer', async (req, reply) => {
    const correlationId = randomUUID();
    const { providence } = app.services;
    const fheGate: FheGate = app.services.fheGate;

    const parsed = InferRequest.safeParse(req.body);
    const comp = parsed.success ? FHE_COMPUTATIONS[parsed.data.computation] : undefined;
    const problem = !parsed.success ? 'request shape'
      : !comp ? `no computation ${parsed.data.computation}`
      : parsed.data.values.length !== comp.weights.length ? `${comp.name} takes ${comp.weights.length} values`
      : parsed.data.approvers[0].toLowerCase() === parsed.data.approvers[1].toLowerCase() ? 'the two approvers are the same'
      : undefined;
    if (problem || !parsed.success || !comp) {
      const ref = providence.append({
        eventType: 'deny',
        correlationId,
        reasonCode: 'ERR_POLICY_VIOLATION',
        operationClass: 'fhe.infer',
        metadata: { stage: 'shape', problem, ...(parsed.success ? {} : { validation: parsed.error.flatten() }) }
      });
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: `Invalid FHE inference request: ${problem}.`, correlationId, record: ref });
    }
    const { values, approvers } = parsed.data;

    const parameters = { weights: comp.weights.join(',') };
    const payloadSha256 = sha256(jcs(values));
    const parametersSha256 = sha256(jcs(parameters));
    const modesAllowed = MODE_COMPATIBILITY[comp.classification];
    const common = {
      correlationId,
      payloadDigest: payloadSha256,
      classification: comp.classification,
      operationClass: comp.operationClass
    };
    const stepMeta = { computation: comp.name, template: comp.template, parameters_sha256: parametersSha256, modes_allowed: modesAllowed };
    const answer = {
      correlationId,
      computation: { name: comp.name, template: comp.template, figures: comp.figures, weights: comp.weights },
      classification: comp.classification,
      modesAllowed,
      payloadSha256,
      parametersSha256
    };

    // The mode: a lookup on the classification, with inference asking for Mode A.
    const now = Date.now();
    const elements = values.map(() => ({
      elementId: randomUUID(), provenance: 'user' as const, classification: comp.classification, contentHash: payloadSha256, registeredAt: now
    }));
    const decision = fheGate.evaluate({ elements, requestedMode: 'A', classification: comp.classification, operationClass: comp.operationClass });
    if (decision.mode !== 'A') {
      const reasonCode = decision.mode === 'denied' ? decision.reasonCode : 'ERR_CLASSIFICATION_VIOLATION';
      const record = providence.append({
        ...common, eventType: 'mode_a_inference', reasonCode,
        metadata: { ...stepMeta, outcome: 'denied', mode: decision.mode, attempted_mode: 'A' }
      });
      return reply.code(403).send({ ...answer, mode: decision.mode, inference: { outcome: 'denied', reasonCode, record } });
    }

    let inference;
    try {
      inference = await fheGate.inferModeA({ values, template: comp.template, parameters });
    } catch (err) {
      const record = providence.append({
        ...common, eventType: 'mode_a_inference', reasonCode: 'ERR_FHE_SERVICE',
        metadata: { ...stepMeta, outcome: 'service_error', mode: 'A', error: reasonOf(err) }
      });
      return reply.code(502).send({ ...answer, mode: 'A', inference: { outcome: 'service_error', reasonCode: 'ERR_FHE_SERVICE', message: reasonOf(err), record } });
    }
    const inferenceRecord = providence.append({
      ...common, eventType: 'mode_a_inference', targetHash: inference.output.ciphertextId,
      metadata: {
        ...stepMeta,
        outcome: 'computed',
        mode: 'A',
        scheme: inference.scheme,
        ...(inference.polyModulusDegree ? { poly_modulus_degree: inference.polyModulusDegree } : {}),
        ...(inference.securityLevel ? { security_level: inference.securityLevel } : {}),
        inputs: inference.inputs.map((c) => ({ ciphertext_id: c.ciphertextId, size_bytes: c.sizeBytes })),
        output: { ciphertext_id: inference.output.ciphertextId, size_bytes: inference.output.sizeBytes }
      }
    });
    const inferenceAnswer = {
      outcome: 'computed',
      scheme: inference.scheme,
      polyModulusDegree: inference.polyModulusDegree,
      securityLevel: inference.securityLevel,
      inputs: inference.inputs,
      output: { ciphertextId: inference.output.ciphertextId, sizeBytes: inference.output.sizeBytes },
      record: inferenceRecord
    };

    // The release: a separate, gated, recorded step.
    const refuse = (reasonCode: string, stage: string, reason: string, extra: Record<string, unknown> = {}) => {
      const record = providence.append({
        ...common, eventType: stage === 'endpoint-attestation' ? 'endpoint_attestation_fail' : 'deny', reasonCode,
        targetHash: inference.output.ciphertextId,
        metadata: { stage: 'release', step: stage, operation: 'mode_c_release', reason, ...extra }
      });
      return reply.code(200).send({ ...answer, mode: 'A', inference: inferenceAnswer, release: { outcome: 'refused', step: stage, reasonCode, message: reason, record, ...extra } });
    };

    let endpointAttestationId: string;
    try {
      endpointAttestationId = await fheGate.attestEndpoint();
    } catch (err) {
      return refuse('ERR_ENDPOINT_ATTESTATION_FAILED', 'endpoint-attestation', reasonOf(err));
    }
    let grant;
    try {
      grant = await fheGate.issueDualControlReceipt(inference.output.handle, approvers);
    } catch (err) {
      return refuse('ERR_DUAL_CONTROL_REQUIRED', 'dual-control', reasonOf(err), { endpoint_attestation: endpointAttestationId });
    }
    const release = fheGate.evaluate({
      elements, requestedMode: 'C', classification: comp.classification, operationClass: comp.operationClass,
      endpointAttestationId, dualControlReceiptId: grant.receiptId
    });
    if (release.mode !== 'C') {
      const reasonCode = release.mode === 'denied' ? release.reasonCode : 'ERR_MODE_C_UNAUTHORIZED';
      return refuse(reasonCode, 'gate', `the gate decided ${release.mode}`, { endpoint_attestation: endpointAttestationId, principals: grant.principals });
    }
    let released: number[];
    try {
      released = await fheGate.releaseModeC(inference.output.handle, grant.receiptId, {
        correlationId, classification: comp.classification, operationClass: comp.operationClass,
        endpointAttestationId, principals: grant.principals
      });
    } catch (err) {
      return refuse('ERR_FHE_SERVICE', 'release', reasonOf(err), { endpoint_attestation: endpointAttestationId, principals: grant.principals });
    }

    // The gate recorded the release on this chain; name that record, or say there is none.
    const releaseRecord = findRecord(providence.log, correlationId, 'mode_c_decryption');
    if (!releaseRecord) {
      const record = providence.append({
        ...common, eventType: 'deny', reasonCode: 'ERR_PROVIDENCE_UNAVAILABLE', targetHash: inference.output.ciphertextId,
        metadata: { stage: 'release', step: 'record', operation: 'mode_c_release', reason: 'the gate released the result without a mode_c_decryption record' }
      });
      return reply.code(500).send({ ...answer, mode: 'A', inference: inferenceAnswer, release: { outcome: 'refused', step: 'record', reasonCode: 'ERR_PROVIDENCE_UNAVAILABLE', record } });
    }
    return reply.code(200).send({
      ...answer,
      mode: 'A',
      inference: inferenceAnswer,
      release: {
        outcome: 'released',
        endpointAttestationId,
        principals: grant.principals,
        result: released[0],
        record: releaseRecord
      }
    });
  });
}

/** The latest record on the chain with this correlation id and event type, among the last few. */
function findRecord(log: { getHead(): { seq: number }; page(from: number, limit: number): { records: { seq: number; digest: string; line: string }[] } }, correlationId: string, eventType: string): BrokerRecordRef | undefined {
  const head = log.getHead().seq;
  const from = Math.max(0, head - 8);
  const { records } = log.page(from, head - from);
  for (let i = records.length - 1; i >= 0; i--) {
    const r = JSON.parse(records[i]!.line) as { event_type?: string; correlation_id?: string };
    if (r.event_type === eventType && r.correlation_id === correlationId) return { eventId: records[i]!.digest, seq: records[i]!.seq };
  }
  return undefined;
}
