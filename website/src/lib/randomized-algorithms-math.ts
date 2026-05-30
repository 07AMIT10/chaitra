/**
 * Formulas for RANDOMIZED_ALGORITHMS/README.md (Las Vegas vs Monte Carlo).
 */

/** P(MC picks the true k-th smallest with one uniform index probe), distinct elements. */
export function monteCarloSingleProbeSuccess(n: number): number {
  if (n <= 0) return 0;
  return 1 / n;
}

/** P(at least one probe hits the true k-th) with m independent uniform probes (with replacement). */
export function monteCarloAnyHitSuccess(n: number, probes: number): number {
  if (n <= 0 || probes <= 0) return 0;
  return 1 - Math.pow(1 - 1 / n, probes);
}

/** Expected comparisons for randomized quickselect (order statistic), ~2n (CLRS). */
export function lasVegasExpectedComparisons(n: number): number {
  if (n <= 0) return 0;
  return 2 * n;
}

/** Worst-case comparisons for always-first-pivot quickselect on sorted input: Θ(n²). */
export function deterministicWorstComparisons(n: number): number {
  if (n <= 2) return Math.max(0, n - 1);
  return (n * (n - 1)) / 2;
}

export function formatRa(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (digits === 0) return String(Math.round(value));
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}
