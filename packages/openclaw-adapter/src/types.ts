import type { OperationClass } from '@xsoc/shared-types';

export interface MediatedOperation {
  operationClass: OperationClass;
  targetId: string;
  targetClass: string;
  payload: unknown;
  /**
   * SHA-256 of correlationId:targetId:operationClass, binding the forwarded operation
   * to the broker's decision. A hash anyone can compute, not a signature.
   */
  bindingHash: string;
  correlationId: string;
}

export interface AdapterResponse {
  ok: boolean;
  /**
   * Set by the adapter: true when the transport answered, false when the adapter
   * refused the operation itself without calling the transport.
   */
  forwarded?: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

// Operation categories that are default-deny without explicit policy approval plus strict profile.
export const DEFAULT_DENY_CATEGORIES = new Set<OperationClass>([
  'exec.run',
  'admin.control'
]);

// Operation classes permitted to flow through the adapter only when the envelope indicates
// strict or scif profile. Standard profile denies by default for these.
export const STRICT_ONLY_CATEGORIES = new Set<OperationClass>([
  'node.invoke',
  'export.data'
]);
