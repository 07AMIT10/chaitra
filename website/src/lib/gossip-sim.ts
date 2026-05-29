import type { GossipRound } from "./sketches/types";

export type GossipState = {
  nodes: boolean[];
  round: number;
};

export function initGossip(n: number): GossipState {
  const nodes = Array(n).fill(false);
  nodes[0] = true;
  return { nodes, round: 0 };
}

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Push gossip one round — each informed node contacts fanout random peers */
export function gossipStep(
  state: GossipState,
  fanout: number,
  seed: number
): { state: GossipState; messages: number } {
  const rand = seededRand(seed + state.round);
  const n = state.nodes.length;
  const next = [...state.nodes];
  let messages = 0;
  for (let i = 0; i < n; i++) {
    if (!state.nodes[i]) continue;
    for (let f = 0; f < fanout; f++) {
      const target = Math.floor(rand() * n);
      if (!next[target]) {
        next[target] = true;
      }
      messages++;
    }
  }
  return { state: { nodes: next, round: state.round + 1 }, messages };
}

export function runGossip(
  n: number,
  fanout: number,
  maxRounds: number,
  seed = 42
): GossipRound[] {
  let state = initGossip(n);
  const history: GossipRound[] = [
    { round: 0, informedCount: 1, messagesSent: 0 },
  ];
  for (let r = 0; r < maxRounds; r++) {
    const { state: next, messages } = gossipStep(state, fanout, seed);
    state = next;
    history.push({
      round: state.round,
      informedCount: state.nodes.filter(Boolean).length,
      messagesSent: messages,
    });
    if (state.nodes.every(Boolean)) break;
  }
  return history;
}

export function informedPct(state: GossipState): number {
  return (state.nodes.filter(Boolean).length / state.nodes.length) * 100;
}
