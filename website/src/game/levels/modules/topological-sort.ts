import type {
  EdgeState,
  GameEvent,
  GraphView,
  LevelModule,
  Move,
  NodeState,
} from "../../types";
import { topologicalSortMeta } from "../meta/topological-sort";

type TopoState = {
  emitted: string[];
};

const TASKS = ["A", "B", "C", "D", "E", "F"] as const;
type Task = (typeof TASKS)[number];

/** The page's six-task DAG: A→B, A→C, B→D, C→D, C→E, D→F, E→F. */
const EDGES: [Task, Task][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["C", "D"],
  ["C", "E"],
  ["D", "F"],
  ["E", "F"],
];

const PREDECESSORS = Object.fromEntries(
  TASKS.map((id) => [id, [] as Task[]] as const),
) as Record<Task, Task[]>;
const SUCCESSORS = Object.fromEntries(
  TASKS.map((id) => [id, [] as Task[]] as const),
) as Record<Task, Task[]>;
for (const [a, b] of EDGES) {
  SUCCESSORS[a].push(b);
  PREDECESSORS[b].push(a);
}

const POS: Record<Task, [number, number]> = {
  A: [280, 70],
  B: [120, 170],
  C: [440, 170],
  D: [280, 270],
  E: [560, 270],
  F: [420, 360],
};

function initialState(): TopoState {
  return { emitted: [] };
}

function pendingPredecessors(state: TopoState, id: string): string[] {
  return PREDECESSORS[id as Task].filter((pred) => !state.emitted.includes(pred));
}

function inDegree(state: TopoState, id: string): number {
  return pendingPredecessors(state, id).length;
}

function availableTasks(state: TopoState): string[] {
  return TASKS.filter((id) => !state.emitted.includes(id) && inDegree(state, id) === 0);
}

const level: LevelModule<TopoState> = {
  meta: topologicalSortMeta,
  initial: initialState(),

  moves(state) {
    if (state.emitted.length === TASKS.length) return [];
    return TASKS.filter((id) => !state.emitted.includes(id)).map<Move>((id) => ({
      id: `emit:${id}`,
      label: `Emit ${id} (in-degree ${inDegree(state, id)})`,
      placement: "board",
    }));
  },

  apply(state, moveId) {
    const [kind, rawId] = moveId.split(":");
    if (kind !== "emit" || !rawId || !TASKS.includes(rawId as Task)) {
      return { state, events: [], error: "Unknown move." };
    }
    const task = rawId as Task;

    const position = state.emitted.indexOf(task);
    if (position >= 0) {
      return {
        state,
        events: [],
        error: `${task} is already emitted at position ${position + 1}. The sequence cannot run a stage twice.`,
      };
    }

    const waiting = pendingPredecessors(state, task);
    if (waiting.length > 0) {
      const crossing =
        waiting.length === 1
          ? `${waiting[0]}→${task} would point from the waiting set into the emitted set`
          : `${waiting.map((pred) => `${pred}→${task}`).join(" and ")} would point from the waiting set into the emitted set`;
      return {
        state,
        events: [],
        error: `${task} has in-degree ${waiting.length}; ${waiting.join(" and ")} ${waiting.length === 1 ? "is" : "are"} unemitted. ${crossing}.`,
      };
    }

    const emitted = [...state.emitted, task];
    const next: TopoState = { emitted };
    const newlyFree = SUCCESSORS[task].filter(
      (succ) => !emitted.includes(succ) && inDegree(next, succ) === 0,
    );

    const events: GameEvent[] = [
      { text: `Emitted ${task} at position ${emitted.length}.`, kind: "info" },
    ];

    if (newlyFree.length > 0) {
      events.push({
        text: `${newlyFree.join(" and ")} ${newlyFree.length === 1 ? "drops" : "drop"} to in-degree 0.`,
        kind: "info",
      });
    } else {
      const stillBlocked = SUCCESSORS[task].filter((succ) => !emitted.includes(succ));
      if (stillBlocked.length > 0) {
        const blockers = stillBlocked.map(
          (succ) => `${succ} waits on ${pendingPredecessors(next, succ).join(" and ")}`,
        );
        events.push({ text: `${blockers.join("; ")}.`, kind: "info" });
      }
    }

    if (emitted.length === TASKS.length) {
      events.push({
        text: `All six tasks emitted: ${emitted.join(" ")}. The sequence is one of the five linear extensions.`,
        kind: "good",
      });
    }

    return { state: next, events };
  },

  view(state): GraphView {
    const available = availableTasks(state);

    const nodes: GraphView["nodes"] = TASKS.map((id) => {
      const position = state.emitted.indexOf(id);
      const emitted = position >= 0;
      const indeg = inDegree(state, id);
      const availableNow = !emitted && indeg === 0;
      const nodeState: NodeState = emitted
        ? "done"
        : availableNow
          ? "active"
          : "idle";

      return {
        id,
        x: POS[id][0],
        y: POS[id][1],
        label: id,
        sub: emitted
          ? `#${position + 1} · done`
          : availableNow
            ? "in 0 · ready"
            : `in ${indeg} · blocked`,
        state: nodeState,
        moveId: emitted ? undefined : `emit:${id}`,
        aria: emitted
          ? `Task ${id}, emitted at position ${position + 1}.`
          : availableNow
            ? `Task ${id}, in-degree 0. Emit it.`
            : `Task ${id}, in-degree ${indeg}, blocked; waits on ${pendingPredecessors(state, id).join(" and ")}.`,
      };
    });

    const edges: GraphView["edges"] = EDGES.map(([a, b]) => {
      const aEmitted = state.emitted.includes(a);
      const bEmitted = state.emitted.includes(b);
      const edgeState: EdgeState =
        aEmitted && bEmitted ? "done" : aEmitted ? "active" : bEmitted ? "bad" : "idle";
      return {
        id: `${a}-${b}`,
        from: a,
        to: b,
        directed: true,
        state: edgeState,
        aria: `${a} to ${b}.`,
      };
    });

    const order = state.emitted.length > 0 ? state.emitted.join(" ") : "—";
    return {
      kind: "graph",
      height: 400,
      caption: `Emitted ${state.emitted.length}/6 · In-degree 0: ${available.join(", ") || "none"} · Order: ${order} · 5 valid of 720`,
      nodes,
      edges,
    };
  },

  status(state) {
    return state.emitted.length === TASKS.length ? "won" : "playing";
  },

  score(state) {
    if (state.emitted.length < TASKS.length) {
      return {
        stars: 1,
        detail: `${state.emitted.length} of 6 tasks emitted; ${availableTasks(state).join(", ") || "none"} at in-degree 0.`,
      };
    }
    return {
      stars: 3,
      detail: `${state.emitted.join(" ")}. Six tasks in a linear extension; 5 of 720 orders qualify.`,
    };
  },

  solution: ["emit:A", "emit:B", "emit:C", "emit:D", "emit:E", "emit:F"],
};

export default level;
