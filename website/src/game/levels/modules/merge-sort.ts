import type { GameEvent, LevelModule, Move, NodeState } from "../../types";
import { mergeSortMeta } from "../meta/merge-sort";

type Run = {
  id: string;
  /** Binary path from the root split; siblings share a parent prefix. */
  group: string;
  keys: number[];
  depth: number;
  /** A leaf or a completed zip; resolved runs are never split again. */
  resolved: boolean;
};

type Phase = "split" | "done";

type MSState = {
  runs: Run[];
  phase: Phase;
  comparisons: number;
  /** Deepest split actually opened; the recursion-tree depth. */
  buildDepth: number;
};

const KEYS = [1, 3, 2, 7, 4, 6, 5, 8];
const TOTAL = KEYS.length;
const DEPTH = 3;
const BUDGET = 17;

function idFor(group: string): string {
  return group === "" ? "root" : group;
}

function parentGroup(group: string): string {
  return group.slice(0, -1);
}

function initialState(): MSState {
  return {
    runs: [{ id: "root", group: "", keys: [...KEYS], depth: 0, resolved: false }],
    phase: "split",
    comparisons: 0,
    buildDepth: 0,
  };
}

function findRun(state: MSState, id: string): Run | undefined {
  return state.runs.find((run) => run.id === id);
}

function activeSplitRun(state: MSState): Run | undefined {
  return state.runs.find((run) => !run.resolved && run.keys.length > 1);
}

function isSorted(keys: number[]): boolean {
  for (let i = 1; i < keys.length; i += 1) {
    if (keys[i - 1] > keys[i]) return false;
  }
  return true;
}

function isWon(state: MSState): boolean {
  if (state.phase !== "done") return false;
  if (state.runs.length !== 1) return false;
  const keys = state.runs[0].keys;
  return keys.length === TOTAL && isSorted(keys);
}

function statusOf(state: MSState): "playing" | "won" | "lost" {
  if (state.comparisons > BUDGET) return "lost";
  return isWon(state) ? "won" : "playing";
}

function zipSiblings(left: Run, right: Run): { run: Run; keys: number[]; comparisons: number } {
  let li = 0;
  let ri = 0;
  let comparisons = 0;
  const keys: number[] = [];

  while (li < left.keys.length && ri < right.keys.length) {
    comparisons += 1;
    if (left.keys[li] <= right.keys[ri]) {
      keys.push(left.keys[li]);
      li += 1;
    } else {
      keys.push(right.keys[ri]);
      ri += 1;
    }
  }
  keys.push(...left.keys.slice(li), ...right.keys.slice(ri));

  const group = parentGroup(left.group);
  return {
    run: { id: idFor(group), group, keys, depth: left.depth - 1, resolved: true },
    keys,
    comparisons,
  };
}

/** The loom zips every pair of finished siblings, bottom-up, without a player move. */
function settle(
  startingRuns: Run[],
  startingComparisons: number,
  events: GameEvent[],
): { runs: Run[]; comparisons: number } {
  let runs = [...startingRuns];
  let comparisons = startingComparisons;
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < runs.length - 1; i += 1) {
      const left = runs[i];
      const right = runs[i + 1];
      if (!left.resolved || !right.resolved) continue;
      if (left.depth !== right.depth) continue;
      if (parentGroup(left.group) !== parentGroup(right.group)) continue;

      const zip = zipSiblings(left, right);
      comparisons += zip.comparisons;
      runs = [...runs.slice(0, i), zip.run, ...runs.slice(i + 2)];
      const cost = zip.comparisons === 1 ? "1 comparison" : `${zip.comparisons} comparisons`;
      events.push({
        text: `Zip ${left.keys.join(" ")} + ${right.keys.join(" ")} → ${zip.keys.join(" ")} (${cost}; ${comparisons} / ${BUDGET}).`,
        kind: "info",
      });
      merged = true;
      break;
    }
  }

  return { runs, comparisons };
}

