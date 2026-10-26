import type { GameEvent, LevelModule, Move, NodeState } from "../../types";
import { minimumSpanningTreeMeta } from "../meta/minimum-spanning-tree";

const ISLANDS = ["A", "B", "C", "D", "E", "F"] as const;
type Island = (typeof ISLANDS)[number];

type Bridge = { id: string; from: Island; to: Island; w: number };

type MSTState = {
  welded: string[];
  total: number;
};

const BRIDGES: Bridge[] = [
  { id: "A-D", from: "A", to: "D", w: 1 },
  { id: "A-B", from: "A", to: "B", w: 2 },
  { id: "B-D", from: "B", to: "D", w: 3 },
  { id: "B-E", from: "B", to: "E", w: 1 },
  { id: "D-E", from: "D", to: "E", w: 2 },
  { id: "E-F", from: "E", to: "F", w: 1 },
  { id: "C-F", from: "C", to: "F", w: 1 },
  { id: "E-C", from: "E", to: "C", w: 2 },
];

const NODE_POS: Record<Island, [number, number]> = {
  A: [90, 80],
  B: [320, 80],
  C: [560, 80],
  D: [90, 260],
  E: [320, 260],
  F: [560, 260],
};

const TARGET_TOTAL = 6;
const TARGET_WELDS = 5;

function isIsland(value: string): value is Island {
  return (ISLANDS as readonly string[]).includes(value);
}

function initialState(): MSTState {
  return { welded: [], total: 0 };
}

function treeSet(state: MSTState): Set<Island> {
  const tree = new Set<Island>(["A"]);
  for (const id of state.welded) {
    const bridge = BRIDGES.find((entry) => entry.id === id);
    if (!bridge) continue;
    tree.add(bridge.from);
    tree.add(bridge.to);
  }
  return tree;
}

function cutEdges(state: MSTState): Bridge[] {
  const tree = treeSet(state);
  return BRIDGES.filter((bridge) => {
    if (state.welded.includes(bridge.id)) return false;
    const fromIn = tree.has(bridge.from);
    const toIn = tree.has(bridge.to);
    return fromIn !== toIn;
  });
}

function cheapestWeight(state: MSTState): number | null {
  const cut = cutEdges(state);
  if (cut.length === 0) return null;
  return Math.min(...cut.map((bridge) => bridge.w));
}

function bridgeById(id: string): Bridge | undefined {
  return BRIDGES.find((bridge) => bridge.id === id);
}

function treePath(state: MSTState, from: Island, to: Island): Island[] {
  const adjacency: Record<Island, Island[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
    F: [],
  };
  for (const id of state.welded) {
    const bridge = bridgeById(id);
    if (!bridge) continue;
    adjacency[bridge.from].push(bridge.to);
    adjacency[bridge.to].push(bridge.from);
  }

  const previous: Partial<Record<Island, Island>> = {};
  const seen = new Set<Island>([from]);
  const queue: Island[] = [from];
  while (queue.length > 0) {
    const current = queue.shift() as Island;
    if (current === to) break;
    for (const next of adjacency[current]) {
      if (seen.has(next)) continue;
      seen.add(next);
      previous[next] = current;
      queue.push(next);
    }
  }

  const path: Island[] = [to];
  let cursor = to;
  while (cursor !== from) {
    const prior = previous[cursor];
    if (!prior) return [from, to];
    path.push(prior);
    cursor = prior;
  }
  return path.reverse();
}

function cutLabel(state: MSTState): string {
  const tree = treeSet(state);
  return `{${ISLANDS.filter((island) => tree.has(island)).join(", ")}}`;
}

function isWon(state: MSTState): boolean {
  return treeSet(state).size === ISLANDS.length;
}

