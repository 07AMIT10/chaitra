/** HLL standard error estimate — 1.04 / sqrt(m) */
export function hllStandardError(b: number): number {
  const m = 1 << b;
  return 1.04 / Math.sqrt(m);
}

export function alphaM(m: number): number {
  if (m === 16) return 0.673;
  if (m === 32) return 0.697;
  if (m === 64) return 0.709;
  return 0.7213 / (1 + 1.079 / m);
}
