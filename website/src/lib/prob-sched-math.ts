/**
 * Probabilistic scheduling formulas (PROBABILISTIC_SCHEDULING/README.md).
 */

/** P(at least one "good" node in k random samples) = 1 − (1 − p)^k */
export function successProbability(pGood: number, sampleSize: number): number {
  const p = Math.min(1, Math.max(0, pGood));
  const k = Math.max(0, Math.floor(sampleSize));
  if (k <= 0) return 0;
  return 1 - Math.pow(1 - p, k);
}

/** Expected max load under uniform random placement ≈ λ + √(2 λ ln m) (balls-into-bins heuristic). */
export function heuristicMaxLoadRandom(tasks: number, workers: number): number {
  if (workers <= 0) return tasks;
  const lambda = tasks / workers;
  if (lambda <= 0) return 0;
  const m = workers;
  return lambda + Math.sqrt(2 * lambda * Math.log(Math.max(m, 2)));
}

/** Greedy optimal (min-load) max load is ceil(tasks / workers). */
export function optimalMaxLoad(tasks: number, workers: number): number {
  if (workers <= 0) return tasks;
  return Math.ceil(tasks / workers);
}

export function formatPercent(fraction: number): string {
  return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(0)}%`;
}

export function formatProbability(p: number): string {
  if (p <= 0) return "0";
  if (p >= 0.999) return "~100%";
  return formatPercent(p);
}
