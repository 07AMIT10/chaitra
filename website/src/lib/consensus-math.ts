/**
 * Consensus formulas (CONSENSUS_SYSTEMS/README.md — quorum, CFT, BFT bounds).
 */

/** Strict majority quorum: Q = ⌊N/2⌋ + 1 */
export function raftQuorum(n: number): number {
  return Math.floor(n / 2) + 1;
}

/** Max crash failures tolerated with majority quorums: f = ⌊(N−1)/2⌋ */
export function maxCrashFailures(n: number): number {
  return Math.floor((n - 1) / 2);
}

/** Minimum cluster size to tolerate f crash faults: N = 2f + 1 */
export function minNodesForCrashFaults(f: number): number {
  return 2 * f + 1;
}

/** Byzantine bound: N ≥ 3f + 1 */
export function minNodesForByzantine(f: number): number {
  return 3 * f + 1;
}

/** Quorum intersection: Q + Q > N */
export function quorumIntersectionHolds(q: number, n: number): boolean {
  return q + q > n;
}

/** AppendEntries RPCs leader sends per replication step (reachable followers only) */
export function appendEntriesMessages(reachableFollowers: number): number {
  return Math.max(0, reachableFollowers);
}

/** ACKs needed including leader vote: quorum size */
export function acksRequired(n: number): number {
  return raftQuorum(n);
}

export function formatQuorum(q: number, n: number): string {
  return `${q}/${n}`;
}

export function formatFaultBound(f: number, n: number): string {
  return `f≤${f} (N=${n}=2f+1)`;
}

export function formatBftBound(f: number, n: number): string {
  return `f≤${f} (N≥${n}=3f+1)`;
}
