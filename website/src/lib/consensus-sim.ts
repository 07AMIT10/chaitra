import { acksRequired, raftQuorum } from "./consensus-math";

export type LogCell = "empty" | "pending" | "committed";

export type NodeStatus =
  | "leader"
  | "follower"
  | "replicating"
  | "committed"
  | "isolated"
  | "stale";

export type PartitionConfig =
  | { mode: "none" }
  | { mode: "split"; splitIndex: number };

export type ConsensusConfig = {
  n: number;
  partition: PartitionConfig;
};

export type ConsensusNode = {
  id: number;
  status: NodeStatus;
  log: LogCell[];
  reachable: boolean;
  onMajoritySide: boolean;
};

export type ConsensusSnapshot = {
  round: number;
  nodes: ConsensusNode[];
  n: number;
  quorum: number;
  committedIndex: number;
  lastAppendIndex: number;
  acksThisStep: number;
  quorumMet: boolean;
  majoritySideSize: number;
  partitionLabel: string;
  messagesThisStep: number;
  canCommitOnMajority: boolean;
};

export type ConsensusState = {
  nodes: ConsensusNode[];
  round: number;
  committedIndex: number;
  config: ConsensusConfig;
};

export const ZOOKEEPER_PRESET: ConsensusConfig = { n: 5, partition: { mode: "none" } };

/** Majority {0,1,2} commits; minority {3,4} falls behind (classic partition). */
export const PARTITION_MAJORITY_PRESET: ConsensusConfig = {
  n: 5,
  partition: { mode: "split", splitIndex: 3 },
};

/** Majority side has only 2 nodes — below quorum 3; replication stalls. */
export const PARTITION_NO_QUORUM_PRESET: ConsensusConfig = {
  n: 5,
  partition: { mode: "split", splitIndex: 2 },
};

function majoritySideSize(config: ConsensusConfig): number {
  if (config.partition.mode === "none") return config.n;
  return config.partition.splitIndex;
}

function isOnMajoritySide(id: number, config: ConsensusConfig): boolean {
  if (config.partition.mode === "none") return true;
  return id < config.partition.splitIndex;
}

function isReachable(id: number, config: ConsensusConfig): boolean {
  if (id === 0) return true;
  return isOnMajoritySide(id, config);
}

export function partitionLabel(config: ConsensusConfig): string {
  if (config.partition.mode === "none") return "Full mesh";
  const maj = config.partition.splitIndex;
  return `Split: A=[0..${maj - 1}] · B=[${maj}..${config.n - 1}]`;
}

export function initConsensus(config: ConsensusConfig): ConsensusState {
  const nodes: ConsensusNode[] = Array.from({ length: config.n }, (_, id) => ({
    id,
    status: id === 0 ? "leader" : "follower",
    log: [],
    reachable: isReachable(id, config),
    onMajoritySide: isOnMajoritySide(id, config),
  }));
  return { nodes, round: 0, committedIndex: 0, config };
}

function countAcksForIndex(nodes: ConsensusNode[], index: number): number {
  let acks = 0;
  for (const node of nodes) {
    if (!node.reachable) continue;
    const cell = node.log[index];
    if (cell === "pending" || cell === "committed") acks++;
  }
  return acks;
}

function commitThrough(nodes: ConsensusNode[], through: number): void {
  for (const node of nodes) {
    while (node.log.length <= through) node.log.push("empty");
    for (let i = 0; i <= through; i++) {
      if (node.log[i] === "pending") node.log[i] = "committed";
    }
  }
}

/** One client write: leader append → AppendEntries → quorum commit. */
export function consensusStep(state: ConsensusState): {
  state: ConsensusState;
  messages: number;
  acks: number;
  quorumMet: boolean;
} {
  const { config } = state;
  const n = config.n;
  const q = raftQuorum(n);
  const nextIndex = state.round;
  const nodes = state.nodes.map((node) => ({
    ...node,
    log: [...node.log],
    reachable: isReachable(node.id, config),
    onMajoritySide: isOnMajoritySide(node.id, config),
  }));

  let messages = 0;

  const leader = nodes[0];
  while (leader.log.length <= nextIndex) leader.log.push("empty");
  leader.log[nextIndex] = "pending";
  leader.status = "leader";

  for (let i = 1; i < n; i++) {
    const follower = nodes[i];
    if (!follower.reachable) {
      follower.status = follower.onMajoritySide ? "isolated" : "stale";
      continue;
    }
    while (follower.log.length <= nextIndex) follower.log.push("empty");
    follower.log[nextIndex] = "pending";
    follower.status = "replicating";
    messages += 1;
  }

  const acks = countAcksForIndex(nodes, nextIndex);
  const quorumMet = acks >= q;
  if (quorumMet) {
    commitThrough(nodes, nextIndex);
    for (const node of nodes) {
      if (node.log[nextIndex] === "committed") {
        node.status = node.id === 0 ? "leader" : "committed";
      }
    }
  } else {
    for (const node of nodes) {
      if (node.log[nextIndex] === "pending") {
        node.status = node.id === 0 ? "leader" : "replicating";
      }
    }
  }

  const committedIndex = quorumMet ? nextIndex + 1 : state.committedIndex;

  return {
    state: {
      nodes,
      round: state.round + 1,
      committedIndex,
      config,
    },
    messages,
    acks,
    quorumMet,
  };
}

export function snapshotAtRound(config: ConsensusConfig, round: number): ConsensusSnapshot {
  let state = initConsensus(config);
  let messages = 0;
  let acks = 0;
  let quorumMet = false;

  for (let r = 0; r < round; r++) {
    const step = consensusStep(state);
    state = step.state;
    messages = step.messages;
    acks = step.acks;
    quorumMet = step.quorumMet;
  }

  const maj = majoritySideSize(config);
  const q = raftQuorum(config.n);

  return {
    round: state.round,
    nodes: state.nodes,
    n: config.n,
    quorum: q,
    committedIndex: state.committedIndex,
    lastAppendIndex: Math.max(0, state.round - 1),
    acksThisStep: acks,
    quorumMet,
    majoritySideSize: maj,
    partitionLabel: partitionLabel(config),
    messagesThisStep: messages,
    canCommitOnMajority: maj >= q,
  };
}

export function runReplicationToCommit(
  config: ConsensusConfig,
  targetEntries: number
): ConsensusSnapshot[] {
  let state = initConsensus(config);
  const history: ConsensusSnapshot[] = [snapshotAtRound(config, 0)];

  for (let e = 0; e < targetEntries; e++) {
    const step = consensusStep(state);
    state = step.state;
    history.push(snapshotAtRound(config, state.round));
    if (state.committedIndex > e) continue;
    if (!step.quorumMet && e > 0) break;
  }
  return history;
}

/** Rounds until first successful commit (0 if impossible on majority side). */
export function roundsToFirstCommit(config: ConsensusConfig, maxRounds = 12): number {
  const maj = majoritySideSize(config);
  if (maj < raftQuorum(config.n)) return -1;
  let state = initConsensus(config);
  for (let r = 0; r < maxRounds; r++) {
    const step = consensusStep(state);
    state = step.state;
    if (step.quorumMet) return r + 1;
  }
  return maxRounds + 1;
}

export { acksRequired, raftQuorum };
