// 23 attack scenarios. The six highest-leverage scenarios (01, 03, 04, 05, 07, 17)
// have working HTTP-driven implementations. Remaining scenarios are skeletons to be
// wired in subsequent commits.

import { admit, buildMockEnvelope, invoke, isDeny, revoke } from './helpers.js';

export interface ScenarioContext {
  brokerUrl: string;
}

export interface Scenario {
  id: string;
  description: string;
  expectedEventType?: string;
  expectedErrorCode?: string;
  implemented: boolean;
  run(ctx: ScenarioContext): Promise<boolean>;
}

// ---------- Working scenarios with real HTTP logic ----------

const scenario01: Scenario = {
  id: '01',
  description: 'Valid admission and allowed tool invocation',
  expectedEventType: 'invoke',
  implemented: true,
  async run({ brokerUrl }) {
    const adm = await admit(brokerUrl);
    const env = buildMockEnvelope({
      deviceFingerprint: 'dev-test',
      sessionId: adm.sessionId,
      roleScope: 'tool.invoke',
      operationType: 'tool.invoke',
      targetId: 'target-a',
      intentClass: 'read'
    });
    const r = await invoke(brokerUrl, {
      capabilityToken: adm.capabilityToken,
      envelope: env,
      operationClass: 'tool.invoke',
      targetId: 'target-a',
      targetClass: 'generic'
    });
    return r.status === 200 && !isDeny(r.body);
  }
};

const scenario03: Scenario = {
  id: '03',
  description: 'Scope widening: viewer attempting exec.run',
  expectedEventType: 'scope_fail',
  expectedErrorCode: 'ERR_SCOPE_DENIED',
  implemented: true,
  async run({ brokerUrl }) {
    const adm = await admit(brokerUrl, { requestedRole: 'viewer', requestedOperationSet: ['operator.read'] });
    const env = buildMockEnvelope({
      deviceFingerprint: 'dev-test',
      sessionId: adm.sessionId,
      roleScope: 'exec.run',
      operationType: 'exec.run',
      targetId: 'target-exec',
      intentClass: 'execute'
    });
    const r = await invoke(brokerUrl, {
      capabilityToken: adm.capabilityToken,
      envelope: env,
      operationClass: 'exec.run',
      targetId: 'target-exec',
      targetClass: 'system'
    });
    return r.status === 403 && isDeny(r.body) && r.body.code === 'ERR_SCOPE_DENIED';
  }
};

const scenario04: Scenario = {
  id: '04',
  description: 'Target substitution: envelope binds target-a, request says target-b',
  expectedEventType: 'target_mismatch',
  expectedErrorCode: 'ERR_TARGET_MISMATCH',
  implemented: true,
  async run({ brokerUrl }) {
    const adm = await admit(brokerUrl);
    const env = buildMockEnvelope({
      deviceFingerprint: 'dev-test',
      sessionId: adm.sessionId,
      roleScope: 'tool.invoke',
      operationType: 'tool.invoke',
      targetId: 'target-a',
      intentClass: 'read'
    });
    const r = await invoke(brokerUrl, {
      capabilityToken: adm.capabilityToken,
      envelope: env,
      operationClass: 'tool.invoke',
      targetId: 'target-b',
      targetClass: 'generic'
    });
    return r.status === 403 && isDeny(r.body) && r.body.code === 'ERR_TARGET_MISMATCH';
  }
};

const scenario05: Scenario = {
  id: '05',
  description: 'Revoked session: token used after revocation',
  expectedEventType: 'deny',
  expectedErrorCode: 'ERR_SESSION_REVOKED',
  implemented: true,
  async run({ brokerUrl }) {
    const adm = await admit(brokerUrl);
    await revoke(brokerUrl, 'session', adm.sessionId);
    const env = buildMockEnvelope({
      deviceFingerprint: 'dev-test',
      sessionId: adm.sessionId,
      roleScope: 'tool.invoke',
      operationType: 'tool.invoke',
      targetId: 'target-a',
      intentClass: 'read'
    });
    const r = await invoke(brokerUrl, {
      capabilityToken: adm.capabilityToken,
      envelope: env,
      operationClass: 'tool.invoke',
      targetId: 'target-a',
      targetClass: 'generic'
    });
    return r.status === 401 && isDeny(r.body) && r.body.code === 'ERR_SESSION_REVOKED';
  }
};

