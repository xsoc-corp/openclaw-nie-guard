// 23 attack scenarios mapped to the threat model. Each is deterministic and self-contained.
// See docs/threat-model.md and docs/exploit-mapping-and-disclosure-policy.md.

export interface ScenarioContext {
  brokerUrl: string;
}

export interface Scenario {
  id: string;
  description: string;
  expectedEventType?: string;
  expectedErrorCode?: string;
  run(ctx: ScenarioContext): Promise<boolean>;
}

// Scenario files will be populated in Phase 6. For now we list stubs that match the threat model.
const scenarioSpecs: Array<Omit<Scenario, 'run'>> = [
  { id: '01', description: 'Valid admission and allowed tool invocation', expectedEventType: 'invoke' },
  { id: '02', description: 'Token replay on admission', expectedEventType: 'replay_fail', expectedErrorCode: 'ERR_NONCE_REPLAY' },
  { id: '03', description: 'Scope widening attempt', expectedEventType: 'scope_fail', expectedErrorCode: 'ERR_SCOPE_DENIED' },
  { id: '04', description: 'Target substitution attack', expectedEventType: 'target_mismatch', expectedErrorCode: 'ERR_TARGET_MISMATCH' },
  { id: '05', description: 'Runtime drift or revoked session', expectedEventType: 'continuity_fail', expectedErrorCode: 'ERR_CONTINUITY_FAILED' },
  { id: '06', description: 'exec.run attempted outside strict profile', expectedEventType: 'tool_block', expectedErrorCode: 'ERR_OPERATION_BLOCKED' },
  { id: '07', description: 'Agent intent drift: intent_class mismatches operation', expectedEventType: 'intent_drift', expectedErrorCode: 'ERR_INTENT_DRIFT' },
  { id: '08', description: 'MCP response contains prompt injection', expectedEventType: 'mcp_tainted', expectedErrorCode: 'ERR_MCP_RESPONSE_TAINTED' },
  { id: '09', description: 'Context manifest ID not in Providence chain', expectedEventType: 'deny', expectedErrorCode: 'ERR_CONTEXT_MANIFEST_INVALID' },
  { id: '10', description: 'Streaming response continuity failure on chunk 7 of 20', expectedEventType: 'continuity_fail', expectedErrorCode: 'ERR_CONTINUITY_FAILED' },
  { id: '11', description: 'admin.control without cosign within window', expectedEventType: 'dual_control_denied', expectedErrorCode: 'ERR_DUAL_CONTROL_TIMEOUT' },
  { id: '12', description: 'Policy bundle tampered in Redis', expectedEventType: 'policy_bundle_rejected', expectedErrorCode: 'ERR_POLICY_BUNDLE_INVALID' },
  { id: '13', description: 'Shadow policy diverges from live policy', expectedEventType: 'deny', expectedErrorCode: 'ERR_POLICY_VIOLATION' },
  { id: '14', description: 'Regulated classification forced to Mode C without dual-control', expectedEventType: 'dual_control_denied', expectedErrorCode: 'ERR_DUAL_CONTROL_REQUIRED' },
  { id: '15', description: 'Mode A similarity search on FHE-encrypted RAG chunks', expectedEventType: 'invoke' },
  { id: '16', description: 'Telegram-class MCP prompt injection', expectedEventType: 'mcp_tainted', expectedErrorCode: 'ERR_MCP_RESPONSE_TAINTED' },
  { id: '17', description: 'Sub-agent pairing privilege escalation attempt (CVE-2026-33579 class)', expectedEventType: 'scope_fail', expectedErrorCode: 'ERR_SCOPE_DENIED' },
  { id: '18', description: 'Policy bundle signature forgery', expectedEventType: 'policy_bundle_rejected', expectedErrorCode: 'ERR_POLICY_BUNDLE_INVALID' },
  { id: '19', description: 'Lethal-trifecta drift in long session', expectedEventType: 'profile_escalated' },
  { id: '20', description: 'Honest-but-curious model endpoint extracts Mode A context', expectedEventType: 'endpoint_attestation_fail', expectedErrorCode: 'ERR_ENDPOINT_ATTESTATION_FAILED' },
  { id: '21', description: 'Malicious skill registration with unsigned bundle (ClawHavoc class)', expectedEventType: 'skill_unsigned', expectedErrorCode: 'ERR_SKILL_UNSIGNED' },
  { id: '22', description: 'Browser pivot admission attempt from loopback-bound client', expectedEventType: 'deny', expectedErrorCode: 'ERR_ATTESTATION_FAILED' },
  { id: '23', description: 'Email inbound with embedded prompt injection', expectedEventType: 'mcp_tainted', expectedErrorCode: 'ERR_MCP_RESPONSE_TAINTED' }
];

// TODO(xsoc-openclaw-poc): wire each scenario's run() implementation during Phase 6.
// Skeleton implementations that return true are placeholders.
export const scenarios: Scenario[] = scenarioSpecs.map((spec) => ({
  ...spec,
  async run(_ctx: ScenarioContext): Promise<boolean> {
    // Placeholder. Real implementation issues HTTP calls to the broker and asserts responses.
    console.log(`  (skeleton) ${spec.id}: ${spec.description}`);
    return true;
  }
}));
