import { DEFAULT_EXPLORATION, uctScore } from "./mcts-math.ts";

/** Static toy tree: Move A is best; Move C hides a weak C1 leaf (README trap). */
export type GameNodeDef = {
  id: string;
  label: string;
  children?: string[];
  /** Leaf: P(root player wins) on random rollout */
  winProb?: number;
};

export const TOY_TREE: Record<string, GameNodeDef> = {
  root: { id: "root", label: "Root", children: ["A", "B", "C"] },
  A: { id: "A", label: "Move A", winProb: 0.78 },
  B: { id: "B", label: "Move B", winProb: 0.52 },
  C: { id: "C", label: "Move C", children: ["C1"] },
  C1: { id: "C1", label: "Move C1", winProb: 0.12 },
};

export const GROUND_TRUTH_BEST_MOVE = "A";

export type MctsNodeStats = { visits: number; wins: number };

export type MctsTreeState = {
  nodes: Record<string, MctsNodeStats>;
};

export type MctsPhase = "selection" | "expansion" | "simulation" | "backpropagation";

export type MctsIterationTrace = {
  phase: MctsPhase;
  path: string[];
  expandedId: string | null;
  rolloutResult: number | null;
  rootUct: { id: string; label: string; uct: number; visits: number; winRate: number }[];
};

export const EXPLOIT_PRESET = { exploration: 0.4, iterations: 80, seed: 7 };
export const EXPLORE_TRAP_PRESET = { exploration: 2.2, iterations: 25, seed: 1 };
export const MANY_ROLLOUTS_PRESET = {
  exploration: DEFAULT_EXPLORATION,
  iterations: 200,
  seed: 42,
};

function makeRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function createInitialTreeState(): MctsTreeState {
  return { nodes: { root: { visits: 0, wins: 0 } } };
}

function getDef(id: string): GameNodeDef {
  const def = TOY_TREE[id];
  if (!def) throw new Error(`Unknown node ${id}`);
  return def;
}

function isLeafDef(def: GameNodeDef): boolean {
  return def.winProb !== undefined;
}

function childIds(id: string): string[] {
  return getDef(id).children ?? [];
}

function ensureNode(state: MctsTreeState, id: string): MctsNodeStats {
  if (!state.nodes[id]) state.nodes[id] = { visits: 0, wins: 0 };
  return state.nodes[id];
}

function isFullyExpanded(state: MctsTreeState, id: string): boolean {
  const kids = childIds(id);
  if (kids.length === 0) return true;
  return kids.every((k) => state.nodes[k] !== undefined);
}

function selectChild(state: MctsTreeState, parentId: string, exploration: number): string {
  const parent = ensureNode(state, parentId);
  const kids = childIds(parentId);
  let bestId = kids[0];
  let bestScore = -Infinity;
  for (const kid of kids) {
    const stats = state.nodes[kid] ?? { visits: 0, wins: 0 };
    const score = uctScore(stats.wins, stats.visits, parent.visits, exploration);
    if (score > bestScore) {
      bestScore = score;
      bestId = kid;
    }
  }
  return bestId;
}

function unexpandedChildren(state: MctsTreeState, id: string): string[] {
  return childIds(id).filter((k) => state.nodes[k] === undefined);
}

function rolloutFrom(nodeId: string, rand: () => number): number {
  let cur = nodeId;
  for (;;) {
    const def = getDef(cur);
    if (isLeafDef(def)) {
      return rand() < (def.winProb ?? 0) ? 1 : 0;
    }
    const kids = def.children ?? [];
    cur = kids[Math.floor(rand() * kids.length)]!;
  }
}

/** One MCTS iteration; mutates `state`. */
export function runMctsIteration(
  state: MctsTreeState,
  exploration: number,
  rand: () => number
): MctsIterationTrace {
  const path: string[] = ["root"];
  let expandedId: string | null = null;
  let rolloutResult: number | null = null;

  // Selection
  let nodeId = "root";
  while (true) {
    const def = getDef(nodeId);
    if (isLeafDef(def)) break;
    const unexpanded = unexpandedChildren(state, nodeId);
    if (unexpanded.length > 0) break;
    if (!isFullyExpanded(state, nodeId)) break;
    nodeId = selectChild(state, nodeId, exploration);
    path.push(nodeId);
  }

  const leafDef = getDef(nodeId);
  if (isLeafDef(leafDef)) {
    rolloutResult = rolloutFrom(nodeId, rand);
    for (const id of path) {
      const n = ensureNode(state, id);
      n.visits += 1;
      n.wins += rolloutResult;
    }
    return {
      phase: "backpropagation",
      path,
      expandedId: null,
      rolloutResult,
      rootUct: rootUctSnapshot(state, exploration),
    };
  }

  const toExpand = unexpandedChildren(state, nodeId);
  if (toExpand.length > 0) {
    const pick = toExpand[Math.floor(rand() * toExpand.length)]!;
    ensureNode(state, pick);
    expandedId = pick;
    path.push(pick);
    nodeId = pick;
    rolloutResult = rolloutFrom(nodeId, rand);
    for (const id of path) {
      const n = ensureNode(state, id);
      n.visits += 1;
      n.wins += rolloutResult;
    }
    return {
      phase: "expansion",
      path,
      expandedId,
      rolloutResult,
      rootUct: rootUctSnapshot(state, exploration),
    };
  }

  // Fully expanded internal node — select then simulate
  nodeId = selectChild(state, nodeId, exploration);
  path.push(nodeId);
  rolloutResult = rolloutFrom(nodeId, rand);
  for (const id of path) {
    const n = ensureNode(state, id);
    n.visits += 1;
    n.wins += rolloutResult;
  }
  return {
    phase: "simulation",
    path,
    expandedId: null,
    rolloutResult,
    rootUct: rootUctSnapshot(state, exploration),
  };
}

export function rootUctSnapshot(state: MctsTreeState, exploration: number) {
  const parent = state.nodes.root ?? { visits: 0, wins: 0 };
  return childIds("root").map((id) => {
    const stats = state.nodes[id] ?? { visits: 0, wins: 0 };
    return {
      id,
      label: getDef(id).label,
      uct: uctScore(stats.wins, stats.visits, parent.visits, exploration),
      visits: stats.visits,
      winRate: stats.visits > 0 ? stats.wins / stats.visits : 0,
    };
  });
}

export function runMctsBatch(
  iterations: number,
  exploration: number,
  seed: number
): { state: MctsTreeState; last: MctsIterationTrace | null } {
  const state = createInitialTreeState();
  const rand = makeRand(seed);
  let last: MctsIterationTrace | null = null;
  for (let i = 0; i < iterations; i++) {
    last = runMctsIteration(state, exploration, rand);
  }
  return { state, last };
}

/** Most-visited root child (standard play policy). */
export function mctsRecommendation(state: MctsTreeState): string | null {
  const kids = childIds("root");
  let best: string | null = null;
  let bestVisits = -1;
  for (const id of kids) {
    const v = state.nodes[id]?.visits ?? 0;
    if (v > bestVisits) {
      bestVisits = v;
      best = id;
    }
  }
  return bestVisits > 0 ? best : null;
}

export function trueWinProb(nodeId: string): number | null {
  const def = getDef(nodeId);
  return def.winProb ?? null;
}
