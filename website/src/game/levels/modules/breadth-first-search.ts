import type {
  EdgeState,
  GameEvent,
  GraphView,
  LevelModule,
  Move,
  NodeState,
  Status,
} from "../../types";
import { breadthFirstSearchMeta } from "../meta/breadth-first-search";

type BFSState = {
  levels: Record<string, number | null>;
  parent: Record<string, string | null>;
  queue: string[];
  head: number;
};

const TOWNS = ["S", "A", "B", "C", "D", "E", "F", "G"] as const;
type Town = (typeof TOWNS)[number];

/** The page's undirected graph: two 4-hop perimeter chains and the chords C–D, C–G. */
const EDGES: [Town, Town][] = [
  ["S", "A"],
  ["S", "B"],
  ["A", "C"],
  ["B", "D"],
  ["C", "E"],
  ["D", "F"],
  ["E", "G"],
  ["F", "G"],
  ["C", "D"],
  ["C", "G"],
];

const NEIGHBOURS = Object.fromEntries(
  TOWNS.map((id) => [id, [] as Town[]] as const),
) as Record<Town, Town[]>;
for (const [a, b] of EDGES) {
  NEIGHBOURS[a].push(b);
  NEIGHBOURS[b].push(a);
}

/** BFS distance from S, read from the page: G is 3 hops through the C–G chord. */
const TRUTH: Record<Town, number> = { S: 0, A: 1, B: 1, C: 2, D: 2, E: 3, F: 3, G: 3 };

const POS: Record<Town, [number, number]> = {
  S: [70, 170],
  A: [220, 90],
  B: [220, 250],
  C: [360, 90],
  D: [360, 250],
  E: [480, 90],
  F: [480, 250],
  G: [580, 170],
};

function initialState(): BFSState {
  const levels = Object.fromEntries(TOWNS.map((id) => [id, null])) as Record<
    string,
    number | null
  >;
  levels.S = 0;
  const parent = Object.fromEntries(TOWNS.map((id) => [id, null])) as Record<
    string,
    string | null
  >;
  return { levels, parent, queue: ["S"], head: 0 };
}

function isStamped(state: BFSState, id: string): boolean {
  return state.levels[id] != null;
}

function levelOf(state: BFSState, id: string): number {
  const level = state.levels[id];
  return level == null ? -1 : level;
}

function frontOf(state: BFSState): string | null {
  if (state.head >= state.queue.length) return null;
  return state.queue[state.head];
}

function hasOpenNeighbour(state: BFSState, id: string): boolean {
  return NEIGHBOURS[id as Town].some((next) => !isStamped(state, next));
}

/**
 * A stamp is legal only when the town is an unvisited neighbour of the queue
 * front and the front would fix it at its true BFS level. The second clause
 * matters for the chord: stamping G from E would fix it at 4, not 3.
 */
function isLegalStamp(state: BFSState, id: string): boolean {
  const front = frontOf(state) as Town | null;
  if (!front || isStamped(state, id)) return false;
  const town = id as Town;
  return (
    NEIGHBOURS[front].includes(town) &&
    levelOf(state, front) + 1 === TRUTH[town]
  );
}

/** Pop every stamped town whose neighbours have all been claimed. */
function advanceHead(state: BFSState): number {
  let head = state.head;
  while (head < state.queue.length && !hasOpenNeighbour(state, state.queue[head])) {
    head += 1;
  }
  return head;
}

function stampedCount(state: BFSState): number {
  return TOWNS.filter((id) => isStamped(state, id)).length;
}

function statusOf(state: BFSState): Status {
  if (stampedCount(state) < TOWNS.length) return "playing";
  return state.levels.G === 3 ? "won" : "lost";
}

