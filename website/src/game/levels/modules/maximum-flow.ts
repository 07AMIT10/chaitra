import type { GameEvent, LevelModule, Move } from "../../types";
import { maximumFlowMeta } from "../meta/maximum-flow";

type Pipe = { id: string; from: string; to: string; cap: number };
type PathEdge = { id: string; from: string; to: string; cap: number; dir: 1 | -1 };

type FlowState = {
  flow: Record<string, number>;
  path: PathEdge[];
  lastPath: PathEdge[];
  augmentations: number;
  value: number;
  certified: boolean;
};

const SOURCE = "s";
const SINK = "t";
const TARGET = 7;
const BEST_TRIVIAL_CUT = 8;

const PIPES: Pipe[] = [
  { id: "s-a", from: "s", to: "a", cap: 2 },
  { id: "s-b", from: "s", to: "b", cap: 6 },
  { id: "a-b", from: "a", to: "b", cap: 2 },
  { id: "a-c", from: "a", to: "c", cap: 3 },
  { id: "b-c", from: "b", to: "c", cap: 2 },
  { id: "c-t", from: "c", to: "t", cap: 7 },
  { id: "b-t", from: "b", to: "t", cap: 3 },
];

const NODES = ["s", "a", "b", "c", "t"] as const;

function initialState(): FlowState {
  const flow: Record<string, number> = {};
  for (const pipe of PIPES) flow[pipe.id] = 0;
  return { flow, path: [], lastPath: [], augmentations: 0, value: 0, certified: false };
}

function pipeOf(id: string): Pipe | undefined {
  return PIPES.find((pipe) => pipe.id === id);
}

/**
 * One residual direction per pipe. Forward while the pipe has spare capacity;
 * once it is full, the cancellation direction carries the flow it can undo.
 * The hidden reverse directions (a→s, c→b, t→b, c→a) never lie on a simple
 * s→t path in this network, so the board shows the direction that can be used.
 */
function residualOf(state: FlowState, pipe: Pipe): PathEdge {
  const flow = state.flow[pipe.id];
  if (flow < pipe.cap) {
    return { id: pipe.id, from: pipe.from, to: pipe.to, cap: pipe.cap - flow, dir: 1 };
  }
  return { id: pipe.id, from: pipe.to, to: pipe.from, cap: flow, dir: -1 };
}

function residuals(state: FlowState): PathEdge[] {
  return PIPES.map((pipe) => residualOf(state, pipe));
}

function currentOf(state: FlowState): string {
  return state.path.length === 0 ? SOURCE : state.path[state.path.length - 1].to;
}

function pathNodes(edges: PathEdge[]): string[] {
  return [SOURCE, ...edges.map((edge) => edge.to)];
}

function pathText(edges: PathEdge[]): string {
  return pathNodes(edges).join("→");
}

function residualPath(state: FlowState): PathEdge[] | null {
  const adjacency = new Map<string, PathEdge[]>();
  for (const node of NODES) adjacency.set(node, []);
  for (const edge of residuals(state)) adjacency.get(edge.from)?.push(edge);

  const previous = new Map<string, PathEdge>();
  const seen = new Set<string>([SOURCE]);
  const queue = [SOURCE];

  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head];
    if (node === SINK) break;
    for (const edge of adjacency.get(node) ?? []) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        previous.set(edge.to, edge);
        queue.push(edge.to);
      }
    }
  }

  if (!seen.has(SINK)) return null;
  const path: PathEdge[] = [];
  let node = SINK;
  while (node !== SOURCE) {
    const edge = previous.get(node);
    if (!edge) return null;
    path.push(edge);
    node = edge.from;
  }
  return path.reverse();
}

