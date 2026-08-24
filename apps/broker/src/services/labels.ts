import { BOTTOM, join, isUntrustedOrigin, type Label, type Origin } from '@xsoc/shared-types';
import type { Classification } from '@xsoc/shared-types';

// Session label store, coarse tier.
//
// The broker never sees context element content, only asserted hashes with a
// declared provenance and classification. That rules out per-object labelling
// here: an agent choosing its own content hashes chooses its own node
// identities. What it cannot choose is that registering material with an
// untrusted origin raises the label of the session it registered under.
//
// So the label attaches to the session rather than the object. The moment any
// untrusted-origin element is registered, the session label joins and stays
// joined for the life of the session absent an explicit declassification. Every
// authorization decision in that session is then evaluated against the raised
// label.
//
// What this does not do, stated so nobody assumes otherwise: it cannot say
// which object was the vector, only that the session was exposed. Object-level
// attribution needs the instrumented tier, which needs the content, which needs
// the sandbox to be a component we control.

export interface SessionLabelEntry {
  label: Label;
  /** When the session first acquired an untrusted origin, if it has. */
  taintedAt?: number;
  /** Correlation id of the registration that raised it, for forensics. */
  taintedBy?: string;
}

export class SessionLabelStore {
  private readonly labels = new Map<string, SessionLabelEntry>();

  /** Current label for a session. Untracked sessions are BOTTOM, not an error. */
  get(sessionId: string): Label {
    return this.labels.get(sessionId)?.label ?? BOTTOM;
  }

  entry(sessionId: string): SessionLabelEntry | undefined {
    return this.labels.get(sessionId);
  }

  /**
   * Joins `incoming` into the session label. Monotone: the stored label can only
   * become more restrictive. Returns the label after the join.
   */
  join(sessionId: string, incoming: Label, correlationId?: string): Label {
    const existing = this.labels.get(sessionId);
    const before = existing?.label ?? BOTTOM;
    const after = joinLabels(before, incoming);

    const becameTainted =
      !before.origins.some(isUntrustedOrigin) && after.origins.some(isUntrustedOrigin);

    this.labels.set(sessionId, {
      label: after,
      taintedAt: existing?.taintedAt ?? (becameTainted ? Date.now() : undefined),
      taintedBy: existing?.taintedBy ?? (becameTainted ? correlationId : undefined)
    });

    return after;
  }

  /**
   * Joins the labels of a set of registered context elements into the session.
   * Provenance and classification are the caller's assertion, which is
   * acceptable here: a caller understating its own origin only restricts itself
   * less, and the untrusted origins that matter are the ones a fetch declares.
   */
  joinElements(
    sessionId: string,
    elements: readonly { provenance: Origin; classification: Classification }[],
    correlationId?: string
  ): Label {
    let acc = this.get(sessionId);
    for (const e of elements) {
      acc = joinLabels(acc, { classification: e.classification, origins: [e.provenance] });
    }
    return this.join(sessionId, acc, correlationId);
  }

  /** True when the session carries any untrusted origin. */
  isTainted(sessionId: string): boolean {
    return this.get(sessionId).origins.some(isUntrustedOrigin);
  }

  /**
   * Drops a session's label. Called on revocation, never as a way to clear
   * taint: there is no lowering operation here, and declassification is a
   * separate signed act that produces a new node rather than editing this one.
   */
  forget(sessionId: string): void {
    this.labels.delete(sessionId);
  }

  size(): number {
    return this.labels.size;
  }
}

// Local alias so the class method name does not shadow the imported join.
function joinLabels(a: Label, b: Label): Label {
  return join(a, b);
}