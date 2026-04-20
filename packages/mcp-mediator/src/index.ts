// @xsoc/mcp-mediator
//
// MCP server responses are a second untrusted input channel. This mediator:
//   1. Authenticates the MCP server request against the policy bundle's mcpServers list
//   2. Sanitizes responses for known prompt-injection patterns
//   3. Tags residual untrusted content with <external_content> markers
//   4. Registers response elements in the Context Provenance Chain

export { McpMediator } from './mediator.js';
export { sanitizeResponse, tagExternalContent } from './sanitizer.js';
export type { McpInvocation, McpResponse, SanitizationResult } from './types.js';
