/**
 * Binary-hypothesis Bayes — BAYESIAN_INFERENCE_SYSTEMS/README.md.
 *
 * P(H|E) = P(E|H)·P(H) / P(E),  P(E) = P(E|H)·P(H) + P(E|¬H)·(1−P(H))
 */

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function formatPercent(fraction: number, digits = 1): string {
  const p = clamp01(fraction);
  if (p > 0 && p < 1e-4) return `${(p * 100).toExponential(2)}%`;
  return `${(p * 100).toFixed(digits)}%`;
}

/** Human-readable posterior (handles tiny disease-test values). */
export function formatPosterior(fraction: number): string {
  const p = clamp01(fraction);
  if (p <= 0) return "0%";
  if (p >= 0.9995) return "~100%";
  if (p < 1e-6) return `${(p * 100).toExponential(2)}%`;
  if (p < 0.001) return `${(p * 100).toFixed(4)}%`;
  return formatPercent(p, 1);
}

/** Marginal likelihood P(E). */
export function marginalEvidence(
  prior: number,
  likelihoodGivenH: number,
  likelihoodGivenNotH: number
): number {
  const h = clamp01(prior);
  const leH = clamp01(likelihoodGivenH);
  const leNotH = clamp01(likelihoodGivenNotH);
  return leH * h + leNotH * (1 - h);
}

/** Posterior P(H|E) after one binary observation. */
export function posterior(
  prior: number,
  likelihoodGivenH: number,
  likelihoodGivenNotH: number
): number {
  const h = clamp01(prior);
  const leH = clamp01(likelihoodGivenH);
  const leNotH = clamp01(likelihoodGivenNotH);
  const num = leH * h;
  const den = marginalEvidence(h, leH, leNotH);
  return den > 0 ? num / den : h;
}

/** Likelihood ratio P(E|H) / P(E|¬H). */
export function likelihoodRatio(likelihoodGivenH: number, likelihoodGivenNotH: number): number {
  const leNotH = clamp01(likelihoodGivenNotH);
  if (leNotH <= 0) return Infinity;
  return clamp01(likelihoodGivenH) / leNotH;
}

/** Minisim-compatible: P(E|¬H) = 1 − P(E|H). */
export function posteriorSymmetricLikelihood(prior: number, likelihoodGivenH: number): number {
  const leH = clamp01(likelihoodGivenH);
  return posterior(prior, leH, 1 - leH);
}
