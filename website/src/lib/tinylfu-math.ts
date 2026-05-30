/** Cache hit ratio from access trace replay */
export function hitRatio(hits: number, accesses: number): number {
  if (accesses <= 0) return 0;
  return hits / accesses;
}

export function formatHitRatio(hits: number, accesses: number): string {
  return `${(hitRatio(hits, accesses) * 100).toFixed(1)}%`;
}

/** CMS overestimate bound from README: f ≤ f̂ ≤ f + εW */
export function cmsErrorUpperBound(epsilon: number, windowEvents: number): number {
  return epsilon * windowEvents;
}
