// Scaffolding, not product. This transport answers every mediated operation itself and
// never contacts OpenClaw. The broker loads it only when started with
// BROKER_SCAFFOLDING_TRANSPORT=1 (the production build refuses to start with it
// otherwise), and every record of an operation forwarded through it carries metadata
// transport: scaffolding, so no record it produced can be read as production traffic.
// The OpenClaw gateway transport replaces it on the production path.

import type { MediatedOperation, AdapterResponse } from '@xsoc/openclaw-adapter';

export class MockOpenClawTransport {
  readonly name = 'scaffolding';
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
