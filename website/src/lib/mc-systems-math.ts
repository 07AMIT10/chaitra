/**
 * Monte Carlo error and estimates (MONTE_CARLO_SYSTEMS/README.md).
 * π via quarter-circle hits; ∫₀¹ x² dx = 1/3 for integration demo.
 */

export const PI_TRUE = Math.PI;
export const INTEGRAL_X2_TRUE = 1 / 3;

/** Quarter unit disk: x² + y² ≤ 1 in [0,1]² */
export function isInsideQuarterCircle(x: number, y: number): boolean {
  return x * x + y * y <= 1;
}

/** π̂ = 4 × (hits / N) */
export function piEstimate(inside: number, samples: number): number {
  if (samples <= 0) return 0;
  return (4 * inside) / samples;
}

/**
 * Std error of π̂ when p̂ = hits/N (Bernoulli): SE(4p̂) = 4√(p(1−p)/N).
 */
export function piStandardError(inside: number, samples: number): number {
  if (samples <= 0) return Infinity;
  const p = inside / samples;
  return (4 * Math.sqrt((p * (1 - p)) / samples));
}

/** Theory SE at true p = π/4 */
export function piStandardErrorTheory(samples: number): number {
  if (samples <= 0) return Infinity;
  const p = PI_TRUE / 4;
  return 4 * Math.sqrt((p * (1 - p)) / samples);
}

/** ∫₀¹ x² dx */
export function integralXSquaredEstimate(meanFx: number): number {
  return meanFx;
}

/** SE of sample mean: √(s²/N) */
export function meanStandardError(sampleVariance: number, samples: number): number {
  if (samples <= 0) return Infinity;
  return Math.sqrt(sampleVariance / samples);
}

export function absoluteError(estimate: number, truth: number): number {
  return Math.abs(estimate - truth);
}

/** README: halving error needs ~4× samples */
export function samplesToHalveError(currentSamples: number): number {
  return currentSamples * 4;
}

export function formatMc(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}
