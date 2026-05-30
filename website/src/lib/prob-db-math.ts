/**
 * Probabilistic database formulas — PROBABILISTIC_DATABASES/README.md.
 *
 * Safe (extensional) plans for independent tuples:
 *   AND:  P(A ∧ B) = P(A) · P(B)
 *   OR:   P(A ∨ B) = 1 − (1 − P(A)) · (1 − P(B))
 * Boolean query: P(Q) = Σ P(W_i) over worlds where Q is true (#P-hard in general).
 */

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function formatConfidence(p: number, digits = 1): string {
  const c = clamp01(p);
  if (c <= 0) return "0%";
  if (c >= 0.9995) return "~100%";
  if (c < 0.001) return `${(c * 100).toFixed(3)}%`;
  return `${(c * 100).toFixed(digits)}%`;
}

/** Independent conjunction P(⋀ A_i). */
export function probIndependentAnd(confidences: number[]): number {
  if (confidences.length === 0) return 1;
  return confidences.reduce((acc, p) => acc * clamp01(p), 1);
}

/** Independent disjunction P(⋁ A_i) = 1 − Π(1 − P_i). */
export function probIndependentOr(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  return 1 - confidences.reduce((acc, p) => acc * (1 - clamp01(p)), 1);
}

/** Row passes a confidence threshold filter (extensional SELECT). */
export function tuplePassesThreshold(confidence: number, threshold: number): boolean {
  return clamp01(confidence) >= clamp01(threshold);
}

/** Count of possible worlds for n independent existence bits (2^n). */
export function possibleWorldsCount(uncertainTupleCount: number): number {
  const n = Math.max(0, Math.floor(uncertainTupleCount));
  if (n > 30) return Number.POSITIVE_INFINITY;
  return 2 ** n;
}

export function formatWorldsCount(count: number): string {
  if (!Number.isFinite(count)) return "2^n (too many to enumerate)";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}
