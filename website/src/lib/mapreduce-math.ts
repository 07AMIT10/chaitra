/**
 * MapReduce formulas (MAPREDUCE/README.md § cluster failure, tail latency).
 */

/** P(no failures) = (1 − p)^N for N independent servers with daily fail prob p */
export function noFailureProbability(p: number, n: number): number {
  if (n <= 0) return 1;
  const q = 1 - Math.min(1, Math.max(0, p));
  return Math.pow(q, n);
}

/** E[max(T₁,…,Tₙ)] ≈ ln(N) / λ for i.i.d. exponential task times (rate λ) */
export function expectedMaxExponential(n: number, rate = 1): number {
  if (n <= 1) return rate > 0 ? 1 / rate : 0;
  return Math.log(n) / rate;
}

/** E[min(T, T′)] for two i.i.d. exponentials ≈ 1/(2λ) — backup truncates tail */
export function expectedMinOfTwoExponential(rate = 1): number {
  return rate > 0 ? 1 / (2 * rate) : 0;
}

/** Toy speedup from duplicate in-flight tasks vs waiting on one straggler (ratio ≥ 1) */
export function backupSpeedup(stragglerUnits: number, fastUnits: number): number {
  if (fastUnits <= 0) return 1;
  return stragglerUnits / fastUnits;
}

export function formatProbability(p: number): string {
  if (p >= 0.01) return `${(p * 100).toFixed(2)}%`;
  if (p > 0) return `${(p * 100).toFixed(4)}%`;
  return "0%";
}

export function formatTimeUnits(u: number): string {
  return `${u.toFixed(1)} u`;
}

export function formatSpeedup(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}
