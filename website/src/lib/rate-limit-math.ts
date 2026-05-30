/** Google SRE client-side drop probability (see RATE_LIMITING README). */
export function sreDropProbability(requests: number, accepts: number, k = 2): number {
  if (requests <= 0) return 0;
  return Math.max(0, (requests - k * accepts) / (requests + 1));
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(0)}%`;
}

/** Token-budget upper bound on accept fraction over a fixed window. */
export function tokenBucketAcceptBound(
  capacity: number,
  refillRate: number,
  requestRate: number,
  durationSec: number
): number {
  const offered = requestRate * durationSec;
  if (offered <= 0) return 1;
  const budget = capacity + refillRate * durationSec;
  return Math.min(1, budget / offered);
}
