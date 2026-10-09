export const config = {
  host: process.env.BROKER_HOST ?? '0.0.0.0',
  port: Number(process.env.BROKER_PORT ?? '8443'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  bindingsMode: process.env.NIE_BINDINGS_MODE ?? 'mock',
  providenceDataDir: process.env.PROVIDENCE_DATA_DIR ?? './data/providence',
  // The earlier-format chain, kept as it is. The v3 chain lives beside it in
  // providenceDataDir, and its first record names this file's final head.
  providenceChainFile: process.env.PROVIDENCE_CHAIN_FILE ?? './data/providence/chain.jsonl',
  // aida-guard/<deployment-id>. The production build requires it; this build
  // defaults to a local deployment id.
  providenceChainId: process.env.PROVIDENCE_CHAIN_ID ?? 'aida-guard/local',
  providenceChainIdConfigured: (process.env.PROVIDENCE_CHAIN_ID ?? '') !== '',
  // 1 to 3600 seconds, 300 when unset; anything else stops startup.
  providenceAnchorInterval: process.env.PROVIDENCE_ANCHOR_INTERVAL_SECONDS,
  policyBundlePath: process.env.POLICY_BUNDLE_PATH ?? './infra/policy/default-bundle.json',
  logLevel: process.env.LOG_LEVEL ?? 'info'
};
