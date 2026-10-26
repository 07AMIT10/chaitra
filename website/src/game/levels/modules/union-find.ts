import type { GameEvent, LevelModule, Move, Status } from "../../types";
import { unionFindMeta } from "../meta/union-find";

type UFState = {
  parent: Record<string, string>;
  size: Record<string, number>;
  labels: number;
  merges: number;
  selected: string | null;
};

const NODES = ["A", "B", "C", "D", "E", "F"] as const;
const BUDGET = 9;
const CLEAN = 5;

function rootOf(state: UFState, id: string): string {
  let current = id;
  while (state.parent[current] !== current) current = state.parent[current];
  return current;
}

function roots(state: UFState): string[] {
  return NODES.filter((id) => state.parent[id] === id);
}

/**
 * Lay out each component as a layered tree: root at the top, its children in a
 * row below, grandchildren below that. Six components fit side by side; a
 * merged component gets its own wider slot. Recomputing per state keeps the
 * final star from drawing long edges through other nodes.
 */
function layout(state: UFState): { pos: Record<string, [number, number]>; height: number } {
  const components = roots(state).map((root) => {
    const members = NODES.filter((id) => rootOf(state, id) === root);
    const children: Record<string, string[]> = {};
    for (const id of members) {
      if (id === root) continue;
      const parent = state.parent[id];
      (children[parent] ??= []).push(id);
    }
    const levels: string[][] = [];
    let frontier = [root];
    while (frontier.length > 0) {
      levels.push(frontier);
      const next: string[] = [];
      for (const id of frontier) next.push(...(children[id] ?? []));
      frontier = next;
    }
    return { levels, width: Math.max(...levels.map((level) => level.length), 1) * 80 };
  });

  const total = components.reduce((sum, comp) => sum + comp.width, 0) + Math.max(0, components.length - 1) * 12;
  let x = (640 - total) / 2;
  let maxDepth = 0;
  const pos: Record<string, [number, number]> = {};

  for (const comp of components) {
    const cx = x + comp.width / 2;
    comp.levels.forEach((level, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      level.forEach((id, i) => {
        pos[id] = [cx - (level.length - 1) * 40 + i * 80, 70 + depth * 100];
      });
    });
    x += comp.width + 12;
  }

  return { pos, height: Math.max(220, 70 + maxDepth * 100 + 60) };
}

function initialState(): UFState {
  return {
    parent: Object.fromEntries(NODES.map((id) => [id, id])),
    size: Object.fromEntries(NODES.map((id) => [id, 1])),
    labels: 0,
    merges: 0,
    selected: null,
  };
}

function statusOf(state: UFState): Status {
  if (roots(state).length === 1) return state.labels <= BUDGET ? "won" : "lost";
  return state.labels > BUDGET ? "lost" : "playing";
}

