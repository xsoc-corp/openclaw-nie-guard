import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const IngestRequest = z.object({
  serverId: z.string().min(1),
  method: z.string().min(1),
  params: z.unknown(),
  content: z.string(),
  correlationId: z.string().uuid()
});

export async function registerMcpRoute(app: FastifyInstance): Promise<void> {
  app.post('/v1/mcp/ingest', async (req, reply) => {
    const correlationId = randomUUID();
    const parsed = IngestRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'ERR_POLICY_VIOLATION', message: 'Invalid MCP ingest.', correlationId });
    }

    const eval_ = app.services.mcpMediator.evaluateInvocation({
      serverId: parsed.data.serverId,
      method: parsed.data.method,
      params: parsed.data.params,
      correlationId: parsed.data.correlationId
    });
    if (!eval_.allowed) {
      app.services.providence.append({
        eventType: 'mcp_block',
        correlationId,
        reasonCode: eval_.reasonCode,
        metadata: { serverId: parsed.data.serverId, method: parsed.data.method }
      });
      return reply.code(403).send({ code: eval_.reasonCode, message: 'MCP server blocked.', correlationId });
    }

    const processed = app.services.mcpMediator.processResponse({
      serverId: parsed.data.serverId,
      result: parsed.data.content,
      correlationId: parsed.data.correlationId
    });

    if (processed.taintFound) {
      app.services.providence.append({
        eventType: 'mcp_tainted',
        correlationId,
        reasonCode: 'ERR_MCP_RESPONSE_TAINTED',
        metadata: { serverId: parsed.data.serverId, patterns: processed.taintPatterns }
      });
      return reply.code(403).send({
        code: 'ERR_MCP_RESPONSE_TAINTED',
        message: 'MCP response contained injection patterns.',
        correlationId,
        patterns: processed.taintPatterns
      });
    }

    return reply.code(200).send({ correlationId, tagged: processed.tagged });
  });
}
