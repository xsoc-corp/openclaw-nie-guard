import type { MediatedOperation, AdapterResponse } from '@xsoc/openclaw-adapter';

export class MockOpenClawTransport {
  async getStatus(): Promise<AdapterResponse> {
    return { ok: true, result: { status: 'mock-ok' } };
  }
  async invokeTool(op: MediatedOperation): Promise<AdapterResponse> {
    return { ok: true, result: { tool: op.targetId, mocked: true } };
  }
  async invokeNode(op: MediatedOperation): Promise<AdapterResponse> {
    return { ok: true, result: { node: op.targetId, mocked: true } };
  }
  async readResource(op: MediatedOperation): Promise<AdapterResponse> {
    return { ok: true, result: { resource: op.targetId, content: '[mock content]' } };
  }
  async writeResource(op: MediatedOperation): Promise<AdapterResponse> {
    return { ok: true, result: { resource: op.targetId, written: true } };
  }
  async executeRestricted(op: MediatedOperation): Promise<AdapterResponse> {
    return { ok: true, result: { command: op.targetId, mocked: true } };
  }
}