const level: LevelModule<BFSState> = {
  meta: breadthFirstSearchMeta,
  initial: initialState(),

  moves(state) {
    if (stampedCount(state) === TOWNS.length) return [];
    return TOWNS.filter((id) => !isStamped(state, id)).map<Move>((id) => ({
      id: `stamp:${id}`,
      label: `Stamp ${id}`,
      placement: "board",
    }));
  },

  apply(state, moveId) {
    const [kind, rawId] = moveId.split(":");
    if (kind !== "stamp" || !rawId || !TOWNS.includes(rawId as Town)) {
      return { state, events: [], error: "Unknown move." };
    }
    const town = rawId as Town;

    if (isStamped(state, town)) {
      return {
        state,
        events: [],
        error: `${town} is already stamped at level ${levelOf(state, town)}. First touch fixes the level.`,
      };
    }

    const front = frontOf(state);
    if (front === null) {
      return {
        state,
        events: [],
        error: "The queue is drained. Every reachable town is already stamped.",
      };
    }
    const frontTown = front as Town;
    const frontLevel = levelOf(state, frontTown);
    const least = TRUTH[town];

    if (!NEIGHBOURS[frontTown].includes(town)) {
      const open = NEIGHBOURS[frontTown].filter((next) => !isStamped(state, next));
      const openText =
        open.length === 0
          ? "no unvisited neighbour is left"
          : open.length === 1
            ? `${open[0]} is its only unvisited neighbour`
            : `${open.slice(0, -1).join(", ")} and ${open[open.length - 1]} are its unvisited neighbours`;
      return {
        state,
        events: [],
        error: `${town} sits ${least} hops from S. The queue front is ${frontTown} at level ${frontLevel}; ${openText}.`,
      };
    }

    const proposed = frontLevel + 1;
    if (proposed !== least) {
      return {
        state,
        events: [],
        error: `${town} is ${least} hops from S. The front ${frontTown} is at level ${frontLevel}; stamping now would fix ${town} at ${proposed} and break the level order. Level ${Math.max(0, least - 1)} must be the parent.`,
      };
    }

    const levels = { ...state.levels, [town]: proposed };
    const parent = { ...state.parent, [town]: frontTown };
    const queue = [...state.queue, town];
    const provisional: BFSState = { levels, parent, queue, head: state.head };
    const head = advanceHead(provisional);
    const next: BFSState = { ...provisional, head };

    const events: GameEvent[] = [
      {
        text: `Stamped ${town} at level ${proposed} from ${frontTown} (level ${frontLevel}).`,
        kind: "info",
      },
    ];

    if (town === "G") {
      events.push({
        text: `G reads ${proposed} hops: the chord from ${frontTown} cuts the 4-hop perimeter.`,
        kind: "info",
      });
    }

    if (head !== state.head) {
      const nextFront = head < queue.length ? queue[head] : null;
      events.push({
        text: nextFront
          ? `${frontTown} has no unvisited neighbours; the queue front moves to ${nextFront}.`
          : "The queue is drained.",
        kind: "info",
      });
    }

    if (stampedCount(next) === TOWNS.length) {
      events.push(
        next.levels.G === 3
          ? {
              text: "All eight towns are stamped. G reads 3 hops.",
              kind: "good",
            }
          : {
              text: `All eight towns are stamped, but G reads ${next.levels.G ?? "?"} hops; the level order is not monotone.`,
              kind: "bad",
            },
      );
    }

    return { state: next, events };
  },

  view(state): GraphView {
    const front = frontOf(state) as Town | null;
    const won = stampedCount(state) === TOWNS.length;
    const frontLevel = front ? levelOf(state, front) : -1;
    const legal = TOWNS.filter((id) => isLegalStamp(state, id));

    const nodes: GraphView["nodes"] = TOWNS.map((id) => {
      const level = state.levels[id];
      const isFront = id === front && !won;
      const isLegal = level == null && legal.includes(id);
      const adjacent = front != null && NEIGHBOURS[front].includes(id);
      const queued = state.queue.indexOf(id) > state.head;
      const nodeState: NodeState = isFront
        ? "target"
        : won && id === "G"
          ? "target"
          : level != null
            ? "done"
            : isLegal
              ? "active"
              : "idle";
      const sub =
        level == null
          ? isLegal
            ? `L${frontLevel + 1} · next`
            : `blocked · front ${front ?? "—"}`
          : won
            ? id === "G"
              ? `L${level} · 3 hops`
              : `L${level} · done`
            : isFront
              ? `L${level} · front`
              : queued
                ? `L${level} · queued`
                : `L${level} · done`;

      return {
        id,
        x: POS[id][0],
        y: POS[id][1],
        label: id,
        sub,
        state: nodeState,
        moveId: level == null ? `stamp:${id}` : undefined,
        aria:
          level == null
            ? isLegal
              ? `Town ${id}, unvisited and adjacent to the queue front. Stamp it at level ${frontLevel + 1}.`
              : adjacent
                ? `Town ${id} is adjacent to ${front}, but ${front} is level ${frontLevel}; stamping now would fix ${id} at ${frontLevel + 1} instead of ${TRUTH[id]}.`
                : `Town ${id}, unvisited. The queue front is ${front ?? "—"}; only its unvisited neighbours stamp at the next level.`
            : `Town ${id}, level ${level}${isFront ? ", queue front" : ""}.`,
      };
    });

    const edges: GraphView["edges"] = EDGES.map(([a, b]) => {
      const tree = state.parent[b] === a || state.parent[a] === b;
      const bothStamped = isStamped(state, a) && isStamped(state, b);
      const frontier =
        !won &&
        front != null &&
        ((a === front && legal.includes(b)) || (b === front && legal.includes(a)));
      const edgeState: EdgeState = tree
        ? "done"
        : frontier
          ? "active"
          : bothStamped
            ? "ghost"
            : "idle";
      return {
        id: `${a}-${b}`,
        from: a,
        to: b,
        label: a === "C" && b === "G" ? "chord" : undefined,
        state: edgeState,
        aria:
          a === "C" && b === "G"
            ? "Chord C to G, the 3-hop route."
            : `Edge ${a} to ${b}.`,
      };
    });

    const queueText =
      state.head >= state.queue.length
        ? "drained"
        : state.queue.map((id, i) => (i === state.head ? `[${id}]` : id)).join(" ");
    const gLevel = state.levels.G;

    return {
      kind: "graph",
      height: 340,
      caption: `Queue: ${queueText} · Next: ${legal.join(", ") || "none"} · Stamped ${stampedCount(state)}/8 · G: ${gLevel == null ? "?" : gLevel} hops`,
      nodes,
      edges,
    };
  },

  status: statusOf,

  score(state) {
    const count = stampedCount(state);
    if (statusOf(state) !== "won") {
      return {
        stars: 1,
        detail:
          count === TOWNS.length
            ? "8 towns stamped, but G does not read 3 hops."
            : `${count} of 8 towns stamped; G reads ${state.levels.G == null ? "?" : state.levels.G} hops.`,
      };
    }
    return {
      stars: 3,
      detail: "8 towns stamped. G reads 3 hops: S→A→C→G, against 4 around the perimeter.",
    };
  },

  solution: ["stamp:A", "stamp:B", "stamp:C", "stamp:D", "stamp:E", "stamp:G", "stamp:F"],
};

export default level;
