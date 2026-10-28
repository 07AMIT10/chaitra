import type { GameEvent, LevelModule, Move } from "../../types";
import { longestIncreasingSubsequenceMeta } from "../meta/longest-increasing-subsequence";

type LISState = {
  chain: number[];
};

const READINGS = [4, 1, 5, 2, 6, 3];
const TARGET = 3;

const BEST_FROM: number[] = READINGS.map(() => 1);

for (let i = READINGS.length - 1; i >= 0; i -= 1) {
  for (let j = i + 1; j < READINGS.length; j += 1) {
    if (READINGS[j] > READINGS[i]) {
      BEST_FROM[i] = Math.max(BEST_FROM[i], 1 + BEST_FROM[j]);
    }
  }
}

// Patience sorting: each card lands on the leftmost pile whose top is at least
// its value. The pile tops are what the caption reports.
function patienceTops(): number[] {
  const tops: number[] = [];
  for (const value of READINGS) {
    const pile = tops.findIndex((top) => top >= value);
    if (pile === -1) tops.push(value);
    else tops[pile] = value;
  }
  return tops;
}

const PILE_TOPS = patienceTops();

function statusOf(state: LISState): "playing" | "won" {
  return state.chain.length === TARGET ? "won" : "playing";
}

function canAppend(state: LISState, index: number): boolean {
  if (state.chain.length === 0) return true;
  const last = state.chain[state.chain.length - 1];
  return index > last && READINGS[index] > READINGS[last];
}

function valuesOf(chain: number[]): number[] {
  return chain.map((index) => READINGS[index]);
}

function initialState(): LISState {
  return { chain: [] };
}

const level: LevelModule<LISState> = {
  meta: longestIncreasingSubsequenceMeta,
  initial: initialState(),

  moves(state) {
    if (statusOf(state) !== "playing") return [];

    const moves: Move[] = [];
    for (let index = 0; index < READINGS.length; index += 1) {
      if (canAppend(state, index)) {
        moves.push({
          id: `append:${index}`,
          label: `Append reading ${index + 1} (${READINGS[index]})`,
        });
      }
    }
    return moves;
  },

  apply(state, moveId) {
    if (statusOf(state) !== "playing") {
      return { state, events: [], error: "The chain already reaches length 3; undo to reopen it." };
    }
    if (!moveId.startsWith("append:")) {
      return { state, events: [], error: "Unknown move." };
    }

    const index = Number(moveId.slice("append:".length));
    if (!Number.isInteger(index) || index < 0 || index >= READINGS.length) {
      return { state, events: [], error: "That reading is outside the six-frame burst." };
    }
    if (!canAppend(state, index)) {
      const last = state.chain[state.chain.length - 1];
      if (state.chain.length > 0 && index <= last) {
        return {
          state,
          events: [],
          error: `Reading ${index + 1} is not after the chain's last reading ${last + 1}.`,
        };
      }
      if (state.chain.length > 0) {
        return {
          state,
          events: [],
          error: `Reading ${index + 1} (${READINGS[index]}) does not exceed the chain's last value (${READINGS[last]}).`,
        };
      }
      return { state, events: [], error: "That reading cannot extend the chain." };
    }

    const height = state.chain.length + BEST_FROM[index];
    if (height < TARGET) {
      const nextValues = [...valuesOf(state.chain), READINGS[index]];
      return {
        state,
        events: [],
        error: `Appending reading ${index + 1} (${READINGS[index]}) gives ${nextValues.join(
          " → ",
        )}. The longest chain through it is ${height}; the skyline's best is ${TARGET}.`,
      };
    }

    const chain = [...state.chain, index];
    const values = valuesOf(chain);
    const events: GameEvent[] = [
      {
        text: `Appended reading ${index + 1} (${READINGS[index]}). Chain: ${values.join(
          " → ",
        )}; length ${chain.length} / ${TARGET}.`,
        kind: "info",
      },
    ];

    if (chain.length === TARGET) {
      events.push({
        text: `The skyline reaches height ${TARGET}: ${values.join(" → ")}.`,
        kind: "good",
      });
    }

    return { state: { chain }, events };
  },

  view(state) {
    const values = valuesOf(state.chain);
    const last = state.chain.length > 0 ? state.chain[state.chain.length - 1] : -1;
    const chainText = values.length > 0 ? values.join(" → ") : "—";
    const tops = PILE_TOPS.join(" · ");
    const canPlay = statusOf(state) === "playing";

    return {
      kind: "array",
      caption: `Chain: ${chainText} · Length: ${values.length} / ${TARGET} · Best: ${TARGET} · Piles: ${PILE_TOPS.length} (tops ${tops})`,
      items: READINGS.map((value, index) => {
        const inChain = state.chain.includes(index);
        const isLast = index === last;
        const candidate = canPlay && canAppend(state, index);
        const moveId = candidate ? `append:${index}` : undefined;

        return {
          id: `reading-${index}`,
          value,
          label: `${index + 1}`,
          state: inChain ? (isLast ? ("target" as const) : ("done" as const)) : candidate ? ("active" as const) : ("idle" as const),
          moveId,
          aria: inChain
            ? `Reading ${index + 1}, value ${value}, in the chain.`
            : candidate
              ? `Reading ${index + 1}, value ${value}. Append it to the chain.`
              : `Reading ${index + 1}, value ${value}.`,
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
        detail: `The chain has length ${state.chain.length}; the skyline's best is ${TARGET}.`,
      };
    }
    return {
      stars: 3,
      detail: `${valuesOf(state.chain).join(" → ")} reaches length ${TARGET}; the patience deal ends with ${PILE_TOPS.length} piles.`,
    };
  },

  solution: ["append:0", "append:2", "append:4"],
};

export default level;
