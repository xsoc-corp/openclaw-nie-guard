import { scenarios } from './scenarios/index.js';

async function run(): Promise<void> {
  const brokerUrl = process.env.BROKER_URL ?? 'http://localhost:8443';
  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    try {
      const ok = await scenario.run({ brokerUrl });
      if (ok) {
        console.log(`[PASS] ${scenario.id}: ${scenario.description}`);
        passed++;
      } else {
        console.error(`[FAIL] ${scenario.id}: ${scenario.description}`);
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] ${scenario.id}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed, ${scenarios.length} total.`);
  if (failed > 0) process.exit(1);
}

run();
