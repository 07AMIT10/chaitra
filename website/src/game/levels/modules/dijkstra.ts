import type { GameEvent, LevelModule, Move, NodeState } from "../../types";
import { dijkstraMeta } from "../meta/dijkstra";

const TOWNS = ["A", "B", "C", "D", "E", "F", "G"] as const;
type Town = (typeof TOWNS)[number];

type Road = { id: string; from: Town; to: Town; w: number };

type DijkstraState = {
  labels: Record<Town, number | null>;
  settled: Town[];
  parent: Record<Town, Town | null>;
};

const ROADS: Road[] = [
  { id: "A>C", from: "A", to: "C", w: 1 },
  { id: "A>F", from: "A", to: "F", w: 6 },
  { id: "A>B", from: "A", to: "B", w: 9 },
  { id: "C>D", from: "C", to: "D", w: 1 },
  { id: "D>E", from: "D", to: "E", w: 1 },
  { id: "D>B", from: "D", to: "B", w: 2 },
  { id: "F>E", from: "F", to: "E", w: 1 },
  { id: "F>B", from: "F", to: "B", w: 4 },
  { id: "E>G", from: "E", to: "G", w: 4 },
  { id: "B>G", from: "B", to: "G", w: 1 },
];

const NODE_POS: Record<Town, [number, number]> = {
  A: [60, 170],
  C: [175, 85],
  D: [295, 85],
  E: [415, 85],
  G: [560, 170],
  B: [390, 240],
  F: [200, 240],
};

function isTown(value: string): value is Town {
  return (TOWNS as readonly string[]).includes(value);
}

function initialState(): DijkstraState {
  return {
    labels: { A: 0, B: 9, C: 1, D: null, E: null, F: 6, G: null },
    settled: ["A"],
    parent: { A: null, B: "A", C: "A", D: null, E: null, F: "A", G: null },
  };
}

function frontier(state: DijkstraState): Town[] {
  return TOWNS.filter(
    (town) => state.labels[town] !== null && !state.settled.includes(town),
  );
}

function leastFrontier(state: DijkstraState): { town: Town; label: number } | null {
  let best: { town: Town; label: number } | null = null;
  for (const town of frontier(state)) {
    const label = state.labels[town] as number;
    if (!best || label < best.label) best = { town, label };
  }
  return best;
}

function isWon(state: DijkstraState): boolean {
  return state.settled.length === TOWNS.length;
}

const level: LevelModule<DijkstraState> = {
  meta: dijkstraMeta,
  initial: initialState(),

  moves(state) {
    if (isWon(state)) return [];
    return frontier(state).map<Move>((town) => ({
      id: `settle:${town}`,
      label: `Settle ${town} at ${state.labels[town]}`,
      placement: "board",
    }));
  },

  apply(state, moveId) {
    if (!moveId.startsWith("settle:")) {
      return { state, events: [], error: "Unknown move." };
    }
    const raw = moveId.slice("settle:".length);
    if (!isTown(raw)) {
      return { state, events: [], error: `${raw} is not a town on this map.` };
    }
    const town = raw;
    const label = state.labels[town];

    if (state.settled.includes(town)) {
      return {
        state,
        events: [],
        error: `${town} is already settled at ${label}; a settled label is final.`,
      };
    }
    if (label === null) {
      return {
        state,
        events: [],
        error: `${town} has no label; no road from the settled set reaches it.`,
      };
    }

    const least = leastFrontier(state);
    if (least && label > least.label) {
      return {
        state,
        events: [],
        error: `${town} holds ${label}; ${least.town} holds ${least.label}. Settling ${town} now would freeze ${label} while a cheaper frontier label is still open.`,
      };
    }

    const settled: Town[] = [...state.settled, town];
    const labels: Record<Town, number | null> = { ...state.labels };
    const parent: Record<Town, Town | null> = { ...state.parent };
    const events: GameEvent[] = [
      { text: `${town} settled at ${label}.`, kind: "info" },
    ];

    for (const road of ROADS) {
      if (road.from !== town) continue;
      if (settled.includes(road.to)) continue;
      const next = label + road.w;
      const current = labels[road.to];
      if (current === null || next < current) {
        labels[road.to] = next;
        parent[road.to] = town;
        events.push({
          text:
            current === null
              ? `Road ${road.from}→${road.to}: ${label} + ${road.w} = ${next}; ${road.to} enters the frontier.`
              : `Road ${road.from}→${road.to}: ${label} + ${road.w} = ${next}; ${road.to} drops from ${current} to ${next}.`,
          kind: "info",
        });
      }
    }

    if (settled.length === TOWNS.length) {
      events.push({
        text: "All seven labels final: A 0, C 1, D 2, E 3, B 4, G 5, F 6.",
        kind: "good",
      });
    }

    return { state: { labels, settled, parent }, events };
  },

  view(state) {
    const least = leastFrontier(state);
    const parentEdges = new Set<string>();
    for (const town of state.settled) {
      const from = state.parent[town];
      if (from) parentEdges.add(`${from}>${town}`);
    }

    const nodes = TOWNS.map((town) => {
      const label = state.labels[town];
      const isSettled = state.settled.includes(town);
      const isFrontier = label !== null && !isSettled;
      const isLeast = isFrontier && least?.town === town;
      const nodeState: NodeState = isSettled
        ? "done"
        : isLeast
          ? "target"
          : isFrontier
            ? "active"
            : "idle";
      const sub =
        label === null
          ? "∞ · unreached"
          : isSettled
            ? `${label} · final`
            : isLeast
              ? `${label} · least`
              : `${label} · waits (min ${least?.label})`;
      const aria = isSettled
        ? `${town}, final distance ${label}.`
        : isLeast
          ? `Settle ${town} at ${label}; it is the least frontier label.`
          : isFrontier
            ? `Frontier ${town} holds ${label}; ${least?.town} holds ${least?.label}, so ${town} is not the least and cannot settle yet.`
            : `${town}, no label yet.`;

      return {
        id: town,
        x: NODE_POS[town][0],
        y: NODE_POS[town][1],
        label: town,
        sub,
        state: nodeState,
        moveId: isFrontier ? `settle:${town}` : undefined,
        aria,
      };
    });

    const edges = ROADS.map((road) => ({
      id: road.id,
      from: road.from,
      to: road.to,
      label: `${road.w}`,
      state: parentEdges.has(road.id)
        ? ("done" as const)
        : state.settled.includes(road.from)
          ? ("ghost" as const)
          : ("idle" as const),
      directed: true,
      aria: `Road ${road.from} to ${road.to}, weight ${road.w}.`,
    }));

    const open = frontier(state)
      .map((town) => `${town} ${state.labels[town]}${least?.town === town ? " (least)" : ""}`)
      .join(", ");
    const last = state.settled[state.settled.length - 1];
    const lastText = last === undefined ? "—" : `${last} at ${state.labels[last]}`;

    return {
      kind: "graph",
      height: 340,
      caption: `Settled: ${state.settled.length} / 7 · Frontier: ${open || "empty"} · Last: ${lastText}`,
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
        detail: `${TOWNS.length - state.settled.length} towns are not settled.`,
      };
    }
    return {
      stars: 3,
      detail:
        "Seven labels: A 0, C 1, D 2, E 3, B 4, G 5, F 6; D's 2 is third, ahead of B's direct 9.",
    };
  },

  solution: [
    "settle:C",
    "settle:D",
    "settle:E",
    "settle:B",
    "settle:G",
    "settle:F",
  ],
};

export default level;
