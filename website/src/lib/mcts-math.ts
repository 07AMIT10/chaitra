/**
 * UCT / MCTS formulas (MONTE_CARLO_TREE_SEARCH/README.md).
 * UCT = W_i/N_i + c * sqrt(ln(N) / N_i)
 */

export const DEFAULT_EXPLORATION = Math.SQRT2;

/** Win rate + exploration bonus; unvisited children → ∞. */
export function uctScore(
  wins: number,
  visits: number,
  parentVisits: number,
  exploration: number
): number {
  if (visits === 0) return Infinity;
  const exploit = wins / visits;
  const explore =
    exploration * Math.sqrt(Math.log(Math.max(parentVisits, 1)) / visits);
  return exploit + explore;
}

export function winRate(wins: number, visits: number): number {
  if (visits === 0) return 0;
  return wins / visits;
}

export function formatMcts(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}
