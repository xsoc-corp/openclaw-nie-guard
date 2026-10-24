import { buildServer } from './server.js';
import { config } from './config.js';

async function main(): Promise<void> {
  const server = await buildServer();
  // A signal closes the server, which stops the anchor scheduler and writes the
  // shutdown anchor over the head, so the last records before a stop are
  // anchored as well. A second signal during the close exits at once.
  let closing = false;
  const stop = (signal: NodeJS.Signals) => {
    if (closing) process.exit(1);
    closing = true;
    server.log.info({ signal }, 'broker stopping: closing the server and anchoring the head');
    server.close().then(
      () => process.exit(0),
      (err: unknown) => {
        server.log.error({ err }, 'broker close failed');
        process.exit(1);
      }
    );
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    await server.listen({ host: config.host, port: config.port });
    server.log.info({ port: config.port, mode: config.bindingsMode }, 'broker listening');
  } catch (err) {
    server.log.error({ err }, 'failed to start broker');
    process.exit(1);
  }
}

main();
