export const config = {
  host: process.env.BROKER_HOST ?? '0.0.0.0',
  port: Number(process.env.BROKER_PORT ?? '8443'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  bindingsMode: process.env.NIE_BINDINGS_MODE ?? 'mock',
  providenceDataDir: process.env.PROVIDENCE_DATA_DIR ?? './data/providence',
  providenceChainFile: process.env.PROVIDENCE_CHAIN_FILE ?? './data/providence/chain.jsonl',
  policyBundlePath: process.env.POLICY_BUNDLE_PATH ?? './infra/policy/default-bundle.json',
  logLevel: process.env.LOG_LEVEL ?? 'info'
};
