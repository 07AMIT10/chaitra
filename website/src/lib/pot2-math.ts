/**
 * Asymptotic max-load estimates from Mitzenmacher / balls-into-bins analysis
 * (see POWER_OF_TWO_CHOICES/README.md).
 */

/** E[max load] ≈ ln N / ln ln N for pure random (1 choice) */
export function expectedMaxLoadRandom(nBins: number): number {
  if (nBins <= 1) return 1;
  const lnN = Math.log(nBins);
  const lnLnN = Math.log(lnN);
  if (!Number.isFinite(lnLnN) || lnLnN <= 0) return lnN;
  return lnN / lnLnN;
}

/** E[max load] ≈ ln ln N / ln 2 + O(1) for d = 2 choices */
export function expectedMaxLoadPowerOfTwo(nBins: number): number {
  if (nBins <= 1) return 1;
  const lnN = Math.log(nBins);
  if (lnN <= 1) return 1;
  const lnLnN = Math.log(lnN);
  return lnLnN / Math.LN2 + 1;
}

/** Format asymptotic estimate for metrics */
export function formatMaxLoadEstimate(n: number, strategy: "random" | "power-of-two"): string {
  const est =
    strategy === "random" ? expectedMaxLoadRandom(n) : expectedMaxLoadPowerOfTwo(n);
  return est.toFixed(1);
}
