import type { SanitizationResult } from './types.js';

// Heuristic patterns associated with prompt injection attempts in external content.
// Not exhaustive; production deployment should also run content through a model-based classifier.
const INJECTION_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'system-prompt-override', pattern: /ignore (all )?(previous|prior|above) (instructions?|prompts?)/gi },
  { name: 'role-injection', pattern: /you are (now|actually) (a|an) /gi },
  { name: 'jailbreak-direct', pattern: /\bdan\s+mode\b|\bjailbreak\b/gi },
  { name: 'tool-hijack', pattern: /(call|invoke|use) the (?:tool|function|mcp) (?:named )?/gi },
  { name: 'exfil-prompt', pattern: /(send|post|upload|exfiltrate) (this|all|everything) to/gi },
  { name: 'credential-harvest', pattern: /(api[_-]?key|secret|password|token)[\s:=]+[A-Za-z0-9_-]{8,}/gi }
];

export function sanitizeResponse(raw: string): SanitizationResult {
  const found: string[] = [];
  let sanitized = raw;
  for (const { name, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      found.push(name);
      sanitized = sanitized.replace(pattern, '[REDACTED_INJECTION_PATTERN]');
    }
  }
  return { sanitized, taintFound: found.length > 0, taintPatterns: found };
}

export function tagExternalContent(serverId: string, content: string): string {
  return `<external_content source="${serverId}" trust="untrusted">\n${content}\n</external_content>`;
}
