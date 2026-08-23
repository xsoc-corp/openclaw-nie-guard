// Deadline wrapper for pipeline dependencies.
//
// Every await in /v1/invoke crosses into code the broker does not control: binding
// verification, envelope validation, adapter forwarding. Without a bound, a hung
// dependency holds the request open until some outer layer gives up, and the
// resulting failure carries no structured code and no Providence event. That is
// indistinguishable from a slow success and unusable for an operator.
//
// withDeadline rejects with DeadlineExceeded once the budget elapses. The caller
// denies on that; a timeout never falls through to allow.
//
// Note the underlying promise is not cancelled, JavaScript has no general
// cancellation, so the work may still complete and its result is discarded. The
// bound is on how long the request waits, not on the dependency's own execution.

export class DeadlineExceeded extends Error {
  readonly stage: string;
  readonly budgetMs: number;
  constructor(stage: string, budgetMs: number) {
    super(`stage ${stage} exceeded ${budgetMs}ms deadline`);
    this.name = 'DeadlineExceeded';
    this.stage = stage;
    this.budgetMs = budgetMs;
  }
}

export async function withDeadline<T>(stage: string, budgetMs: number, work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const bound = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceeded(stage, budgetMs)), budgetMs);
  });
  try {
    return await Promise.race([work, bound]);
  } finally {
    // Clear on both paths so a resolved race does not hold the event loop open.
    if (timer) clearTimeout(timer);
  }
}

// Per-stage budgets. Deliberately explicit rather than one global value: token
// verification and envelope validation are local or near-local, while the adapter
// crosses to an external tool or model endpoint and legitimately takes longer.
export const DEADLINES = {
  tokenVerify: Number(process.env.XSOC_DEADLINE_TOKEN_MS ?? 2000),
  nonceConsume: Number(process.env.XSOC_DEADLINE_NONCE_MS ?? 2000),
  envelopeValidate: Number(process.env.XSOC_DEADLINE_ENVELOPE_MS ?? 3000),
  adapterForward: Number(process.env.XSOC_DEADLINE_ADAPTER_MS ?? 15000)
} as const;