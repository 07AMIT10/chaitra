import type { GameEvent, LevelModule, Move } from "../../types";
import { binarySearchMeta } from "../meta/binary-search";

type BSState = {
  lo: number;
  hi: number;
  fault: number;
  tests: number;
  offMid: number;
  found: boolean;
};

const TILES = 31;
const BUDGET = 5;
const FAULT = 22;

function initialState(): BSState {
  return { lo: 0, hi: TILES - 1, fault: FAULT, tests: 0, offMid: 0, found: false };
}

const level: LevelModule<BSState> = {
  meta: binarySearchMeta,
  initial: initialState(),

  moves(state) {
    if (state.found || state.tests >= BUDGET) return [];
    const moves: Move[] = [];
    for (let i = state.lo; i <= state.hi; i += 1) {
      moves.push({ id: `probe:${i}`, label: `Test tile ${i}` });
    }
    return moves;
  },

  apply(state, moveId) {
    if (!moveId.startsWith("probe:")) {
      return { state, events: [], error: "Unknown move." };
    }
    const index = Number(moveId.slice("probe:".length));
    if (!Number.isInteger(index) || index < state.lo || index > state.hi) {
      return {
        state,
        events: [],
        error: `Tile ${index} is outside the active range ${state.lo}–${state.hi}.`,
      };
    }

    const mid = Math.floor((state.lo + state.hi) / 2);
    const tests = state.tests + 1;
    const offMid = state.offMid + (index === mid ? 0 : 1);
    const events: GameEvent[] = [];

    if (index === state.fault) {
      events.push({
        text: `Tile ${index} is cracked. Found in ${tests} test${tests === 1 ? "" : "s"}.`,
        kind: "good",
      });
      return {
        state: { ...state, tests, offMid, found: true, lo: index, hi: index },
        events,
      };
    }

    const lo = index < state.fault ? index + 1 : state.lo;
    const hi = index > state.fault ? index - 1 : state.hi;
    events.push({
      text:
        index < state.fault
          ? `Tile ${index} is intact. The crack is above. Range ${lo}–${hi}.`
          : `Tile ${index} is intact. The crack is below. Range ${lo}–${hi}.`,
      kind: "info",
    });
    if (index !== mid) {
      const remaining = hi - lo + 1;
      const nextMid = Math.floor((lo + hi) / 2);
      const afterMid = Math.max(nextMid - lo, hi - nextMid);
      events.push({
        text: `Tile ${index} was not the midpoint (${mid}); the remaining range is ${lo}–${hi}, ${remaining} tile${remaining === 1 ? "" : "s"}. Testing the new midpoint ${nextMid} would leave at most ${afterMid}.`,
        kind: "info",
      });
    }
    if (tests >= BUDGET) {
      events.push({
        text: `Five tests spent. The bay floods; the crack is still hidden.`,
        kind: "bad",
      });
    }

    return { state: { ...state, lo, hi, tests, offMid }, events };
  },

  view(state) {
    const active = (i: number) => i >= state.lo && i <= state.hi;
    const canProbe = !state.found && state.tests < BUDGET;
    const mid = Math.floor((state.lo + state.hi) / 2);

    return {
      kind: "array",
      caption: `Tests: ${state.tests} / ${BUDGET} · Active range: ${state.lo}–${state.hi} · Midpoint: ${mid}`,
      items: Array.from({ length: TILES }, (_, i) => ({
        id: `tile-${i}`,
        value: i,
        state: state.found && i === state.fault ? ("target" as const) : active(i) ? ("active" as const) : ("done" as const),
        moveId: canProbe && active(i) ? `probe:${i}` : undefined,
        aria: `Tile ${i}${state.found && i === state.fault ? ", cracked" : active(i) ? ", in the active range" : ", eliminated"}.`,
      })),
      pointers: [
        { label: "low", index: state.lo },
        { label: "mid", index: mid },
        { label: "high", index: state.hi },
      ],
      segments: [
        {
          from: state.lo,
          to: state.hi,
          label: "crack in this range",
          state: "active",
        },
      ],
    };
  },

  status(state) {
    if (state.found) return "won";
    return state.tests >= BUDGET ? "lost" : "playing";
  },

  score(state) {
    if (!state.found) return { stars: 1, detail: "The crack is still hidden." };
    if (state.offMid === 0) {
      return { stars: 3, detail: "Every test halved the range. The five-test guarantee held." };
    }
    return {
      stars: state.offMid <= 1 ? 2 : 1,
      detail: `${state.offMid} test${state.offMid === 1 ? "" : "s"} did not halve the range.`,
    };
  },

  solution: ["probe:15", "probe:23", "probe:19", "probe:21", "probe:22"],
};

export default level;
