import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Operator authentication for the broker's read routes.
 *
 * An operator presents `Authorization: Bearer <token>`. The broker holds only the
 * SHA-256 of each accepted token, in BROKER_OPERATOR_TOKEN_SHA256 (comma-separated,
 * 64 lowercase hex each), read when the server is built. The presented token is
 * hashed and compared with each in constant time. With no accepted token configured,
 * every request is refused: the routes behind this are closed until an operator
 * credential exists.
 */
export class OperatorAuth {
  private readonly accepted: Buffer[];

  constructor(hashes: readonly string[]) {
    for (const h of hashes) {
      if (!/^[0-9a-f]{64}$/.test(h)) throw new Error('BROKER_OPERATOR_TOKEN_SHA256 holds a value that is not 64 lowercase hex');
    }
    this.accepted = hashes.map((h) => Buffer.from(h, 'hex'));
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): OperatorAuth {
    const raw = env.BROKER_OPERATOR_TOKEN_SHA256 ?? '';
    return new OperatorAuth(raw.split(',').map((s) => s.trim()).filter((s) => s !== ''));
  }

  get configured(): boolean {
    return this.accepted.length > 0;
  }

  /** Whether the request carries an accepted operator token. */
  authenticates(req: FastifyRequest): boolean {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
    const token = header.slice('Bearer '.length);
    if (token.length === 0) return false;
    const presented = createHash('sha256').update(token, 'utf8').digest();
    let match = false;
    for (const a of this.accepted) {
      // Every accepted hash is compared, so the time taken does not say which matched.
      if (timingSafeEqual(a, presented)) match = true;
    }
    return match;
  }

  /** A preHandler that answers 401 to anything but an authenticated operator. */
  preHandler() {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!this.authenticates(req)) {
        return reply
          .code(401)
          .header('www-authenticate', 'Bearer')
          .send({ message: this.configured ? 'operator authentication required' : 'operator authentication is not configured on this broker' });
      }
    };
  }
}
