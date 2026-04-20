import type { NieBindings } from '@xsoc/nie-bindings';
import type { PolicyEngine } from '@xsoc/policy-engine';
import type { ProvidenceLog } from '@xsoc/providence-log';
import type { FheGate } from '@xsoc/fhe-gate';
import type { McpMediator } from '@xsoc/mcp-mediator';

export interface BrokerServices {
  bindings: NieBindings;
  policy: PolicyEngine;
  providence: ProvidenceLog;
  fheGate: FheGate;
  mcpMediator: McpMediator;
}

declare module 'fastify' {
  interface FastifyInstance {
    services: BrokerServices;
  }
}