const level: LevelModule<MSTState> = {
  meta: minimumSpanningTreeMeta,
  initial: initialState(),

  moves(state) {
    if (isWon(state)) return [];
    return BRIDGES.filter((bridge) => !state.welded.includes(bridge.id)).map<Move>(
      (bridge) => ({
        id: `weld:${bridge.id}`,
        label: `Weld ${bridge.from}–${bridge.to} (${bridge.w})`,
        placement: "board",
      }),
    );
  },

  apply(state, moveId) {
    if (!moveId.startsWith("weld:")) {
      return { state, events: [], error: "Unknown move." };
    }
    const id = moveId.slice("weld:".length);
    const bridge = bridgeById(id);
    if (!bridge) {
      return { state, events: [], error: `${id} is not a bridge on this survey.` };
    }
    if (state.welded.includes(bridge.id)) {
      return {
        state,
        events: [],
        error: `${bridge.from}–${bridge.to} is already welded; the grid totals ${state.total}.`,
      };
    }

    const tree = treeSet(state);
    const fromIn = tree.has(bridge.from);
    const toIn = tree.has(bridge.to);

    if (!fromIn && !toIn) {
      return {
        state,
        events: [],
        error: `Neither ${bridge.from} nor ${bridge.to} is on the growing island; a weld must leave ${cutLabel(state)}.`,
      };
    }

    if (fromIn && toIn) {
      const path = treePath(state, bridge.from, bridge.to);
      return {
        state,
        events: [],
        error: `${bridge.from} and ${bridge.to} are already welded through ${path.join("–")}. A weld ${bridge.from}–${bridge.to} at ${bridge.w} would close a cycle; a spanning tree has no cycle.`,
      };
    }

    const cheapest = cheapestWeight(state);
    if (cheapest !== null && bridge.w > cheapest) {
      const best = cutEdges(state).filter((entry) => entry.w === cheapest);
      const bestText = best
        .map((entry) => `${entry.from}–${entry.to} (${entry.w})`)
        .join(" or ");
      return {
        state,
        events: [],
        error: `Across the cut ${cutLabel(state)}, ${bestText} ${best.length === 1 ? "is" : "are"} the lightest; ${bridge.from}–${bridge.to} weighs ${bridge.w}. The cut property takes the lightest bridge.`,
      };
    }

    const welded = [...state.welded, bridge.id];
    const total = state.total + bridge.w;
    const next = { welded, total };
    const events: GameEvent[] = [
      {
        text: `Weld ${bridge.from}–${bridge.to} (${bridge.w}). Total ${total}; ${treeSet(next).size} islands on the grid.`,
        kind: "info",
      },
    ];
    if (isWon(next)) {
      events.push({
        text: `Five welds, total ${total}. One grid.`,
        kind: "good",
      });
    }

    return { state: next, events };
  },

  view(state) {
    const tree = treeSet(state);
    const cut = cutEdges(state);
    const weldedSet = new Set(state.welded);

    const nodes = ISLANDS.map((island) => {
      const inTree = tree.has(island);
      const nodeState: NodeState = inTree ? "done" : "idle";
      return {
        id: island,
        x: NODE_POS[island][0],
        y: NODE_POS[island][1],
        label: island,
        sub: inTree ? "welded" : "island",
        state: nodeState,
        aria: inTree
          ? `${island}, on the growing island.`
          : `${island}, not yet welded.`,
      };
    });

    const edges = BRIDGES.map((bridge) => {
      const welded = weldedSet.has(bridge.id);
      const fromIn = tree.has(bridge.from);
      const toIn = tree.has(bridge.to);
      const bothIn = fromIn && toIn;
      const edgeState = welded
        ? ("done" as const)
        : bothIn
          ? ("ghost" as const)
          : fromIn !== toIn
            ? ("active" as const)
            : ("idle" as const);

      let aria = `Bridge ${bridge.from} to ${bridge.to}, weight ${bridge.w}.`;
      if (welded) aria += " Already welded.";
      else if (bothIn) aria += " Both islands are welded; this bridge would close a cycle.";
      else if (fromIn !== toIn) aria += " It crosses the cut.";

      return {
        id: bridge.id,
        from: bridge.from,
        to: bridge.to,
        label: bothIn && !welded ? `${bridge.w} cycle` : `${bridge.w}`,
        state: edgeState,
        directed: false,
        moveId: welded || isWon(state) ? undefined : `weld:${bridge.id}`,
        aria,
      };
    });

    const cutText =
      cut.length > 0
        ? cut.map((bridge) => `${bridge.from}–${bridge.to} ${bridge.w}`).join(", ")
        : "none";

    return {
      kind: "graph",
      height: 340,
      caption: isWon(state)
        ? `Welds: ${state.welded.length} / ${TARGET_WELDS} · Total: ${state.total} · One grid`
        : `Welds: ${state.welded.length} / ${TARGET_WELDS} · Total: ${state.total} · Cut: ${cutText}`,
      nodes,
      edges,
    };
  },

  status(state) {
    return isWon(state) ? "won" : "playing";
  },

  score(state) {
    if (!isWon(state)) {
      return {
        stars: 1,
        detail: `${TARGET_WELDS - state.welded.length} welds remain; the grid totals ${state.total}.`,
      };
    }
    if (state.total === TARGET_TOTAL) {
      return {
        stars: 3,
        detail:
          "Five welds, total 6: one of the two minimum grids among the 24 spanning trees.",
      };
    }
    return {
      stars: 2,
      detail: `Five welds, total ${state.total}; the minimum is ${TARGET_TOTAL}.`,
    };
  },

  solution: [
    "weld:A-D",
    "weld:A-B",
    "weld:B-E",
    "weld:E-F",
    "weld:C-F",
  ],
};

export default level;
