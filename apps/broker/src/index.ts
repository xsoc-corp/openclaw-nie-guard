import { buildServer } from './server.js';
import { config } from './config.js';

async function main(): Promise<void> {
  const server = await buildServer();
  try {
    await server.listen({ host: config.host, port: config.port });
    server.log.info({ port: config.port, mode: config.bindingsMode }, 'broker listening');
  } catch (err) {
    server.log.error({ err }, 'failed to start broker');
    process.exit(1);
  }
}

main();
