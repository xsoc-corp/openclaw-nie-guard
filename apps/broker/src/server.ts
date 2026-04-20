import Fastify, { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { loadBindings } from '@xsoc/nie-bindings';
import { PolicyEngine } from '@xsoc/policy-engine';
import { ProvidenceLog } from '@xsoc/providence-log';
import { createMockFheGate } from '@xsoc/fhe-gate';
import { McpMediator } from '@xsoc/mcp-mediator';
import { registerAdmitRoute } from './routes/admit.js';
import { registerInvokeRoute } from './routes/invoke.js';
import { registerRevokeRoute } from './routes/revoke.js';
import { registerSessionRoute } from './routes/session.js';
import { registerAuditRoute } from './routes/audit.js';
import { registerHealthRoute } from './routes/health.js';
import { registerVersionRoute } from './routes/version.js';
import { config } from './config.js';
import type { BrokerServices } from './services/context.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });

  await app.register(sensible);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const bindings = await loadBindings();
  const policy = new PolicyEngine();
  const providence = new ProvidenceLog(config.providenceChainFile);
  const fheGate = createMockFheGate();
  const mcpMediator = new McpMediator();

  const services: BrokerServices = { bindings, policy, providence, fheGate, mcpMediator };
  app.decorate('services', services);

  await registerAdmitRoute(app);
  await registerInvokeRoute(app);
  await registerRevokeRoute(app);
  await registerSessionRoute(app);
  await registerAuditRoute(app);
  await registerHealthRoute(app);
  await registerVersionRoute(app);

  return app;
}
