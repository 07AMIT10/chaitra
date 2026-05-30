import { gossipStep, initGossip, type GossipState } from "./gossip-sim";

export type ConsensusMode = "raft" | "gossip";

export type RaftNodeStatus = "follower" | "leader" | "replicating" | "committed";

export type RaftState = {
  nodes: RaftNodeStatus[];
  round: number;
};

export type RaftSnapshot = {
  round: number;
  committedCount: number;
  quorumMet: boolean;
  messagesThisStep: number;
};

export type GossipSnapshot = {
  round: number;
  informedCount: number;
  messagesThisStep: number;
};

export type ClusterSnapshot = {
  mode: ConsensusMode;
  round: number;
  n: number;
  committedOrInformed: number;
  quorumMet: boolean;
  messagesThisStep: number;
  raftNodes?: RaftNodeStatus[];
  gossipNodes?: boolean[];
};

const DEFAULT_SEED = 42;

export function raftQuorum(n: number): number {
  return Math.floor(n / 2) + 1;
}

export function initRaft(n: number): RaftState {
  const nodes: RaftNodeStatus[] = Array(n).fill("follower");
  nodes[0] = "leader";
  return { nodes, round: 0 };
}

export function raftCommittedCount(state: RaftState): number {
  return state.nodes.filter((s) => s === "committed").length;
}

/** One lab step: client write → AppendEntries → quorum commit → follower catch-up */
export function raftStep(state: RaftState, n: number): { state: RaftState; messages: number } {
  const next = [...state.nodes];
  let messages = 0;

  if (state.round === 0) {
    next[0] = "leader";
    for (let i = 1; i < n; i++) {
      next[i] = "replicating";
      messages += 1;
    }
    return { state: { nodes: next, round: 1 }, messages };
  }

  if (state.round === 1) {
    next[0] = "committed";
    for (let i = 1; i < n; i++) {
      if (next[i] === "replicating") {
        next[i] = "committed";
        messages += 1;
      }
    }
    return { state: { nodes: next, round: 2 }, messages };
  }

  for (let i = 0; i < n; i++) {
    if (next[i] !== "committed") {
      next[i] = "committed";
      messages += 1;
    }
  }
  return { state: { nodes: next, round: state.round + 1 }, messages };
}

function countRaftInformed(state: RaftState): number {
  return state.nodes.filter((s) => s === "committed" || s === "leader").length;
}

export function runRaftReplication(n: number): RaftSnapshot[] {
  let state = initRaft(n);
  const q = raftQuorum(n);
  const history: RaftSnapshot[] = [];
  for (let step = 0; step <= n + 2; step++) {
    const informed = countRaftInformed(state);
    const committed = raftCommittedCount(state);
    history.push({
      round: state.round,
      committedCount: Math.max(informed, committed),
      quorumMet: committed >= q || (state.round >= 2 && informed >= q),
      messagesThisStep: 0,
    });
    if (state.nodes.every((s) => s === "committed")) break;
    const { state: next, messages } = raftStep(state, n);
    history[history.length - 1].messagesThisStep = messages;
    state = next;
  }
  return history;
}

export function runGossipOnCluster(
  n: number,
  fanout: number,
  maxRounds: number,
  seed = DEFAULT_SEED
): GossipSnapshot[] {
  let state = initGossip(n);
  const history: GossipSnapshot[] = [
    { round: 0, informedCount: 1, messagesThisStep: 0 },
  ];
  for (let r = 0; r < maxRounds; r++) {
    const { state: next, messages } = gossipStep(state, fanout, seed);
    state = next;
    const informedCount = state.nodes.filter(Boolean).length;
    history.push({
      round: state.round,
      informedCount,
      messagesThisStep: messages,
    });
    if (informedCount >= n) break;
  }
  return history;
}

export function snapshotAtRound(
  mode: ConsensusMode,
  n: number,
  round: number,
  fanout = 3,
  seed = DEFAULT_SEED
): ClusterSnapshot {
  if (mode === "raft") {
    let state = initRaft(n);
    let messages = 0;
    for (let r = 0; r < round; r++) {
      const step = raftStep(state, n);
      state = step.state;
      messages = step.messages;
    }
    const committed = raftCommittedCount(state);
    const informed = countRaftInformed(state);
    const q = raftQuorum(n);
    return {
      mode,
      round: state.round,
      n,
      committedOrInformed: Math.max(informed, committed),
      quorumMet: committed >= q,
      messagesThisStep: messages,
      raftNodes: state.nodes,
    };
  }

  let gossip: GossipState = initGossip(n);
  let messages = 0;
  for (let r = 0; r < round; r++) {
    const step = gossipStep(gossip, fanout, seed);
    gossip = step.state;
    messages = step.messages;
  }
  const informed = gossip.nodes.filter(Boolean).length;
  return {
    mode,
    round: gossip.round,
    n,
    committedOrInformed: informed,
    quorumMet: informed >= n,
    messagesThisStep: messages,
    gossipNodes: gossip.nodes,
  };
}

export const ETCD_PRESET = { n: 5, mode: "raft" as const, fanout: 2 };
export const CASSANDRA_PRESET = { n: 25, mode: "gossip" as const, fanout: 3 };
export const RAFT_BOTTLENECK_PRESET = { n: 15, mode: "raft" as const, fanout: 2 };
