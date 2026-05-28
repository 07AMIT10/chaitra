/** False positive rate: (1 - e^(-kn/m))^k */
export function falsePositiveRate(m: number, n: number, k: number): number {
  if (m <= 0 || n < 0 || k < 1) return 0;
  const exponent = (-k * n) / m;
  return Math.pow(1 - Math.exp(exponent), k);
}

/** k ≈ (m/n) ln 2 — matches BLOOM_FILTERS/bloom_filter.py get_hash_count */
export function optimalK(m: number, n: number): number {
  if (n <= 0) return 1;
  return Math.max(1, Math.round((m / n) * Math.LN2));
}

/** m = -(n ln p) / (ln 2)² */
export function bitArraySize(itemsCount: number, fpProb: number): number {
  if (itemsCount <= 0 || fpProb <= 0 || fpProb >= 1) return 16;
  const m = (-(itemsCount * Math.log(fpProb))) / Math.LN2 ** 2;
  return Math.max(16, Math.min(512, Math.ceil(m)));
}

/** int((m/n) * ln 2) — same as Python int(k) */
export function hashCountFromSizing(m: number, itemsCount: number): number {
  if (itemsCount <= 0) return 1;
  return Math.max(1, Math.min(16, Math.floor((m / itemsCount) * Math.LN2)));
}

export function fillRatio(bits: Uint8Array): number {
  if (bits.length === 0) return 0;
  let set = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i]) set++;
  return set / bits.length;
}
