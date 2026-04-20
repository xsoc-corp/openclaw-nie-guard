import { sanitizeResponse, tagExternalContent } from './sanitizer.js';
import type { McpInvocation, McpResponse, ServerTrustEntry } from './types.js';

export class McpMediator {
  private readonly trustTable = new Map<string, ServerTrustEntry>();

  loadTrustTable(entries: ServerTrustEntry[]): void {
    this.trustTable.clear();
    for (const entry of entries) {
      this.trustTable.set(entry.serverId, entry);
    }
  }

  evaluateInvocation(invocation: McpInvocation): { allowed: boolean; reasonCode?: string } {
    const entry = this.trustTable.get(invocation.serverId);
    if (!entry) return { allowed: false, reasonCode: 'ERR_MCP_SERVER_BLOCKED' };
    if (entry.trustLevel === 'blocked') return { allowed: false, reasonCode: 'ERR_MCP_SERVER_BLOCKED' };
    return { allowed: true };
  }

  processResponse(response: McpResponse): { tagged: string; taintFound: boolean; taintPatterns: string[] } {
    const entry = this.trustTable.get(response.serverId);
    const raw = typeof response.result === 'string' ? response.result : JSON.stringify(response.result);
    const { sanitized, taintFound, taintPatterns } = sanitizeResponse(raw);
    const tagged = entry?.trustLevel === 'trusted' ? sanitized : tagExternalContent(response.serverId, sanitized);
    return { tagged, taintFound, taintPatterns };
  }
}
