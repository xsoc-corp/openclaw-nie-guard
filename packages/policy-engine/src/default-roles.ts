import type { OperationClass, PolicyProfile } from '@xsoc/shared-types';

// Default role matrix used when no signed bundle is loaded (development only).
// Production MUST load a signed bundle. See docs/policy-rules.md.
export interface RoleDefinition {
  description: string;
  allowedOperations: OperationClass[];
  defaultProfile: PolicyProfile;
  requiresDualControl: OperationClass[];
}

export const DEFAULT_ROLE_MATRIX: Record<string, RoleDefinition> = {
  viewer: {
    description: 'Read-only access to operator resources.',
    allowedOperations: ['operator.read'],
    defaultProfile: 'standard',
    requiresDualControl: []
  },
  analyst: {
    description: 'Read plus approved read-only tool invocation.',
    allowedOperations: ['operator.read', 'tool.invoke'],
    defaultProfile: 'standard',
    requiresDualControl: []
  },
  operator: {
    description: 'Read, write, and approved tool invocation.',
    allowedOperations: ['operator.read', 'operator.write', 'tool.invoke', 'file.read', 'file.write'],
    defaultProfile: 'standard',
    requiresDualControl: []
  },
  orchestrator: {
    description: 'Multi-agent orchestration across nodes. Sub-agent flows use CDT.',
    allowedOperations: ['operator.read', 'operator.write', 'tool.invoke', 'node.invoke', 'file.read', 'file.write'],
    defaultProfile: 'strict',
    requiresDualControl: []
  },
  admin: {
    description: 'Administrative control. Dual-control enforced on all admin operations.',
    allowedOperations: ['admin.control', 'exec.run'],
    defaultProfile: 'strict',
    requiresDualControl: ['admin.control', 'exec.run']
  },
  node_admin: {
    description: 'Node administration. Pairing ops only via enrollment ceremony.',
    allowedOperations: ['node.invoke'],
    defaultProfile: 'strict',
    requiresDualControl: ['node.invoke']
  }
};
