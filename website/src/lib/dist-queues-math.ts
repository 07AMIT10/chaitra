/**
 * Distributed queue formulas (DISTRIBUTED_QUEUES/README.md — Little's law, M/M/c utilization).
 */

/** Deterministic partition for a keyed message: Hash(key) % partitions */
export function hashPartition(key: number, partitions: number): number {
  if (partitions <= 0) return 0;
  let h = key | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h % partitions;
}

/** Little's law: L = λ · W (average items in system) */
export function littlesLaw(lambda: number, avgTimeInSystem: number): number {
  return lambda * avgTimeInSystem;
}

/** M/M/c utilization ρ = λ / (c · μ) */
export function utilizationMc(lambda: number, servers: number, mu: number): number {
  if (servers <= 0 || mu <= 0) return Infinity;
  return lambda / (servers * mu);
}

/** Max partition lag vs mean load (hot-spot severity) */
export function maxPartitionLag(loads: number[]): number {
  if (loads.length === 0) return 0;
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  const max = Math.max(...loads);
  return max - mean;
}

/** Imbalance ratio max/mean (1 = perfectly balanced) */
export function imbalanceRatio(loads: number[]): number {
  if (loads.length === 0) return 1;
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  if (mean <= 0) return 1;
  return Math.max(...loads) / mean;
}

export function formatRate(r: number): string {
  return `${r.toLocaleString()}/s`;
}

export function formatLag(lag: number): string {
  if (!Number.isFinite(lag)) return "∞";
  return lag.toFixed(1);
}

export function formatRatio(r: number): string {
  if (!Number.isFinite(r)) return "∞";
  return `${r.toFixed(2)}×`;
}

export function formatRho(rho: number): string {
  if (!Number.isFinite(rho)) return "∞";
  return rho.toFixed(2);
}
