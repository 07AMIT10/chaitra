import type { GameEvent, LevelModule, Move } from "../../types";
import { quicksortMeta } from "../meta/quicksort";

type Segment = { lo: number; hi: number; depth: number };

type QSState = {
  segments: Segment[];
  frozen: number[];
  pivots: number[];
  comparisons: number;
  maxDepth: number;
};

const KEYS = 16;
const BUDGET = 58;
const DEPTH_CAP = 5;
const CLEAN = 44;
const CLEAN_DEPTH = 4;

function statusOf(state: QSState): "playing" | "won" | "lost" {
  if (state.comparisons > BUDGET || state.maxDepth > DEPTH_CAP) return "lost";
  return state.segments.length === 0 ? "won" : "playing";
}

function initialState(): QSState {
  return {
    segments: [{ lo: 1, hi: KEYS, depth: 0 }],
    frozen: [],
    pivots: [],
    comparisons: 0,
    maxDepth: 0,
  };
}

const level: LevelModule<QSState> = {
  meta: quicksortMeta,
  initial: initialState(),

  moves(state) {
    if (statusOf(state) !== "playing") return [];
    const segment = state.segments[0];
    if (!segment) return [];

    const moves: Move[] = [];
    for (let key = segment.lo; key <= segment.hi; key += 1) {
      moves.push({
        id: `pivot:${key}`,
        label: `Freeze key ${key} (${segment.hi - segment.lo} comparisons)`,
      });
    }
    return moves;
  },

  apply(state, moveId) {
    if (statusOf(state) !== "playing") {
      return { state, events: [], error: "The sort is already resolved; undo to reopen it." };
    }
    if (!moveId.startsWith("pivot:")) {
      return { state, events: [], error: "Unknown move." };
    }

    const key = Number(moveId.slice("pivot:".length));
    const segment = state.segments[0];
    if (!segment) {
      return { state, events: [], error: "Every key is already frozen." };
    }
    if (!Number.isInteger(key) || key < segment.lo || key > segment.hi) {
      return {
        state,
        events: [],
        error: `Key ${key} is outside the active segment ${segment.lo}–${segment.hi}.`,
      };
    }

    const cost = segment.hi - segment.lo;
    const depth = segment.depth + 1;
    const comparisons = state.comparisons + cost;
    const maxDepth = Math.max(state.maxDepth, depth);
    const frozen = [...state.frozen, key];
    const segments: Segment[] = [];

    if (key - 1 > segment.lo) {
      segments.push({ lo: segment.lo, hi: key - 1, depth });
    } else if (key - 1 === segment.lo) {
      frozen.push(segment.lo);
    }

    if (key + 1 < segment.hi) {
      segments.push({ lo: key + 1, hi: segment.hi, depth });
    } else if (key + 1 === segment.hi) {
      frozen.push(segment.hi);
    }

    segments.push(...state.segments.slice(1));

    const parts: string[] = [];
    if (key - 1 > segment.lo) parts.push(`${segment.lo}–${key - 1} active`);
    else if (key - 1 === segment.lo) parts.push(`${segment.lo} fixed`);
    if (key + 1 < segment.hi) parts.push(`${key + 1}–${segment.hi} active`);
    else if (key + 1 === segment.hi) parts.push(`${segment.hi} fixed`);

    const events: GameEvent[] = [
      {
        text: `Key ${key} frozen at position ${key}: ${cost} comparisons, total ${comparisons} / ${BUDGET}. ${
          parts.length > 0 ? parts.join(" · ") : "No open segment."
        }`,
        kind: "info",
      },
    ];

    if (comparisons > BUDGET) {
      events.push({
        text: `Comparison budget exceeded: ${comparisons} of ${BUDGET}.`,
        kind: "bad",
      });
    }
    if (maxDepth > DEPTH_CAP) {
      events.push({
        text: `Partition depth ${maxDepth} exceeds the ${DEPTH_CAP}-level cap.`,
        kind: "bad",
      });
    }
    if (comparisons <= BUDGET && maxDepth <= DEPTH_CAP && segments.length === 0) {
      events.push({
        text: `All sixteen keys frozen in ${comparisons} comparisons at depth ${maxDepth}.`,
        kind: "good",
      });
    }

    return {
      state: {
        segments,
        frozen,
        pivots: [...state.pivots, key],
        comparisons,
        maxDepth,
      },
      events,
    };
  },

  view(state) {
    const segment = state.segments[0];
    const canPlay = statusOf(state) === "playing";

    return {
      kind: "array",
      caption: `Comparisons: ${state.comparisons} / ${BUDGET} · Depth: ${state.maxDepth} / ${DEPTH_CAP} · Active: ${
        segment ? `${segment.lo}–${segment.hi}` : "none"
      } · In place: ${state.frozen.length} / ${KEYS}`,
      items: Array.from({ length: KEYS }, (_, index) => {
        const key = index + 1;
        const isFrozen = state.frozen.includes(key);
        const isActive = Boolean(segment && key >= segment.lo && key <= segment.hi);
        const isPivot = state.pivots.includes(key);
        const isCandidate = canPlay && isActive;

        return {
          id: `key-${key}`,
          value: key,
          label: isPivot ? "pivot" : isFrozen ? "fixed" : undefined,
          state: isFrozen ? ("done" as const) : isActive ? ("active" as const) : ("idle" as const),
          moveId: isCandidate ? `pivot:${key}` : undefined,
          aria: isPivot
            ? `Key ${key}, frozen pivot.`
            : isFrozen
              ? `Key ${key}, fixed.`
              : isActive && segment
                ? `Key ${key} in the active segment ${segment.lo}–${segment.hi}. Freeze it as pivot for ${segment.hi - segment.lo} comparisons.`
                : `Key ${key}, outside the active segment.`,
        };
      }),
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") {
      return {
        stars: 1,
        detail: `The sixteen keys are not all frozen; ${state.comparisons} comparisons spent.`,
      };
    }
    if (state.comparisons <= CLEAN && state.maxDepth <= CLEAN_DEPTH) {
      return {
        stars: 3,
        detail: `${state.comparisons} comparisons at depth ${state.maxDepth}. The median path costs 38; the sorted chain costs 120.`,
      };
    }
    if (state.comparisons <= 52) {
      return {
        stars: 2,
        detail: `${state.comparisons} comparisons at depth ${state.maxDepth}. A clean run is ${CLEAN} at depth ${CLEAN_DEPTH}.`,
      };
    }
    return {
      stars: 1,
      detail: `${state.comparisons} comparisons. The sorted chain costs 120.`,
    };
  },

  solution: [
    "pivot:8",
    "pivot:4",
    "pivot:2",
    "pivot:6",
    "pivot:12",
    "pivot:10",
    "pivot:14",
    "pivot:15",
  ],
};

export default level;