const scenario07: Scenario = {
  id: '07',
  description: 'Intent drift: tool.invoke with declared intent = export',
  expectedEventType: 'intent_drift',
  expectedErrorCode: 'ERR_INTENT_DRIFT',
  implemented: true,
  async run({ brokerUrl }) {
    const adm = await admit(brokerUrl);
    const env = buildMockEnvelope({
      deviceFingerprint: 'dev-test',
      sessionId: adm.sessionId,
      roleScope: 'tool.invoke',
      operationType: 'tool.invoke',
      targetId: 'target-a',
      intentClass: 'export' // mismatched; tool.invoke only permits read, analyze, write
    });
    const r = await invoke(brokerUrl, {
      capabilityToken: adm.capabilityToken,
      envelope: env,
      operationClass: 'tool.invoke',
      targetId: 'target-a',
      targetClass: 'generic'
    });
    return r.status === 403 && isDeny(r.body) && r.body.code === 'ERR_INTENT_DRIFT';
  }
};

const scenario17: Scenario = {
  id: '17',
  description: 'Pairing privilege escalation (CVE-2026-33579 class): viewer attempts admin.control',
  expectedEventType: 'scope_fail',
  expectedErrorCode: 'ERR_SCOPE_DENIED',
  implemented: true,
  async run({ brokerUrl }) {
    const adm = await admit(brokerUrl, { requestedRole: 'viewer', requestedOperationSet: ['operator.read'] });
    const env = buildMockEnvelope({
      deviceFingerprint: 'dev-test',
      sessionId: adm.sessionId,
      roleScope: 'admin.control',
      operationType: 'admin.control',
      targetId: 'system-config',
      intentClass: 'escalate',
      classification: 'regulated'
    });
    const r = await invoke(brokerUrl, {
      capabilityToken: adm.capabilityToken,
      envelope: env,
      operationClass: 'admin.control',
      targetId: 'system-config',
      targetClass: 'system'
    });
    return r.status === 403 && isDeny(r.body) && r.body.code === 'ERR_SCOPE_DENIED';
  }
};

// ---------- Skeleton placeholders for scenarios 02, 06, 08-16, 18-23 ----------

function skeleton(id: string, description: string, extras: Partial<Scenario> = {}): Scenario {
  return {
    id,
    description,
    ...extras,
    implemented: false,
    async run() {
      console.log(`  (skeleton) ${id}: ${description}`);
      return true;
    }
  };
}

export const scenarios: Scenario[] = [
  scenario01,
  skeleton('02', 'Token replay on admission', { expectedErrorCode: 'ERR_NONCE_REPLAY' }),
  scenario03,
  scenario04,
  scenario05,
  skeleton('06', 'exec.run attempted outside strict profile', { expectedErrorCode: 'ERR_OPERATION_BLOCKED' }),
  scenario07,
  skeleton('08', 'MCP response contains prompt injection', { expectedErrorCode: 'ERR_MCP_RESPONSE_TAINTED' }),
  skeleton('09', 'Context manifest ID not in Providence chain', { expectedErrorCode: 'ERR_CONTEXT_MANIFEST_INVALID' }),
  skeleton('10', 'Streaming response continuity failure on chunk 7 of 20', { expectedErrorCode: 'ERR_CONTINUITY_FAILED' }),
  skeleton('11', 'admin.control without cosign within window', { expectedErrorCode: 'ERR_DUAL_CONTROL_TIMEOUT' }),
  skeleton('12', 'Policy bundle tampered in Redis', { expectedErrorCode: 'ERR_POLICY_BUNDLE_INVALID' }),
  skeleton('13', 'Shadow policy diverges from live policy'),
  skeleton('14', 'Regulated classification forced to Mode C without dual-control', { expectedErrorCode: 'ERR_DUAL_CONTROL_REQUIRED' }),
  skeleton('15', 'Mode A similarity search on FHE-encrypted RAG chunks'),
  skeleton('16', 'Telegram-class MCP prompt injection', { expectedErrorCode: 'ERR_MCP_RESPONSE_TAINTED' }),
  scenario17,
  skeleton('18', 'Policy bundle signature forgery', { expectedErrorCode: 'ERR_POLICY_BUNDLE_INVALID' }),
  skeleton('19', 'Lethal-trifecta drift in long session'),
  skeleton('20', 'Honest-but-curious model endpoint extracts Mode A context', { expectedErrorCode: 'ERR_ENDPOINT_ATTESTATION_FAILED' }),
  skeleton('21', 'Malicious skill registration with unsigned bundle (ClawHavoc class)', { expectedErrorCode: 'ERR_SKILL_UNSIGNED' }),
  skeleton('22', 'Browser pivot admission attempt from loopback-bound client', { expectedErrorCode: 'ERR_ATTESTATION_FAILED' }),
  skeleton('23', 'Email inbound with embedded prompt injection', { expectedErrorCode: 'ERR_MCP_RESPONSE_TAINTED' })
];
