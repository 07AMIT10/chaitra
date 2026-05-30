/** L1 distance between two probability vectors */
export function l1Distance(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + Math.abs(v - (b[i] ?? 0)), 0);
}

/** Uniform distribution over n nodes */
export function uniformRank(n: number): number[] {
  if (n <= 0) return [];
  const u = 1 / n;
  return Array(n).fill(u);
}

/** Index of maximum rank (ties: lowest index) */
export function topNodeIndex(ranks: number[]): number {
  let best = 0;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] > ranks[best]) best = i;
  }
  return best;
}

/** Teleport mass per node: (1 - d) / N */
export function teleportMassPerNode(n: number, damping: number): number {
  return n > 0 ? (1 - damping) / n : 0;
}

/** Heuristic iterations for ~1e-4 L1 delta on small graphs */
export function suggestedIterations(n: number, damping: number): number {
  const base = Math.ceil(8 + 4 * Math.log2(Math.max(n, 2)));
  return Math.min(40, Math.max(5, Math.round(base * (0.5 + damping * 0.5))));
}

export function formatRank(value: number): string {
  return value.toFixed(4);
}
