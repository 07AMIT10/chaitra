import type { GameEvent, LevelModule, Move } from "../../types";
import { knapsack01Meta } from "../meta/knapsack-0-1";

type KSState = {
  index: number;
  capacity: number;
  value: number;
  taken: string[];
  skipped: string[];
  finished: boolean;
};

const ITEMS = [
  { name: "tent", w: 6, v: 42 },
  { name: "stove", w: 5, v: 30 },
  { name: "food", w: 5, v: 28 },
] as const;

const CAPACITY = 10;
const TARGET = 58;

function buildTable(): number[][] {
  const table = Array.from({ length: ITEMS.length + 1 }, () =>
    Array<number>(CAPACITY + 1).fill(0),
  );

  for (let i = 1; i <= ITEMS.length; i += 1) {
    const item = ITEMS[i - 1];
    for (let c = 0; c <= CAPACITY; c += 1) {
      const skip = table[i - 1][c];
      const take = c >= item.w ? item.v + table[i - 1][c - item.w] : -Infinity;
      table[i][c] = Math.max(skip, take);
    }
  }
  return table;
}

const TABLE = buildTable();

function statusOf(state: KSState): "playing" | "won" | "lost" {
  if (!state.finished) return "playing";
  return state.value === TARGET ? "won" : "lost";
}

function initialState(): KSState {
  return {
    index: 0,
    capacity: CAPACITY,
    value: 0,
    taken: [],
    skipped: [],
    finished: false,
  };
}

const level: LevelModule<KSState> = {
  meta: knapsack01Meta,
  initial: initialState(),

  moves(state) {
    if (state.finished) return [];
    const item = ITEMS[state.index];
    if (!item) return [];

    return [
      {
        id: `take:${state.index}`,
        label: `Take ${item.name} (${item.w} kg, ${item.v})`,
        placement: "tray",
      },
      {
        id: `skip:${state.index}`,
        label: `Skip ${item.name}`,
        placement: "tray",
      },
    ];
  },

  apply(state, moveId) {
    const parts = moveId.split(":");
    const kind = parts[0];
    const index = Number(parts[1]);
    if ((kind !== "take" && kind !== "skip") || !Number.isInteger(index)) {
      return { state, events: [], error: "Unknown move." };
    }

    const item = ITEMS[state.index];
    if (!item || state.finished) {
      return { state, events: [], error: "The pack is already closed." };
    }
    if (index !== state.index) {
      return {
        state,
        events: [],
        error: `Item ${index + 1} is not the current row; the current item is the ${item.name}.`,
      };
    }

    if (kind === "take" && item.w > state.capacity) {
      const carried = CAPACITY - state.capacity;
      return {
        state,
        events: [],
        error: `The ${item.name} is ${item.w} kg; the pack already carries ${carried} kg, and ${state.capacity} kg remain under the ${CAPACITY} kg ceiling. The take would weigh ${carried + item.w}.`,
      };
    }

    const nextIndex = state.index + 1;
    const finished = nextIndex === ITEMS.length;
    const events: GameEvent[] = [];

    if (kind === "take") {
      const capacity = state.capacity - item.w;
      const value = state.value + item.v;
      events.push({
        text: `Took the ${item.name}: ${item.w} kg, ${item.v} value. Capacity left ${capacity}; pack ${value}.`,
        kind: "info",
      });
      const next: KSState = {
        index: nextIndex,
        capacity,
        value,
        taken: [...state.taken, item.name],
        skipped: state.skipped,
        finished,
      };
      if (finished) {
        if (value === TARGET) {
          events.push({
            text: `Pack closed at ${value}: ${next.taken.join(" + ")} use ${CAPACITY - capacity} kg. Cell (3,10) reads ${TABLE[3][10]}.`,
            kind: "good",
          });
        } else {
          events.push({
            text: `Pack closed at ${value}. Cell (3,10) reads ${TABLE[3][10]}.`,
            kind: "bad",
          });
        }
      }
      return { state: next, events };
    }

    events.push({
      text: `Skipped the ${item.name}. Capacity left ${state.capacity}; pack ${state.value}.`,
      kind: "info",
    });
    const next: KSState = {
      index: nextIndex,
      capacity: state.capacity,
      value: state.value,
      taken: state.taken,
      skipped: [...state.skipped, item.name],
      finished,
    };
    if (finished) {
      if (next.value === 42 && next.taken.includes("tent")) {
        events.push({
          text: `Pack closed at 42. The tent's 6 kg left ${next.capacity}, and neither 5 kg module fits. Cell (3,10) reads ${TABLE[3][10]}.`,
          kind: "bad",
        });
      } else {
        events.push({
          text: `Pack closed at ${next.value}. Cell (3,10) reads ${TABLE[3][10]}.`,
          kind: "bad",
        });
      }
    }
    return { state: next, events };
  },

  view(state) {
    const item = ITEMS[state.index];
    const currentRow = state.finished ? ITEMS.length + 1 : state.index + 1;
    const caption = state.finished
      ? `Pack closed: ${state.value} · Capacity left ${state.capacity} / ${CAPACITY} · Corner (3,10) reads ${TABLE[3][10]}`
      : `Row ${currentRow} / 3: ${
          item ? `${item.name} (${item.w} kg, ${item.v})` : "none"
        } · Capacity left ${state.capacity} / ${CAPACITY} · Pack ${state.value} · Corner (3,10) reads ${TABLE[3][10]}`;

    const cells: {
      r: number;
      c: number;
      value: number;
      state?: "idle" | "active" | "done" | "target";
      aria?: string;
    }[] = [];

    for (let r = 0; r <= ITEMS.length; r += 1) {
      for (let c = 0; c <= CAPACITY; c += 1) {
        const isCorner = r === ITEMS.length && c === CAPACITY;
        const isCurrentRow = !state.finished && r === currentRow;
        const cellState = isCorner
          ? ("target" as const)
          : isCurrentRow
            ? ("active" as const)
            : r < currentRow || state.finished
              ? ("done" as const)
              : ("idle" as const);

        cells.push({
          r,
          c,
          value: TABLE[r][c],
          state: cellState,
          aria: isCorner
            ? `Corner cell, row ${r}, capacity ${c}: ${TABLE[r][c]}.`
            : isCurrentRow
              ? `Current row ${r}, capacity ${c}: ${TABLE[r][c]}.`
              : `Row ${r}, capacity ${c}: ${TABLE[r][c]}.`,
        });
      }
    }

    return {
      kind: "grid",
      rows: ITEMS.length + 1,
      cols: CAPACITY + 1,
      rowLabels: ["none", "tent", "stove", "food"],
      colLabels: Array.from({ length: CAPACITY + 1 }, (_, c) => `${c}`),
      cells,
      caption,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") {
      return {
        stars: 1,
        detail: state.finished
          ? `The pack closed at ${state.value}; the corner reads ${TABLE[3][10]}.`
          : `The pack is not closed; ${state.value} sits in it with ${state.capacity} kg left.`,
      };
    }
    return {
      stars: 3,
      detail: "Stove + food: 10 kg, 30 + 28 = 58. The tent's row never exceeds 42.",
    };
  },

  solution: ["skip:0", "take:1", "take:2"],
};

export default level;
