import { DEFAULT_DENY_CATEGORIES, STRICT_ONLY_CATEGORIES, type MediatedOperation, type AdapterResponse } from './types.js';

export interface OpenClawTransport {
  getStatus(): Promise<AdapterResponse>;
  invokeTool(op: MediatedOperation): Promise<AdapterResponse>;
  invokeNode(op: MediatedOperation): Promise<AdapterResponse>;
  readResource(op: MediatedOperation): Promise<AdapterResponse>;
  writeResource(op: MediatedOperation): Promise<AdapterResponse>;
  executeRestricted(op: MediatedOperation): Promise<AdapterResponse>;
}

export class OpenClawAdapter {
  constructor(private readonly transport: OpenClawTransport) {}

  async forward(op: MediatedOperation, profile: string): Promise<AdapterResponse> {
    if (DEFAULT_DENY_CATEGORIES.has(op.operationClass) && profile !== 'strict' && profile !== 'scif') {
      return { ok: false, error: { code: 'ERR_OPERATION_BLOCKED', message: `${op.operationClass} requires strict or scif profile.` } };
    }

    if (STRICT_ONLY_CATEGORIES.has(op.operationClass) && profile === 'standard') {
      return { ok: false, error: { code: 'ERR_OPERATION_BLOCKED', message: `${op.operationClass} not permitted at standard profile.` } };
    }

    switch (op.operationClass) {
      case 'operator.read':
      case 'file.read':
        return this.transport.readResource(op);
      case 'operator.write':
      case 'file.write':
        return this.transport.writeResource(op);
      case 'tool.invoke':
        return this.transport.invokeTool(op);
      case 'node.invoke':
        return this.transport.invokeNode(op);
      case 'exec.run':
      case 'admin.control':
        return this.transport.executeRestricted(op);
      case 'export.data':
        // Export is read-shaped but flagged with directionality marker in the envelope.
        return this.transport.readResource(op);
      default:
        return { ok: false, error: { code: 'ERR_OPERATION_BLOCKED', message: `Unknown operation class.` } };
    }
  }
}
