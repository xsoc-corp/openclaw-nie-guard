import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProvidenceUnavailable } from '@xsoc/providence-log';
import type { OperatorAuth } from '../lib/operator-auth.js';

/** The most records one page carries. */
export const AUDIT_PAGE_MAX = 1000;
const AUDIT_PAGE_DEFAULT = 100;

const AuditQuery = z
  .object({
    from: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(AUDIT_PAGE_MAX).default(AUDIT_PAGE_DEFAULT)
  })
  .strict();

/**
 * GET /v1/audit?from=<seq>&limit=<n>: the Providence chain, read-only, by sequence.
 * Operators only.
 *
 * Each record is served as the line chain-v3.jsonl holds, byte for byte, with its
 * digest, so the offline verifier can be run on exactly what was served. The page
 * carries the head it was read under, with its commitment, and the anchors whose
 * head falls inside it. `next` is the seq to ask for next; it equals head.seq when
 * the page reaches the head. When the chain refuses appends, `refusal` says why.
 */
export async function registerAuditRoute(app: FastifyInstance, auth: OperatorAuth): Promise<void> {
  app.get('/v1/audit', { preHandler: auth.preHandler() }, async (req, reply) => {
    const parsed = AuditQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ message: `from is a non-negative integer and limit is 1 to ${AUDIT_PAGE_MAX}` });
    }
    const log = app.services.providence.log;
    let page;
    try {
      page = log.page(parsed.data.from, parsed.data.limit);
    } catch (err) {
      if (err instanceof ProvidenceUnavailable) {
        return reply.code(503).send({ message: err.message });
      }
      throw err;
    }
    return reply.code(200).send({
      chain_id: log.chainId,
      head: page.head,
      from: parsed.data.from,
      next: page.next,
      records: page.records,
      anchors: page.anchors,
      ...(log.refusal ? { refusal: log.refusal } : {})
    });
  });
}
