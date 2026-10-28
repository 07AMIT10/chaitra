import type { GameEvent, LevelModule, Move, NodeState } from "../../types";
import { depthFirstSearchMeta } from "../meta/depth-first-search";

const VERTICES = ["A", "B", "C", "D", "E", "F"] as const;
type Vertex = (typeof VERTICES)[number];

type ArcClass = "tree" | "back" | "cross" | "forward";

type DFSState = {
  d: Record<Vertex, number | null>;
  f: Record<Vertex, number | null>;
  stack: Vertex[];
  clock: number;
  classes: Record<string, ArcClass>;
  backEdges: string[];
};

const ADJACENCY: Record<Vertex, Vertex[]> = {
  A: ["B", "C", "E"],
  B: ["D"],
  C: ["D", "F"],
  D: ["E"],
  E: ["A"],
  F: ["D"],
};

/** Drawing order: A→E before E→A so the back edge paints on top of its twin. */
const VIEW_ARCS: { from: Vertex; to: Vertex }[] = [
  { from: "A", to: "B" },
  { from: "A", to: "C" },
  { from: "A", to: "E" },
  { from: "B", to: "D" },
  { from: "C", to: "D" },
  { from: "C", to: "F" },
  { from: "D", to: "E" },
  { from: "F", to: "D" },
  { from: "E", to: "A" },
];

const NODE_POS: Record<Vertex, [number, number]> = {
  A: [300, 50],
  B: [110, 160],
  C: [560, 160],
  D: [190, 280],
  E: [300, 430],
  F: [560, 320],
};

const MANUAL: Record<Vertex, [number, number]> = {
  A: [1, 12],
  B: [2, 7],
  C: [8, 11],
  D: [3, 6],
  E: [4, 5],
  F: [9, 10],
};

function arcId(from: Vertex, to: Vertex): string {
  return `${from}>${to}`;
}

function isVertex(value: string): value is Vertex {
  return (VERTICES as readonly string[]).includes(value);
}

function initialD(): Record<Vertex, number | null> {
  return { A: 1, B: null, C: null, D: null, E: null, F: null };
}

function initialF(): Record<Vertex, number | null> {
  return { A: null, B: null, C: null, D: null, E: null, F: null };
}

function initialState(): DFSState {
  return {
    d: initialD(),
    f: initialF(),
    stack: ["A"],
    clock: 2,
    classes: {},
    backEdges: [],
  };
}

function stackLabel(stack: Vertex[]): string {
  return stack.length > 0 ? stack.join(" › ") : "empty";
}

function allFinished(state: DFSState): boolean {
  return VERTICES.every((vertex) => state.f[vertex] !== null);
}

function isWon(state: DFSState): boolean {
  return state.stack.length === 0 && allFinished(state) && state.backEdges.includes("E>A");
}

function statusOf(state: DFSState): "playing" | "won" {
  return isWon(state) ? "won" : "playing";
}

function cycleThrough(stack: Vertex[], from: Vertex, to: Vertex): string {
  const index = stack.indexOf(to);
  const path = index >= 0 ? stack.slice(index) : [to];
  return [...path, to].join("→");
}

