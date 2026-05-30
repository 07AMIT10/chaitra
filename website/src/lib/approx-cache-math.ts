/**
 * Approximate memory / cache formulas (APPROXIMATE_MEMORY_CACHE_SYSTEMS/README.md).
 */

/** P ≈ (0.6185)^(m/n) — Bloom false-positive rate from bits per item */
export const BLOOM_FP_BASE = 0.6185339691391814;

export function falsePositiveFromBitsPerItem(bitsPerItem: number): number {
  if (bitsPerItem <= 0) return 1;
  return Math.pow(BLOOM_FP_BASE, bitsPerItem);
}

export function bitsPerItemFromFpr(fpr: number): number {
  if (fpr <= 0) return 32;
  if (fpr >= 1) return 1;
  return Math.log(fpr) / Math.log(BLOOM_FP_BASE);
}

/** m = -(n ln p) / (ln 2)² — same as bloom-math.bitArraySize */
export function bloomBitCount(items: number, targetFpr: number): number {
  if (items <= 0 || targetFpr <= 0 || targetFpr >= 1) return 16;
  return Math.ceil(-(items * Math.log(targetFpr)) / (Math.LN2 * Math.LN2));
}

/** E[Cost] = R_m + P · R_d for an absent-key probe of one SSTable */
export function expectedAbsentLookupCost(
  ramMicros: number,
  diskMicros: number,
  falsePositiveRate: number
): number {
  const p = Math.min(1, Math.max(0, falsePositiveRate));
  return ramMicros + p * diskMicros;
}

/** Fraction of disk reads avoided vs always reading disk (absent key, one table) */
export function diskReadSavingsPercent(falsePositiveRate: number): number {
  return (1 - Math.min(1, Math.max(0, falsePositiveRate))) * 100;
}

export function formatMicroseconds(us: number): string {
  if (us >= 1000) return `${(us / 1000).toFixed(1)} ms`;
  return `${us.toFixed(0)} µs`;
}

export function formatPercent(fraction: number): string {
  return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(1)}%`;
}

export function formatBitsPerItem(bits: number): string {
  return `${bits.toFixed(1)} bits/item`;
}

export function hitRatio(hits: number, accesses: number): number {
  if (accesses <= 0) return 0;
  return hits / accesses;
}

export function formatHitRatio(hits: number, accesses: number): string {
  return formatPercent(hitRatio(hits, accesses));
}
