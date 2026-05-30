import type { ConsensusMode } from "./raft-gossip-sim";
import {
  raftCommittedCount,
  raftQuorum,
  runGossipOnCluster,
  runRaftReplication,
  snapshotAtRound,
} from "./raft-gossip-sim";

export { raftCommittedCount, raftQuorum };

/** Max Byzantine failures tolerated while still forming quorum */
export function maxFailuresTolerated(n: number): number {
  return Math.floor((n - 1) / 2);
}

/** Leader → all followers AppendEntries + acks per write (O(N) messages) */
export function raftMessagesPerWrite(n: number): number {
  if (n <= 1) return 0;
  return 2 * (n - 1);
}

/** Push gossip messages one epidemic tick (O(fanout × infected)) */
export function gossipMessagesPerTick(infected: number, fanout: number): number {
  return infected * fanout;
}

/** README heuristic: E[time to full spread] ≈ O(log N) */
export function gossipConvergenceRoundsEstimate(n: number, fanout: number): number {
  if (n <= 1) return 0;
  const base = Math.max(2, 1 + fanout * 0.5);
  return Math.ceil(Math.log(n) / Math.log(base));
}

/** Deterministic gossip rounds until 100% informed (shared seed with lab) */
export function gossipRoundsToFullSpread(n: number, fanout: number, seed = 42): number {
  const history = runGossipOnCluster(n, fanout, n * 3, seed);
  const last = history[history.length - 1];
  return last?.round ?? 0;
}

/** Raft rounds until every node has committed the entry (toy sim) */
export function raftRoundsToFullCommit(n: number): number {
  const history = runRaftReplication(n);
  return history[history.length - 1]?.round ?? 0;
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(0)}%`;
}

export function formatMessageComplexity(mode: ConsensusMode, n: number, fanout: number): string {
  if (mode === "raft") {
    return `O(N) ≈ ${raftMessagesPerWrite(n)} msgs/write`;
  }
  return `O(c·I) ≤ ${fanout}×I per tick`;
}

export function clusterProgress(
  mode: ConsensusMode,
  n: number,
  round: number,
  fanout: number,
  seed: number
): { count: number; pct: number; quorumMet: boolean } {
  const snap = snapshotAtRound(mode, n, round, fanout, seed);
  return {
    count: snap.committedOrInformed,
    pct: (snap.committedOrInformed / n) * 100,
    quorumMet: snap.quorumMet,
  };
}