const level: LevelModule<DFSState> = {
  meta: depthFirstSearchMeta,
  initial: initialState(),

  moves(state) {
    const top = state.stack[state.stack.length - 1];
    const moves: Move[] = [];

    if (top) {
      for (const to of ADJACENCY[top]) {
        if (!state.classes[arcId(top, to)]) {
          moves.push({
            id: `dive:${arcId(top, to)}`,
            label: `Dive ${top}→${to}`,
            placement: "board",
          });
        }
      }
    }

    for (const vertex of state.stack) {
      moves.push({
        id: `return:${vertex}`,
        label: `Return from ${vertex}`,
        placement: "tray",
      });
    }

    return moves;
  },

  apply(state, moveId) {
    if (moveId.startsWith("dive:")) {
      const [fromRaw, toRaw] = moveId.slice("dive:".length).split(">");
      if (!fromRaw || !toRaw || !isVertex(fromRaw) || !isVertex(toRaw)) {
        return { state, events: [], error: "That duct is not on the map." };
      }
      const from = fromRaw;
      const to = toRaw;

      const top = state.stack[state.stack.length - 1];
      if (top !== from) {
        return {
          state,
          events: [],
          error: `The stack top is ${top ?? "empty"}; ${from} is not holding the cursor. Dive only from the top frame.`,
        };
      }
      if (!ADJACENCY[from].includes(to)) {
        return { state, events: [], error: `${from}→${to} is not a duct on this map.` };
      }
      const id = arcId(from, to);
      const known = state.classes[id];
      if (known) {
        return {
          state,
          events: [],
          error: `${from}→${to} is already classified ${known}.`,
        };
      }

      if (state.d[to] === null) {
        const enter = state.clock;
        const stack: Vertex[] = [...state.stack, to];
        return {
          state: {
            ...state,
            d: { ...state.d, [to]: enter },
            stack,
            clock: state.clock + 1,
            classes: { ...state.classes, [id]: "tree" },
          },
          events: [
            {
              text: `${from}→${to} is a tree edge. Enter ${to} at ${enter}; stack ${stackLabel(stack)}.`,
              kind: "info",
            },
          ],
        };
      }

      if (state.f[to] === null) {
        return {
          state: {
            ...state,
            classes: { ...state.classes, [id]: "back" },
            backEdges: [...state.backEdges, id],
          },
          events: [
            {
              text: `${from}→${to} reaches ${to}, still open since ${state.d[to]}. Back edge: the cycle ${cycleThrough(state.stack, from, to)} is certified.`,
              kind: "good",
            },
          ],
        };
      }

      const finishedAt = state.f[to] as number;
      const enteredAt = state.d[from] as number;
      const isForward = (state.d[to] as number) > enteredAt;
      const kind: ArcClass = isForward ? "forward" : "cross";
      return {
        state: {
          ...state,
          classes: { ...state.classes, [id]: kind },
        },
        events: [
          {
            text: isForward
              ? `${from}→${to} reaches ${to}, which opened at ${state.d[to]} and closed at ${finishedAt} inside ${from}'s frame. Forward edge: a finished descendant, not an ancestor.`
              : `${from}→${to} reaches ${to}, which closed at ${finishedAt} before ${from} opened at ${enteredAt}. Cross edge: neither ancestor nor descendant.`,
            kind: "info",
          },
        ],
      };
    }

    if (moveId.startsWith("return:")) {
      const raw = moveId.slice("return:".length);
      if (!isVertex(raw)) {
        return { state, events: [], error: "That frame is not on the stack." };
      }
      const vertex = raw;
      const index = state.stack.indexOf(vertex);
      if (index < 0) {
        return {
          state,
          events: [],
          error: `${vertex} is not open; the stack is ${stackLabel(state.stack)}.`,
        };
      }
      if (index !== state.stack.length - 1) {
        const above = state.stack.slice(index + 1);
        return {
          state,
          events: [],
          error: `${above.join(" and ")} ${above.length === 1 ? "is" : "are"} open above ${vertex}; a return closes the innermost frame first. Closing ${vertex} now would break the parenthesis interval.`,
        };
      }

      const unexamined = ADJACENCY[vertex].filter((to) => !state.classes[arcId(vertex, to)]);
      if (unexamined.length > 0) {
        return {
          state,
          events: [],
          error: `${vertex} still holds ${unexamined.map((to) => `${vertex}→${to}`).join(", ")} unexamined. A frame returns only after its arcs are classified; closing ${vertex} at tick ${state.clock} would leave ${unexamined[0]} unclassified.`,
        };
      }

      const finish = state.clock;
      const stack = state.stack.slice(0, -1);
      return {
        state: {
          ...state,
          f: { ...state.f, [vertex]: finish },
          stack,
          clock: finish + 1,
        },
        events: [
          {
            text: `Return ${vertex} at ${finish}; interval ${state.d[vertex]}–${finish}. Stack ${stackLabel(stack)}.`,
            kind: "info",
          },
        ],
      };
    }

    return { state, events: [], error: "Unknown move." };
  },

  view(state) {
    const top = state.stack[state.stack.length - 1];
    const nodes = VERTICES.map((vertex) => {
      const discovered = state.d[vertex];
      const finished = state.f[vertex];
      let nodeState: NodeState = "idle";
      if (finished !== null) nodeState = "done";
      else if (vertex === top) nodeState = "target";
      else if (discovered !== null) nodeState = "active";

      const sub =
        discovered === null
          ? "unseen"
          : finished === null
            ? `${discovered}–open`
            : `${discovered}–${finished}`;

      const aria =
        finished !== null
          ? `${vertex}, interval ${discovered} to ${finished}.`
          : discovered !== null
            ? `${vertex}, opened at ${discovered}, still on the stack.`
            : `${vertex}, not reached.`;

      return {
        id: vertex,
        x: NODE_POS[vertex][0],
        y: NODE_POS[vertex][1],
        label: vertex,
        sub,
        state: nodeState,
        aria,
      };
    });

    const edges = VIEW_ARCS.map((arc) => {
      const id = arcId(arc.from, arc.to);
      const known = state.classes[id];
      const clickable = known === undefined && top === arc.from;
      const edgeState = known === "tree"
        ? ("done" as const)
        : known === "back"
          ? ("active" as const)
          : known
            ? ("ghost" as const)
            : clickable
              ? ("active" as const)
              : ("idle" as const);

      return {
        id,
        from: arc.from,
        to: arc.to,
        label: known === "back" ? "back" : undefined,
        state: edgeState,
        directed: true,
        moveId: clickable ? `dive:${id}` : undefined,
        aria: clickable
          ? `Dive ${arc.from} to ${arc.to}.`
          : known
            ? `${arc.from} to ${arc.to}, ${known} edge.`
            : `${arc.from} to ${arc.to}, unexamined.`,
      };
    });

    const counts = { tree: 0, back: 0, cross: 0, forward: 0 };
    for (const value of Object.values(state.classes)) counts[value] += 1;
    const topOpen = top
      ? ADJACENCY[top].filter((to) => !state.classes[arcId(top, to)]).length
      : 0;
    const topText = top ? `${top}${topOpen === 0 ? " (return)" : ""}` : "—";

    let caption = `Ticks: ${state.clock - 1} / 12 · Stack: ${stackLabel(state.stack)} · ${top ? `Top: ${topText} · ` : ""}Back edges: ${state.backEdges.length} / 1`;
    if (top === undefined) {
      caption += ` · ${counts.tree} tree / ${counts.back} back / ${counts.cross} cross / ${counts.forward} forward`;
    }

    return {
      kind: "graph",
      height: 480,
      caption,
      nodes,
      edges,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (!isWon(state)) {
      return {
        stars: 1,
        detail: allFinished(state)
          ? "Every frame is closed, but the back edge E→A was not recorded."
          : `The traversal is not closed; the stack holds ${stackLabel(state.stack)}.`,
      };
    }

    const deviations = VERTICES.filter(
      (vertex) =>
        state.d[vertex] !== MANUAL[vertex][0] || state.f[vertex] !== MANUAL[vertex][1],
    ).length;

    if (deviations === 0) {
      return {
        stars: 3,
        detail:
          "12 ticks: A 1–12, B 2–7, D 3–6, E 4–5, C 8–11, F 9–10. One back edge: E→A.",
      };
    }
    return {
      stars: 2,
      detail: `${deviations} interval${deviations === 1 ? "" : "s"} differ from the manual; every frame is closed and the back edge is E→A.`,
    };
  },

  solution: [
    "dive:A>B",
    "dive:B>D",
    "dive:D>E",
    "dive:E>A",
    "return:E",
    "return:D",
    "return:B",
    "dive:A>C",
    "dive:C>D",
    "dive:C>F",
    "dive:F>D",
    "return:F",
    "return:C",
    "dive:A>E",
    "return:A",
  ],
};

export default level;
