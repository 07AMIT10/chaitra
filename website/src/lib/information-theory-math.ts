/**
 * Shannon information measures (INFORMATION_THEORY/README.md).
 */

/** Shannon entropy H(X) in bits; ignores p ≤ 0. */
export function shannonEntropy(probs: number[]): number {
  return -probs
    .filter((p) => p > 0)
    .reduce((sum, p) => sum + p * Math.log2(p), 0);
}

/** Surprisal I(x) = -log₂ P(x) in bits. */
export function surprisal(p: number): number {
  if (p <= 0) return Infinity;
  return -Math.log2(p);
}

export function maxSurprisal(probs: number[]): number {
  const positive = probs.filter((p) => p > 0);
  if (positive.length === 0) return 0;
  return Math.max(...positive.map((p) => surprisal(p)));
}

/** Uniform distribution over n symbols. */
export function uniformDistribution(n: number): number[] {
  if (n <= 0) return [];
  const p = 1 / n;
  return Array(n).fill(p);
}

/** Cross-entropy H(P, Q) = -Σ P(x) log₂ Q(x). */
export function crossEntropy(p: number[], q: number[]): number {
  let h = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    if (pi > 0 && qi > 0) h -= pi * Math.log2(qi);
  }
  return h;
}

/** KL divergence D_KL(P ‖ Q) in bits. */
export function klDivergence(p: number[], q: number[]): number {
  let d = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    if (pi > 0 && qi > 0) d += pi * Math.log2(pi / qi);
  }
  return d;
}

export function formatBits(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)} bits`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Entropy of P vs uniform over the same alphabet size. */
export function entropyVsUniform(probs: number[]): {
  h: number;
  uniformH: number;
  gap: number;
  crossEntropyUniform: number;
  klUniform: number;
} {
  const n = probs.length;
  const uniform = uniformDistribution(n);
  const h = shannonEntropy(probs);
  const uniformH = shannonEntropy(uniform);
  return {
    h,
    uniformH,
    gap: uniformH - h,
    crossEntropyUniform: crossEntropy(probs, uniform),
    klUniform: klDivergence(probs, uniform),
  };
}
