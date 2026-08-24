import { z } from 'zod';
import { Classification } from './classification.js';

// Label lattice for taint propagation.
//
// The CCI attack class works by moving data across a transform that erases its
// origin: ciphertext fetched from an untrusted page is decrypted inside the
// agent's own runtime, and the plaintext then presents as first-party because
// taint was an attribute of the input channel rather than a property carried by
// the data. The fix is to make the label a property of the object and to union
// labels across every transform, so a decrypt inherits its inputs.
//
// This module defines the lattice and the node. It does not decide where labels
// attach across the interpreter; see the session-label store for the coarse
// tier that ships first.

// Origin of a piece of material entering the model context. Same value set as
// ContextElement.provenance, kept as a separate export so label code does not
// have to import a context type to name an origin.
export const Origin = z.enum([
  'user',
  'system',
  'rag',
  'tool-output',
  'mcp-response',
  'external-channel'
]);
export type Origin = z.infer<typeof Origin>;

// Origins that carry attacker-controllable content. An object with any of these
// in its origin set has been exposed to material the operator did not author.
export const UNTRUSTED_ORIGINS: readonly Origin[] = ['mcp-response', 'external-channel', 'rag'];

export function isUntrustedOrigin(origin: Origin): boolean {
  return UNTRUSTED_ORIGINS.includes(origin);
}

// Classification ordering, least to most restrictive. Exported because the join
// needs a total order and the zod enum does not provide one.
const CLASSIFICATION_ORDER: readonly Classification[] = [
  'public',
  'sensitive',
  'regulated',
  'classified-adjacent'
];

export function classificationRank(c: Classification): number {
  const i = CLASSIFICATION_ORDER.indexOf(c);
  // An unknown classification ranks highest rather than lowest. A value this
  // code does not recognise must not silently become the least restrictive one.
  return i === -1 ? CLASSIFICATION_ORDER.length : i;
}

// A label. Ordered by classification, and by set inclusion over origins.
export const Label = z.object({
  classification: Classification,
  origins: z.array(Origin)
});
export type Label = z.infer<typeof Label>;

// Bottom element. Joining anything with this yields the other operand.
export const BOTTOM: Label = { classification: 'public', origins: [] };

// Canonical form: origins sorted and deduplicated, so two labels with the same
// content have the same serialization and therefore the same hash.
export function canonicalLabel(label: Label): Label {
  return {
    classification: label.classification,
    origins: [...new Set(label.origins)].sort()
  };
}

// Least upper bound. Classification takes the more restrictive of the two;
// origins union. Monotone by construction: join never lowers a classification
// and never removes an origin, so a label can only become more restrictive as
// data flows. Only a declassification certificate produces a lower label, and
// it does so by creating a new node rather than relabelling an ancestor.
export function join(a: Label, b: Label): Label {
  const classification =
    classificationRank(a.classification) >= classificationRank(b.classification)
      ? a.classification
      : b.classification;
  return canonicalLabel({ classification, origins: [...a.origins, ...b.origins] });
}

export function joinAll(labels: readonly Label[]): Label {
  return labels.reduce(join, BOTTOM);
}

// True when this label carries any untrusted origin.
export function isTainted(label: Label): boolean {
  return label.origins.some(isUntrustedOrigin);
}

// Ordering test. True when `sub` is no more restrictive than `sup`, which is
// what a policy check asks: does the authority cover the data.
export function labelLeq(sub: Label, sup: Label): boolean {
  if (classificationRank(sub.classification) > classificationRank(sup.classification)) {
    return false;
  }
  return sub.origins.every((o) => sup.origins.includes(o));
}

// A node in the lineage DAG.
//
// nodeId is the identity of the content. parents are the nodes this one was
// derived from: for a transform with inputs I1..In the emitted node has
// parents {I1..In} and label join(label(I1)..label(In)). That single rule is
// what makes a sandbox decrypt worthless to an attacker, because the plaintext
// inherits the fetched page.
export const LineageNode = z.object({
  nodeId: z.string().length(64),
  label: Label,
  parents: z.array(z.string().length(64)),
  producedBy: z.string().min(1),
  recordedAt: z.number().int().positive()
});
export type LineageNode = z.infer<typeof LineageNode>;

// Canonical bytes for a label, for hashing into an envelope or an audit entry.
// Keys are emitted in a fixed order rather than relying on object key order.
export function canonicalLabelBytes(label: Label): string {
  const c = canonicalLabel(label);
  return JSON.stringify({ classification: c.classification, origins: c.origins });
}