import Fastify, { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { loadBindings } from '@xsoc/nie-bindings';
import { PolicyEngine } from '@xsoc/policy-engine';
import { ProvidenceLog, AnchorScheduler, anchorIntervalSeconds, signerSelfTest } from '@xsoc/providence-log';
import { createProvidenceSigner, ALLOWED_ANCHOR_ALGORITHMS } from '@xsoc/providence-signer';
import { loadFheGate } from '@xsoc/fhe-gate';
import { McpMediator } from '@xsoc/mcp-mediator';
import { OpenClawAdapter } from '@xsoc/openclaw-adapter';
import { MockOpenClawTransport } from '@xsoc/openclaw-mock';
import { registerAdmitRoute } from './routes/admit.js';
import { registerInvokeRoute } from './routes/invoke.js';
import { registerRevokeRoute } from './routes/revoke.js';
import { registerSessionRoute } from './routes/session.js';
import { registerAuditRoute } from './routes/audit.js';
import { registerHealthRoute } from './routes/health.js';
import { registerVersionRoute } from './routes/version.js';
import { registerCosignRoute } from './routes/cosign.js';
import { registerContextRoute } from './routes/context.js';
import { registerMcpRoute } from './routes/mcp.js';
import { registerSkillRoute } from './routes/skill.js';
import { config } from './config.js';
import type { BrokerServices } from './services/context.js';
import { BrokerProvidence } from './services/providence.js';
import { SessionLabelStore } from './services/labels.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });

  await app.register(sensible);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const bindings = await loadBindings();
  const policy = new PolicyEngine();
  // Providence. The signer is created and proved before anything is served: a
  // signer that fails its self-test, or whose algorithm this build does not
  // accept, stops startup. A chain whose last record disagrees with its head
  // starts the broker refusing every action it would record.
  const anchorInterval = anchorIntervalSeconds(config.providenceAnchorInterval);
  const signer = await createProvidenceSigner();
  await signerSelfTest(signer, ALLOWED_ANCHOR_ALGORITHMS);
  const providenceLog = new ProvidenceLog({
    dir: config.providenceDataDir,
    chainId: config.providenceChainId,
    legacyChainFile: config.providenceChainFile
  });
  if (providenceLog.refusal) {
    app.log.error({ reason: providenceLog.refusal }, 'Providence chain refuses appends; every recorded action will be denied');
  }
  const anchors = new AnchorScheduler(providenceLog, signer, anchorInterval);
  anchors.start();
  app.addHook('onClose', async () => {
    await anchors.stop();
  });
  app.log.info(
    { chainId: providenceLog.chainId, algorithm: signer.algorithm, keyId: signer.keyId, anchorIntervalSeconds: anchorInterval },
    'Providence signer ready'
  );
  const providence = new BrokerProvidence(providenceLog);
  const fheGate = await loadFheGate();
  const mcpMediator = new McpMediator();

  // Seed MCP trust table for dev. Production loads from signed policy bundle.
  mcpMediator.loadTrustTable([
    { serverId: 'telegram-bot', trustLevel: 'sanitized', sanitizationProfile: 'external-channel' },
    { serverId: 'slack-connector', trustLevel: 'sanitized', sanitizationProfile: 'external-channel' },
    { serverId: 'email-ingest', trustLevel: 'sanitized', sanitizationProfile: 'external-channel' },
    { serverId: 'internal-docs', trustLevel: 'trusted' },
    { serverId: 'attacker-mcp', trustLevel: 'blocked' }
  ]);

  const transport = new MockOpenClawTransport();
  const adapter = new OpenClawAdapter(transport);

  const services: BrokerServices = {
    bindings, policy, providence, fheGate, mcpMediator, adapter,
    registeredManifests: new Set(),
    sessionLabels: new SessionLabelStore()
  };
  app.decorate('services', services);

  await registerAdmitRoute(app);
  await registerInvokeRoute(app);
  await registerRevokeRoute(app);
  await registerSessionRoute(app);
  await registerAuditRoute(app);
  await registerHealthRoute(app);
  await registerVersionRoute(app);
  await registerCosignRoute(app);
  await registerContextRoute(app);
  await registerMcpRoute(app);
  await registerSkillRoute(app);

  return app;
}