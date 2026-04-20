import { createHash, randomUUID } from 'node:crypto';

export interface AdmitResponse {
  sessionId: string;
  capabilityToken: string;
  profile: string;
  issuedAt: number;
  expiresAt: number;
  correlationId: string;
}

export interface InvokeResponse {
  correlationId: string;
  result: unknown;
  providenceEventId: string;
}

export interface DenyResponse {
  code: string;
  message: string;
  correlationId: string;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export async function admit(brokerUrl: string, overrides: Record<string, unknown> = {}): Promise<AdmitResponse> {
  const res = await fetch(`${brokerUrl}/v1/admit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      attestationPackage: overrides.attestationPackage ?? 'mock-attestation-' + randomUUID(),
      requestedRole: overrides.requestedRole ?? 'operator',
      requestedOperationSet: overrides.requestedOperationSet ?? ['tool.invoke', 'operator.read'],
      clientMetadata: {
        deviceFingerprint: overrides.deviceFingerprint ?? 'dev-' + randomUUID(),
        userAgent: 'attack-sim/0.1.0',
        sdkVersion: '0.1.0'
      }
    })
  });
  if (!res.ok) throw new Error(`admit failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<AdmitResponse>;
}

export function buildMockEnvelope(input: {
  deviceFingerprint: string;
  sessionId: string;
  roleScope: string;
  operationType: string;
  targetId: string;
  intentClass: 'read' | 'write' | 'analyze' | 'export' | 'execute' | 'escalate';
  classification?: 'public' | 'sensitive' | 'regulated' | 'classified-adjacent';
  counter?: number;
  ttlSeconds?: number;
}): string {
  const now = Date.now();
  const envelope = {
    deviceFingerprint: input.deviceFingerprint,
    sessionId: input.sessionId,
    sessionNonceLineage: ['nonce-0'],
    roleScopeHash: sha256(input.roleScope),
    operationType: input.operationType,
    targetHash: sha256(input.targetId),
    directionality: 'outbound' as const,
    brokerPathId: 'attack-sim',
    contextManifestHash: '0'.repeat(64),
    intentHash: '0'.repeat(64),
    intentClass: input.intentClass,
    classification: input.classification ?? 'sensitive',
    issuedAt: now,
    expiresAt: now + (input.ttlSeconds ?? 60) * 1000,
    counter: input.counter ?? 0
  };
  return Buffer.from(JSON.stringify(envelope)).toString('base64');
}

export async function invoke(brokerUrl: string, body: {
  capabilityToken: string;
  envelope: string;
  operationClass: string;
  targetId: string;
  targetClass: string;
}): Promise<{ status: number; body: InvokeResponse | DenyResponse }> {
  const res = await fetch(`${brokerUrl}/v1/invoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      capabilityToken: body.capabilityToken,
      envelope: body.envelope,
      operationClass: body.operationClass,
      targetId: body.targetId,
      targetClass: body.targetClass,
      intentHash: '0'.repeat(64),
      contextManifestHash: '0'.repeat(64),
      nonce: randomUUID() + randomUUID(),
      correlationId: randomUUID()
    })
  });
  return { status: res.status, body: await res.json() as InvokeResponse | DenyResponse };
}

export function isDeny(body: unknown): body is DenyResponse {
  return typeof body === 'object' && body !== null && 'code' in body;
}

export async function revoke(brokerUrl: string, kind: 'subject' | 'session' | 'device', id: string): Promise<void> {
  const res = await fetch(`${brokerUrl}/v1/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, id, reason: 'attack-sim-test' })
  });
  if (!res.ok) throw new Error(`revoke failed: ${res.status}`);
}
