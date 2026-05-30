import type { GossipState } from "./gossip-sim";
import { runGossip } from "./gossip-sim";

/** Infected (informed) node count at current state */
export function informedCount(state: GossipState): number {
  return state.nodes.filter(Boolean).length;
}

/** Susceptible (uninformed) node count */
export function susceptibleCount(state: GossipState): number {
  return state.nodes.length - informedCount(state);
}

/**
 * Expected newly infected nodes next tick (push gossip, fanout contacts per infected).
 * P(susceptible j not contacted) ≈ (1 - fanout/N)^I_t
 */
export function expectedNewInfections(n: number, infected: number, fanout: number): number {
  if (n <= 0 || infected <= 0) return 0;
  const susceptible = n - infected;
  if (susceptible <= 0) return 0;
  const pMiss = Math.pow(1 - Math.min(fanout, n) / n, infected);
  return susceptible * (1 - pMiss);
}

/** Heuristic O(log N) rounds bound from README — ceil(log₂ N) scaled by fanout */
export function logConvergenceRoundsEstimate(n: number, fanout: number): number {
  if (n <= 1) return 0;
  const base = Math.max(2, 1 + fanout * 0.5);
  return Math.ceil(Math.log(n) / Math.log(base));
}

/** Deterministic rounds until all nodes informed (same seed as lab sim) */
export function roundsToConvergence(n: number, fanout: number, seed = 42): number {
  const history = runGossip(n, fanout, n * 2, seed);
  const last = history[history.length - 1];
  if (last.informedCount >= n) return last.round;
  return history.length - 1;
}
