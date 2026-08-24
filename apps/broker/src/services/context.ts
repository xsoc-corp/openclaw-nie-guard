import type { NieBindings } from '@xsoc/nie-bindings';
import type { PolicyEngine } from '@xsoc/policy-engine';
import type { ProvidenceLog } from '@xsoc/providence-log';
import type { FheGate } from '@xsoc/fhe-gate';
import type { McpMediator } from '@xsoc/mcp-mediator';
import type { OpenClawAdapter } from '@xsoc/openclaw-adapter';
import type { SessionLabelStore } from './labels.js';

export interface BrokerServices {
  bindings: NieBindings;
  policy: PolicyEngine;
  providence: ProvidenceLog;
  fheGate: FheGate;
  mcpMediator: McpMediator;
  adapter: OpenClawAdapter;
  // Set of content-manifest hashes that have been registered via /v1/context/register.
  // The broker rejects invoke requests carrying unregistered non-zero manifest hashes.
  registeredManifests: Set<string>;
  // Per-session taint label, joined at context registration and read at
  // authorization. Coarse tier: the label attaches to the session rather than to
  // individual objects, because the broker holds asserted hashes and never the
  // element content.
  sessionLabels: SessionLabelStore;
}

declare module 'fastify' {
  interface FastifyInstance {
    services: BrokerServices;
  }
}
