import { DEFAULT_DENY_CATEGORIES, STRICT_ONLY_CATEGORIES, type MediatedOperation, type AdapterResponse } from './types.js';

export interface OpenClawTransport {
  /** The transport's name, as forwarded records carry it in metadata transport. */
  readonly name: string;
  /** The version of what the transport reaches, when it reports one. */
  readonly version?: string;
  getStatus(): Promise<AdapterResponse>;
  invokeTool(op: MediatedOperation): Promise<AdapterResponse>;
  invokeNode(op: MediatedOperation): Promise<AdapterResponse>;
  readResource(op: MediatedOperation): Promise<AdapterResponse>;
  writeResource(op: MediatedOperation): Promise<AdapterResponse>;
  executeRestricted(op: MediatedOperation): Promise<AdapterResponse>;
}

export class OpenClawAdapter {
  constructor(private readonly transport: OpenClawTransport) {}

  get transportName(): string { return this.transport.name; }
  get transportVersion(): string | undefined { return this.transport.version; }

  /**
   * Forward one mediated operation. The answer says whether the transport was called:
   * forwarded false is the adapter's own refusal.
   */
  async forward(op: MediatedOperation, profile: string): Promise<AdapterResponse> {
    const r = await this.route(op, profile);
    return { ...r, forwarded: r.forwarded !== false };
  }

  private async route(op: MediatedOperation, profile: string): Promise<AdapterResponse> {
    if (DEFAULT_DENY_CATEGORIES.has(op.operationClass) && profile !== 'strict' && profile !== 'scif') {
      return { ok: false, forwarded: false, error: { code: 'ERR_OPERATION_BLOCKED', message: `${op.operationClass} requires strict or scif profile.` } };
    }

    if (STRICT_ONLY_CATEGORIES.has(op.operationClass) && profile === 'standard') {
      return { ok: false, forwarded: false, error: { code: 'ERR_OPERATION_BLOCKED', message: `${op.operationClass} not permitted at standard profile.` } };
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
        return { ok: false, forwarded: false, error: { code: 'ERR_OPERATION_BLOCKED', message: `Unknown operation class.` } };
    }
  }
}
