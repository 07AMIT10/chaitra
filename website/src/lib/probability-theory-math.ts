/**
 * Core probability measures (PROBABILITY_THEORY/README.md).
 */

/** Bernoulli mean μ = P(success). */
export function bernoulliMean(pSuccess: number): number {
  return pSuccess;
}

/** Bernoulli variance σ² = p(1−p). */
export function bernoulliVariance(pSuccess: number): number {
  return pSuccess * (1 - pSuccess);
}

/** Fair die face mean E[X] = (1 + … + sides) / sides. */
export function fairDieMean(sides: number): number {
  if (sides <= 0) return 0;
  return (sides + 1) / 2;
}

/** Fair die variance Var(X) for faces 1..sides. */
export function fairDieVariance(sides: number): number {
  if (sides <= 1) return 0;
  const mu = fairDieMean(sides);
  let sumSq = 0;
  for (let face = 1; face <= sides; face++) sumSq += (face - mu) ** 2;
  return sumSq / sides;
}

/** Sample mean from face histogram (faces 1..sides). */
export function sampleMeanFromHistogram(hist: number[], sides: number): number {
  const n = hist.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < sides; i++) sum += (i + 1) * (hist[i] ?? 0);
  return sum / n;
}

/** Expected count per face for n fair rolls. */
export function expectedCountPerFace(n: number, sides: number): number {
  return sides > 0 ? n / sides : 0;
}

/** |sample mean − μ| (LLN distance). */
export function llnAbsoluteError(sampleMean: number, mu: number): number {
  return Math.abs(sampleMean - mu);
}

/** Kolmogorov axiom checks on empirical probabilities. */
export function axiomCheck(empiricalProbs: number[]): {
  inUnitInterval: boolean;
  sumsToOne: boolean;
  sum: number;
} {
  const sum = empiricalProbs.reduce((a, b) => a + b, 0);
  const inUnitInterval = empiricalProbs.every((p) => p >= 0 && p <= 1 + 1e-9);
  const sumsToOne = Math.abs(sum - 1) < 1e-6;
  return { inUnitInterval, sumsToOne, sum };
}

/** Chebyshev bound P(|X−μ| ≥ kσ) ≤ 1/k² (displays bound, not empirical). */
export function chebyshevTailBound(k: number): number {
  if (k <= 0) return 1;
  return 1 / (k * k);
}

export function formatMu(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}
