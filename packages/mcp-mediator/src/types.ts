export interface McpInvocation {
  serverId: string;
  method: string;
  params: unknown;
  correlationId: string;
}

export interface McpResponse {
  serverId: string;
  result: unknown;
  correlationId: string;
}

export interface SanitizationResult {
  sanitized: string;
  taintFound: boolean;
  taintPatterns: string[];
}

export interface ServerTrustEntry {
  serverId: string;
  trustLevel: 'trusted' | 'sanitized' | 'blocked';
  sanitizationProfile?: string;
}
