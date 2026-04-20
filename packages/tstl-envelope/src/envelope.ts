import { createHash } from 'node:crypto';
import { TstlEnvelope, type SealedEnvelope } from '@xsoc/shared-types';
import type { NieBindings } from '@xsoc/nie-bindings';

export interface EnvelopeBuildInput {
  deviceFingerprint: string;
  sessionId: string;
  sessionNonceLineage: string[];
  roleScope: string;
  operationType: string;
  targetId: string;
  directionality: 'inbound' | 'outbound' | 'bidirectional';
  brokerPathId: string;
  processContextFingerprint?: string;
  networkPathFingerprint?: string;
  contextManifestHash: string;
  intentHash: string;
  intentClass: 'read' | 'write' | 'analyze' | 'export' | 'execute' | 'escalate';
  classification: 'public' | 'sensitive' | 'regulated' | 'classified-adjacent';
  ttlSeconds: number;
  counter: number;
}

export interface EnvelopeValidationResult {
  valid: boolean;
  envelope?: TstlEnvelope;
  reasonCode?: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function buildEnvelope(input: EnvelopeBuildInput, bindings: NieBindings): Promise<SealedEnvelope> {
  const now = Date.now();
  const envelope = TstlEnvelope.parse({
    deviceFingerprint: input.deviceFingerprint,
    sessionId: input.sessionId,
    sessionNonceLineage: input.sessionNonceLineage,
    roleScopeHash: sha256(input.roleScope),
    operationType: input.operationType,
    targetHash: sha256(input.targetId),
    directionality: input.directionality,
    brokerPathId: input.brokerPathId,
    processContextFingerprint: input.processContextFingerprint,
    networkPathFingerprint: input.networkPathFingerprint,
    contextManifestHash: input.contextManifestHash,
    intentHash: input.intentHash,
    intentClass: input.intentClass,
    classification: input.classification,
    issuedAt: now,
    expiresAt: now + input.ttlSeconds * 1000,
    counter: input.counter
  });
  return bindings.sealEnvelope(envelope);
}

export async function validateEnvelope(
  sealed: SealedEnvelope,
  bindings: NieBindings,
  expected: { targetId?: string; roleScope?: string; minCounter?: number }
): Promise<EnvelopeValidationResult> {
  try {
    const envelope = await bindings.validateContinuityEnvelope(sealed);

    if (envelope.expiresAt < Date.now()) {
      return { valid: false, reasonCode: 'ERR_SESSION_EXPIRED' };
    }

    if (expected.targetId && envelope.targetHash !== sha256(expected.targetId)) {
      return { valid: false, reasonCode: 'ERR_TARGET_MISMATCH' };
    }

    if (expected.roleScope && envelope.roleScopeHash !== sha256(expected.roleScope)) {
      return { valid: false, reasonCode: 'ERR_SCOPE_DENIED' };
    }

    if (expected.minCounter !== undefined && envelope.counter < expected.minCounter) {
      return { valid: false, reasonCode: 'ERR_NONCE_REPLAY' };
    }

    return { valid: true, envelope };
  } catch {
    return { valid: false, reasonCode: 'ERR_CONTINUITY_FAILED' };
  }
}

export function incrementCounter(envelope: TstlEnvelope): TstlEnvelope {
  return { ...envelope, counter: envelope.counter + 1 };
}

export function checkTargetBinding(envelope: TstlEnvelope, targetId: string): boolean {
  return envelope.targetHash === sha256(targetId);
}