const level: LevelModule<UFState> = {
  meta: unionFindMeta,
  initial: initialState(),

  moves(state) {
    if (statusOf(state) !== "playing") return [];

    if (state.selected === null) {
      return roots(state).map<Move>((id) => ({
        id: `select:${id}`,
        label: `Select block ${id} (size ${state.size[id]})`,
      }));
    }

    const selected = state.selected;
    return [
      ...roots(state)
        .filter((id) => id !== selected)
        .map<Move>((id) => ({
          id: `merge:${selected}:${id}`,
          label: `Relabel ${selected} (${state.size[selected]} ${state.size[selected] === 1 ? "write" : "writes"}) into ${id}`,
        })),
      { id: "clear", label: "Clear selection" },
    ];
  },

  apply(state, moveId) {
    if (moveId === "clear") {
      return { state: { ...state, selected: null }, events: [] };
    }

    if (moveId.startsWith("select:")) {
      const id = moveId.slice("select:".length);
      if (!NODES.includes(id as (typeof NODES)[number]) || rootOf(state, id) !== id) {
        return {
          state,
          events: [],
          error: `${id} is not a block representative. Only a representative can relabel a block.`,
        };
      }
      const size = state.size[id];
      return {
        state: { ...state, selected: id },
        events: [
          {
            text: `Selected ${id}: size ${size}, so relabelling it costs ${size} write${size === 1 ? "" : "s"}. The cheaper merge moves the smaller block into the larger one.`,
            kind: "info",
          },
        ],
      };
    }

    const [kind, a, b] = moveId.split(":");
    if (kind !== "merge" || !a || !b) {
      return { state, events: [], error: "Unknown move." };
    }
    if (rootOf(state, a) !== a || rootOf(state, b) !== b) {
      return {
        state,
        events: [],
        error: "Only block representatives can merge. Select a representative first.",
      };
    }
    if (a === b) {
      return { state, events: [], error: "A block is already part of itself." };
    }

    const cost = state.size[a];
    const labels = state.labels + cost;
    const events: GameEvent[] = [
      {
        text: `Relabeled ${a} (${cost} write${cost === 1 ? "" : "s"}) into ${b}.`,
        kind: "info",
      },
    ];
    if (labels > BUDGET) {
      events.push({
        text: `Registry budget exceeded: ${labels} of ${BUDGET} writes.`,
        kind: "bad",
      });
    }

    return {
      state: {
        parent: { ...state.parent, [a]: b },
        size: { ...state.size, [b]: state.size[b] + state.size[a] },
        labels,
        merges: state.merges + 1,
        selected: null,
      },
      events,
    };
  },

  view(state) {
    const rootSet = new Set(roots(state));
    const playable = statusOf(state) === "playing";
    const { pos, height } = layout(state);
    return {
      kind: "graph",
      height,
      caption: `Blocks: ${rootSet.size} · Labels written: ${state.labels} / ${BUDGET} · Clean run: ${CLEAN}`,
      nodes: NODES.map((id) => {
        const isRoot = state.parent[id] === id;
        const selected = state.selected === id;
        let moveId: string | undefined;
        let aria = `Compartment ${id}, part of block ${rootOf(state, id)}.`;

        if (playable && isRoot && state.selected === null) {
          moveId = `select:${id}`;
          aria = `Block ${id}, size ${state.size[id]}. Select to relabel it.`;
        } else if (playable && isRoot && selected) {
          moveId = "clear";
          aria = `Selected block ${id}. Clear the selection.`;
        } else if (playable && isRoot && state.selected !== null) {
          moveId = `merge:${state.selected}:${id}`;
          const cost = state.size[state.selected];
          aria = `Relabel ${state.selected} into ${id}; cost ${cost} ${cost === 1 ? "write" : "writes"}.`;
        }

        return {
          id,
          x: pos[id][0],
          y: pos[id][1],
          label: id,
          sub: isRoot ? `size ${state.size[id]}` : `→ ${state.parent[id]}`,
          state: selected ? ("target" as const) : isRoot ? ("active" as const) : ("done" as const),
          moveId,
          aria,
        };
      }),
      edges: NODES.filter((id) => state.parent[id] !== id).map((id) => ({
        id: `${id}-${state.parent[id]}`,
        from: id,
        to: state.parent[id],
        state: "done" as const,
      })),
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") return { stars: 1, detail: "The hull is not sealed." };
    if (state.labels <= CLEAN) {
      return { stars: 3, detail: `${state.labels} writes: the smaller block every time.` };
    }
    if (state.labels <= 7) {
      return { stars: 2, detail: `${state.labels} writes. A clean run is ${CLEAN}.` };
    }
    return { stars: 1, detail: `${state.labels} writes. Keep the larger registry.` };
  },

  solution: [
    "select:A",
    "merge:A:B",
    "select:C",
    "merge:C:B",
    "select:D",
    "merge:D:B",
    "select:E",
    "merge:E:B",
    "select:F",
    "merge:F:B",
  ],
};

export default level;
