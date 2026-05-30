/** Version vectors, stale-read bounds — mirrors EVENTUAL_CONSISTENCY/README.md */

export type VersionVector = Record<string, number>;

/** Component-wise max merge (Cassandra / Dynamo style). */
export function versionVectorMerge(a: VersionVector, b: VersionVector): VersionVector {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged: VersionVector = {};
  for (const k of keys) merged[k] = Math.max(a[k] ?? 0, b[k] ?? 0);
  return merged;
}

export function formatVector(v: VersionVector): string {
  const parts = Object.entries(v)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => `${k}:${n}`);
  return parts.length ? `{${parts.join(", ")}}` : "{}";
}

/** True when every replica shares the same merged vector and value. */
export function replicasConverged(
  vectors: VersionVector[],
  values: (number | null)[]
): boolean {
  if (vectors.length === 0) return true;
  const merged = vectors.reduce((acc, v) => versionVectorMerge(acc, v));
  const ref = formatVector(merged);
  const allSameVec = vectors.every((v) => formatVector(v) === ref);
  const first = values.find((x) => x !== null);
  const allSameVal = values.every((x) => x === first);
  return allSameVec && allSameVal && first !== null;
}

/**
 * P(stale | Δt) for W=1, R=1, read from one random replica:
 * ((N-1)/N) · e^{-λΔt}
 */
export function staleReadProbability(n: number, lambda: number, deltaT: number): number {
  if (n <= 1) return 0;
  const missReplica = (n - 1) / n;
  const notArrived = Math.exp(-lambda * Math.max(0, deltaT));
  return missReplica * notArrived;
}

/** CDF: replication message arrived by time t — 1 - e^{-λt}. */
export function replicationArrivalProbability(lambda: number, deltaT: number): number {
  return 1 - Math.exp(-lambda * Math.max(0, deltaT));
}

/** Strong quorum: W + R > N (for compare panel). */
export function quorumSatisfied(n: number, w: number, r: number): boolean {
  return w + r > n;
}

export function formatProbability(p: number): string {
  if (p >= 0.9995) return "≈100%";
  if (p <= 0.0005) return "≈0%";
  if (p >= 0.01) return `${(p * 100).toFixed(1)}%`;
  return `${(p * 100).toFixed(2)}%`;
}

export function formatDeltaT(seconds: number): string {
  if (seconds < 0.001) return `${(seconds * 1e6).toFixed(0)} µs`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  return `${seconds.toFixed(2)} s`;
}
