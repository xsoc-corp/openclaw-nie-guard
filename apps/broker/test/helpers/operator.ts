// Test scaffolding: an operator credential for the broker's authenticated routes.

import { createHash, randomUUID } from 'node:crypto';
import { OperatorAuth } from '../../src/lib/operator-auth.js';

export const OPERATOR_TOKEN = 'test-operator-' + randomUUID();
export const OPERATOR_HEADERS = { authorization: `Bearer ${OPERATOR_TOKEN}` };

export function testOperatorAuth(): OperatorAuth {
  return new OperatorAuth([createHash('sha256').update(OPERATOR_TOKEN).digest('hex')]);
}
