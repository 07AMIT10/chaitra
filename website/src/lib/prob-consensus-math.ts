/**
 * Probabilistic consensus formulas (PROBABILISTIC_CONSENSUS/README.md — Nakamoto, Avalanche).
 */

/** Poisson PMF P(X = k) with rate λ */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * P(attacker rewrites history) after z confirmations (Gambler's ruin / Nakamoto).
 * Matches README table for q = 0.1: z=1 → ~0.2, z=5 → ~0.001, z=10 → ~1.2e-6.
 */
export function nakamotoReversalProbability(z: number, q: number): number {
  const clampedQ = Math.max(0, Math.min(1, q));
  if (z <= 0) return 1;
  const p = 1 - clampedQ;
  if (clampedQ >= p) return 1;
  const ratio = clampedQ / p;
  const lambda = z * ratio;
  let honestWins = 0;
  for (let k = 0; k <= z; k++) {
    honestWins += poissonPmf(k, lambda) * (1 - Math.pow(ratio, Math.max(0, z - k)));
  }
  return Math.max(0, Math.min(1, 1 - honestWins));
}

export function nakamotoFinality(z: number, q: number): number {
  return 1 - nakamotoReversalProbability(z, q);
}

/** Smallest z with P(reversal) ≤ maxReversal (cap at maxSearch). */
export function confirmationsForThreshold(
  q: number,
  maxReversal: number,
  maxSearch = 40
): number {
  if (q >= 0.5) return -1;
  for (let z = 1; z <= maxSearch; z++) {
    if (nakamotoReversalProbability(z, q) <= maxReversal) return z;
  }
  return maxSearch + 1;
}

/** Avalanche: need > k/2 samples for α to be meaningful */
export function avalancheSupermajorityMet(redVotes: number, alpha: number): boolean {
  return redVotes >= alpha;
}

export function formatProbability(p: number): string {
  if (p >= 0.01) return `${(p * 100).toFixed(2)}%`;
  if (p >= 1e-6) return `${(p * 100).toFixed(4)}%`;
  return p === 0 ? "0%" : `<${(1e-6 * 100).toFixed(4)}%`;
}

export function formatReversal(p: number): string {
  return `P(reversal) = ${formatProbability(p)}`;
}

export function formatFinality(p: number): string {
  return `P(final) = ${formatProbability(p)}`;
}
