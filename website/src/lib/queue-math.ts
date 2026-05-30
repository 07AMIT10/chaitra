/**
 * M/M/1 closed-form metrics (QUEUEING_THEORY/README.md § Little's law, M/M/1).
 */

/** Utilization ρ = λ / μ */
export function utilization(lambda: number, mu: number): number {
  if (mu <= 0) return Infinity;
  return lambda / mu;
}

/** Average items waiting in queue: L_q = ρ² / (1 − ρ) */
export function theoreticalQueueLength(rho: number): number {
  if (rho >= 1) return Infinity;
  return (rho * rho) / (1 - rho);
}

/** Average wait in queue (W_q): ρ / (μ(1 − ρ)) */
export function theoreticalWait(rho: number, mu: number): number {
  if (rho >= 1 || mu <= 0) return Infinity;
  return rho / (mu * (1 - rho));
}

/** Average time in system W = W_q + 1/μ = 1 / (μ − λ) */
export function theoreticalSystemTime(lambda: number, mu: number): number {
  if (lambda >= mu) return Infinity;
  return 1 / (mu - lambda);
}

export function formatRate(r: number): string {
  return `${r}/sec`;
}

export function formatRho(rho: number): string {
  if (!Number.isFinite(rho)) return "∞";
  return rho.toFixed(2);
}

export function formatQueueMetric(value: number, unit = ""): string {
  if (!Number.isFinite(value)) return "∞";
  return `${value.toFixed(2)}${unit}`;
}