const level: LevelModule<MSState> = {
  meta: mergeSortMeta,
  initial: initialState(),

  moves(state) {
    if (state.phase !== "split") return [];
    const run = activeSplitRun(state);
    if (!run) return [];

    const moves: Move[] = [];
    for (let k = 1; k < run.keys.length; k += 1) {
      moves.push({
        id: `split:${run.id}:${k}`,
        label: `Split ${run.keys.length} ribbons after ${run.keys[k - 1]} (${k} | ${run.keys.length - k})`,
        placement: "tray",
      });
    }
    return moves;
  },

  apply(state, moveId) {
    if (!moveId.startsWith("split:")) {
      return { state, events: [], error: "Unknown move." };
    }
    if (state.phase !== "split") {
      return { state, events: [], error: "The loom is already one sorted ribbon; there is nothing left to split." };
    }

    const [kind, runId, rawK] = moveId.split(":");
    if (kind !== "split" || runId === undefined || rawK === undefined) {
      return { state, events: [], error: "Unknown split." };
    }
    const run = findRun(state, runId);
    if (!run) {
      return { state, events: [], error: `Run ${runId} is not on the loom.` };
    }
    const active = activeSplitRun(state);
    if (run.resolved) {
      return {
        state,
        events: [],
        error: `The run [${run.keys.join(" ")}] is already resolved; the active split is ${active ? `[${active.keys.join(" ")}]` : "none"}.`,
      };
    }
    if (!active || active.id !== run.id) {
      return {
        state,
        events: [],
        error: `The run [${run.keys.join(" ")}] is not the active split; the leftmost unsplit run is ${active ? `[${active.keys.join(" ")}]` : "none"}.`,
      };
    }

    const k = Number(rawK);
    if (!Number.isInteger(k) || k < 1 || k >= run.keys.length) {
      return {
        state,
        events: [],
        error: `A split after ${rawK} does not divide a run of ${run.keys.length} ribbons.`,
      };
    }

    const depth = run.depth + 1;
    if (depth > DEPTH) {
      return {
        state,
        events: [],
        error: `The run [${run.keys.join(" ")}] already sits at depth ${run.depth}; a split opens depth ${depth}, above the three-level budget.`,
      };
    }

    const room = 2 ** (DEPTH - depth);
    const leftLen = k;
    const rightLen = run.keys.length - k;
    if (leftLen > room || rightLen > room) {
      const side = leftLen > room ? "left" : "right";
      const size = leftLen > room ? leftLen : rightLen;
      return {
        state,
        events: [],
        error: `The ${side} child would hold ${size} ribbons at depth ${depth}; depth 3 leaves room for ${room}. A ${leftLen}/${rightLen} split adds a fourth level.`,
      };
    }

    const left: Run = {
      id: idFor(`${run.group}L`),
      group: `${run.group}L`,
      keys: run.keys.slice(0, k),
      depth,
      resolved: k === 1,
    };
    const right: Run = {
      id: idFor(`${run.group}R`),
      group: `${run.group}R`,
      keys: run.keys.slice(k),
      depth,
      resolved: rightLen === 1,
    };

    const splitRuns = state.runs.flatMap((entry) => (entry.id === run.id ? [left, right] : [entry]));
    const events: GameEvent[] = [
      {
        text: `Split ${run.keys.join(" ")} into ${left.keys.join(" ")} | ${right.keys.join(" ")} at depth ${depth}.`,
        kind: "info",
      },
    ];
    const settled = settle(splitRuns, state.comparisons, events);
    const done = settled.runs.length === 1 && settled.runs[0].resolved;

    if (settled.comparisons > BUDGET) {
      events.push({
        text: `Comparison budget exceeded: ${settled.comparisons} of ${BUDGET}.`,
        kind: "bad",
      });
    }
    if (done) {
      events.push({
        text: `One sorted ribbon: ${settled.runs[0].keys.join(" ")} at depth ${settled.runs[0].depth}; ${settled.comparisons} / ${BUDGET} comparisons.`,
        kind: "good",
      });
    }

    return {
      state: {
        ...state,
        runs: settled.runs,
        phase: done ? "done" : "split",
        comparisons: settled.comparisons,
        buildDepth: Math.max(state.buildDepth, depth),
      },
      events,
    };
  },

  view(state) {
    const entries: { key: number; run: Run; indexInRun: number; global: number }[] = [];
    let global = 0;
    for (const run of state.runs) {
      for (let i = 0; i < run.keys.length; i += 1) {
        entries.push({ key: run.keys[i], run, indexInRun: i, global });
        global += 1;
      }
    }

    const active = state.phase === "split" ? activeSplitRun(state) : undefined;
    const activeStart = active
      ? entries.find((entry) => entry.run.id === active.id)?.global
      : undefined;

    const items = entries.map((entry) => {
      let itemState: NodeState = "idle";
      let aria = `Ribbon ${entry.key}, run at depth ${entry.run.depth}.`;

      if (state.phase === "done") {
        itemState = "active";
        aria = `Ribbon ${entry.key}, sorted.`;
      } else if (entry.run.id === active?.id) {
        itemState = "active";
        aria =
          entry.indexInRun < entry.run.keys.length - 1
            ? `Active ${entry.run.keys.length}-key run at depth ${entry.run.depth}; a split after ${entry.key} leaves ${entry.indexInRun + 1} left and ${entry.run.keys.length - entry.indexInRun - 1} right.`
            : `Last ribbon of the active ${entry.run.keys.length}-key run; a split goes after an earlier ribbon.`;
      } else if (entry.run.resolved) {
        itemState = "done";
      }

      return {
        id: `key-${entry.key}`,
        value: entry.key,
        state: itemState,
        aria,
      };
    });

    let offset = 0;
    const segments = state.runs.map((run) => {
      const from = offset;
      const to = offset + run.keys.length - 1;
      offset += run.keys.length;
      return {
        from,
        to,
        label: `${run.keys.length} ${run.keys.length === 1 ? "key" : "keys"} · d${run.depth}${run.resolved && run.keys.length > 1 ? " · sorted" : ""}`,
        state:
          state.phase === "done" || run.id === active?.id
            ? ("active" as const)
            : run.resolved
              ? ("done" as const)
              : ("idle" as const),
      };
    });

    const pointers: { label: string; index: number }[] = [];
    if (activeStart !== undefined) {
      pointers.push({ label: "active run", index: activeStart });
    }

    let caption = `Runs: ${state.runs.length} · Deepest: ${state.buildDepth} / ${DEPTH} · Comparisons: ${state.comparisons} / ${BUDGET}`;
    if (state.phase === "split") {
      caption += " · Split the active run; the loom zips finished siblings";
    } else {
      caption += " · One sorted ribbon";
    }

    return {
      kind: "array",
      caption,
      items,
      pointers,
      segments,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") {
      return {
        stars: 1,
        detail:
          state.comparisons > BUDGET
            ? `${state.comparisons} comparisons; the budget is ${BUDGET}.`
            : "The ribbon is not one sorted run.",
      };
    }
    if (state.buildDepth <= DEPTH && state.comparisons <= BUDGET) {
      return {
        stars: 3,
        detail: `${state.runs[0].keys.join(" ")} at depth ${state.buildDepth}; ${state.comparisons} comparisons. n log₂ n − n + 1 = ${BUDGET}.`,
      };
    }
    return {
      stars: 2,
      detail: `Sorted at depth ${state.buildDepth}; the budget is depth ${DEPTH}.`,
    };
  },

  solution: [
    "split:root:4",
    "split:L:2",
    "split:LL:1",
    "split:LR:1",
    "split:R:2",
    "split:RL:1",
    "split:RR:1",
  ],
};

export default level;