function reachableFromSource(state: FlowState): Set<string> {
  const adjacency = new Map<string, PathEdge[]>();
  for (const node of NODES) adjacency.set(node, []);
  for (const edge of residuals(state)) adjacency.get(edge.from)?.push(edge);

  const seen = new Set<string>([SOURCE]);
  const queue = [SOURCE];
  for (let head = 0; head < queue.length; head += 1) {
    for (const edge of adjacency.get(queue[head]) ?? []) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return seen;
}

function cutOf(state: FlowState): { reachable: Set<string>; cut: Pipe[]; cap: number } {
  const reachable = reachableFromSource(state);
  const cut = PIPES.filter((pipe) => reachable.has(pipe.from) && !reachable.has(pipe.to));
  return { reachable, cut, cap: cut.reduce((sum, pipe) => sum + pipe.cap, 0) };
}

function statusOf(state: FlowState): "playing" | "won" {
  return state.certified && state.value === TARGET ? "won" : "playing";
}

const level: LevelModule<FlowState> = {
  meta: maximumFlowMeta,
  initial: initialState(),

  moves(state) {
    if (state.certified) return [];

    const moves: Move[] = residuals(state).map((edge) => ({
      id: `step:${edge.id}`,
      label: `Trace ${edge.from}→${edge.to}`,
    }));
    if (state.path.length > 0) {
      moves.push({ id: "clear", label: "Clear trace", placement: "tray" });
    }
    moves.push({ id: "certify", label: "Certify the cut", placement: "tray" });
    return moves;
  },

  apply(state, moveId) {
    if (moveId === "clear") {
      return { state: { ...state, path: [] }, events: [] };
    }

    if (moveId === "certify") {
      if (state.value !== TARGET) {
        const path = residualPath(state);
        if (path === null) {
          return {
            state,
            events: [],
            error: `Flow ${state.value}. No residual s→t path is displayed; the flow is ${
              TARGET - state.value
            } below 7. The cut is not tight.`,
          };
        }
        const bottleneck = Math.min(...path.map((edge) => edge.cap));
        return {
          state,
          events: [],
          error: `Flow ${state.value}. A residual s→t path still carries ${bottleneck}. The best cut found is ${BEST_TRIVIAL_CUT}, gap ${
            BEST_TRIVIAL_CUT - state.value
          }; the interior cut {s,b} is 7. The cut is not tight.`,
        };
      }

      const path = residualPath(state);
      if (path !== null) {
        return {
          state,
          events: [],
          error: `Flow 7 but residual path ${pathText(path)} still carries ${Math.min(
            ...path.map((edge) => edge.cap),
          )}; the flow is not maximum.`,
        };
      }

      const { reachable, cut, cap } = cutOf(state);
      if (cap !== TARGET) {
        return {
          state,
          events: [],
          error: `Flow 7 but the reachable cut has capacity ${cap}; the certificate does not close.`,
        };
      }

      return {
        state: { ...state, certified: true, path: [] },
        events: [
          {
            text: `Certified: flow 7, gap 0. Reachable set {${[...reachable].join(
              ",",
            )}}; cut ${cut
              .map((pipe) => `${pipe.from}→${pipe.to} (${pipe.cap})`)
              .join(" + ")} = ${cap}.`,
            kind: "good",
          },
        ],
      };
    }

    if (!moveId.startsWith("step:")) {
      return { state, events: [], error: "Unknown move." };
    }

    const pipe = pipeOf(moveId.slice("step:".length));
    if (!pipe) return { state, events: [], error: "That pipe is not in the network." };

    const edge = residualOf(state, pipe);
    const current = currentOf(state);
    if (edge.from !== current) {
      const leaving = residuals(state).filter((entry) => entry.from === current);
      return {
        state,
        events: [],
        error: `The trace is at ${current}; pipe ${edge.from}→${edge.to} starts at ${edge.from}. From ${current}: ${
          leaving.length === 0
            ? "no residual pipe leaves"
            : leaving.map((entry) => `${entry.from}→${entry.to} (${entry.cap})`).join(", ")
        }.`,
      };
    }

    const visited = new Set(pathNodes(state.path));
    if (visited.has(edge.to)) {
      return {
        state,
        events: [],
        error: `The trace already visited ${edge.to}; a residual s→t path does not repeat a junction.`,
      };
    }

    const nextPath = [...state.path, edge];

    if (edge.to === SINK) {
      const bottleneck = Math.min(...nextPath.map((entry) => entry.cap));
      const flow = { ...state.flow };
      for (const entry of nextPath) flow[entry.id] += entry.dir * bottleneck;
      const value = state.value + bottleneck;
      const nextState: FlowState = {
        ...state,
        flow,
        path: [],
        lastPath: nextPath,
        augmentations: state.augmentations + 1,
        value,
      };
      const events: GameEvent[] = [
        {
          text: `Augmented ${pathText(nextPath)} by ${bottleneck}. Flow ${value} / ${TARGET}.`,
          kind: "good",
        },
      ];

      if (value === TARGET) {
        const { reachable, cut, cap } = cutOf(nextState);
        events.push({
          text: `No residual s→t path remains. Reachable set {${[...reachable].join(
            ",",
          )}}; cut ${cut.map((entry) => `${entry.from}→${entry.to} (${entry.cap})`).join(" + ")} = ${cap}. Certify the cut.`,
          kind: "good",
        });
      } else {
        events.push({
          text: `Best cut ${BEST_TRIVIAL_CUT}, gap ${BEST_TRIVIAL_CUT - value}.`,
          kind: "info",
        });
      }

      return { state: nextState, events };
    }

    const nextState: FlowState = { ...state, path: nextPath };
    const leaving = residuals(nextState).filter((entry) => entry.from === edge.to);
    return {
      state: nextState,
      events: [
        {
          text:
            leaving.length === 0
              ? `Trace at ${edge.to}; no residual pipe leaves. Clear the trace or undo.`
              : `Trace at ${edge.to}. Residual pipes: ${leaving
                  .map((entry) => `${entry.from}→${entry.to} (${entry.cap})`)
                  .join(", ")}.`,
          kind: "info",
        },
      ],
    };
  },

  view(state) {
    const positions: Record<string, [number, number]> = {
      s: [60, 160],
      a: [220, 70],
      b: [220, 250],
      c: [420, 160],
      t: [590, 160],
    };
    const current = currentOf(state);
    const inPath = new Set(pathNodes(state.path));
    const inLast = new Set(pathNodes(state.lastPath));
    const bestCut = state.value === TARGET ? TARGET : BEST_TRIVIAL_CUT;
    const gap = bestCut - state.value;
    const cut = state.certified ? cutOf(state) : null;

    return {
      kind: "graph",
      height: 340,
      nodes: NODES.map((id) => {
        let nodeState: "target" | "done" | "idle" = "idle";
        if (id === current) nodeState = "target";
        else if (inPath.has(id) || inLast.has(id)) nodeState = "done";
        return {
          id,
          x: positions[id][0],
          y: positions[id][1],
          label: id,
          state: nodeState,
        };
      }),
      edges: PIPES.map((pipe) => {
        const edge = residualOf(state, pipe);
        return {
          id: pipe.id,
          from: edge.from,
          to: edge.to,
          label: edge.dir === 1 ? String(edge.cap) : `↩${edge.cap}`,
          directed: true,
          state: (state.path.some((entry) => entry.id === pipe.id)
            ? "active"
            : state.lastPath.some((entry) => entry.id === pipe.id)
              ? "done"
              : "idle") as "active" | "done" | "idle",
          moveId: state.certified ? undefined : `step:${pipe.id}`,
          aria: `Pipe ${edge.from} to ${edge.to}, residual ${edge.cap}${
            edge.dir === -1 ? " by cancellation" : ""
          }; flow ${state.flow[pipe.id]} of ${pipe.cap}.`,
        };
      }),
      caption: state.certified && cut
        ? `Flow ${state.value} / ${TARGET} · Best cut ${bestCut} · Gap ${gap} · Cut {${[
            ...cut.reachable,
          ].join(",")}} = ${cut.cap} · ${state.augmentations} augmentations`
        : `Flow ${state.value} / ${TARGET} · Best cut ${bestCut} · Gap ${gap} · Trace at ${current} · ${
            state.augmentations
          } augmentation${state.augmentations === 1 ? "" : "s"}`,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") return { stars: 1, detail: "The cut is not certified." };
    if (state.augmentations <= 3) {
      return {
        stars: 3,
        detail: "Three augmentations. Cut {s,b} = 2 + 2 + 3 = 7; gap 0.",
      };
    }
    if (state.augmentations === 4) {
      return { stars: 2, detail: "Four augmentations; the clean run takes three." };
    }
    return {
      stars: 1,
      detail: `${state.augmentations} augmentations; the clean run takes three.`,
    };
  },

  solution: [
    "step:s-a",
    "step:a-b",
    "step:b-c",
    "step:c-t",
    "step:s-b",
    "step:b-t",
    "step:s-b",
    "step:a-b",
    "step:a-c",
    "step:c-t",
    "certify",
  ],
};

export default level;
