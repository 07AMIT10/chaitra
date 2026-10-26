import type { GameEvent, GridView, LevelModule, Move } from "../../types";
import { floydWarshallMeta } from "../meta/floyd-warshall";

type Semiring = "min-plus" | "plus-times" | "or-and" | "max-plus";

type FWState = {
  semiring: Semiring | null;
  /** How many times the four-line closure has been run. */
  choices: number;
  done: boolean;
};

const NODES = ["A", "B", "C", "D"] as const;

/** The page's five one-way roads over A, B, C, D. */
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 3],
  [2, 3],
];

const SEMIRINGS: { id: Semiring; name: string }[] = [
  { id: "min-plus", name: "(min, +)" },
  { id: "plus-times", name: "(+, ×)" },
  { id: "or-and", name: "(OR, AND)" },
  { id: "max-plus", name: "(max, +)" },
];

/** The raw input matrix on the page. A dot is an absent road. */
const RAW: (number | string)[][] = [
  ["·", 1, 1, "·"],
  ["·", "·", 1, 1],
  ["·", "·", "·", 1],
  ["·", "·", "·", "·"],
];

/**
 * The same triple loop under each of the four arithmetics. The graph is
 * acyclic, so the (+, ×) closure terminates at the three routes A→D.
 */
function closure(semiring: Semiring): number[][] {
  const n = NODES.length;
  const identity = semiring === "plus-times" || semiring === "or-and" ? 1 : 0;
  const missing =
    semiring === "min-plus" ? Infinity : semiring === "max-plus" ? -Infinity : 0;

  const d: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? identity : missing)),
  );
  for (const [i, j] of EDGES) d[i][j] = 1;

  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (semiring === "min-plus") {
          d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
        } else if (semiring === "max-plus") {
          d[i][j] = Math.max(d[i][j], d[i][k] + d[k][j]);
        } else if (semiring === "plus-times") {
          // The identity on the diagonal makes k = i or k = j double a path.
          // Addition is the one non-idempotent choice, so it needs the guard.
          if (i === k || j === k) continue;
          d[i][j] += d[i][k] * d[k][j];
        } else {
          d[i][j] = d[i][j] || (d[i][k] && d[k][j]) ? 1 : 0;
        }
      }
    }
  }
  return d;
}

function format(value: number): string {
  if (value === Infinity) return "∞";
  if (value === -Infinity) return "−∞";
  return String(value);
}

function semiringName(id: Semiring | null): string {
  if (id === null) return "none";
  return SEMIRINGS.find((entry) => entry.id === id)?.name ?? id;
}

function initialState(): FWState {
  return { semiring: null, choices: 0, done: false };
}

const level: LevelModule<FWState> = {
  meta: floydWarshallMeta,
  initial: initialState(),

  moves(state) {
    if (state.done) return [];

    const moves: Move[] = SEMIRINGS.map((entry) => ({
      id: `semiring:${entry.id}`,
      label: `Choose ${entry.name}`,
      placement: "tray",
    }));

    if (state.semiring !== null) {
      moves.push({
        id: "cell:A:D",
        label: "Read cell A→D",
        placement: "board",
      });
    }
    return moves;
  },

  apply(state, moveId) {
    if (state.done) {
      return { state, events: [], error: "A→D is already certified." };
    }

    if (moveId.startsWith("semiring:")) {
      const id = moveId.slice("semiring:".length) as Semiring;
      const entry = SEMIRINGS.find((candidate) => candidate.id === id);
      if (!entry) {
        return { state, events: [], error: "Unknown arithmetic." };
      }

      const reading = format(closure(id)[0][3]);
      const meaning =
        id === "plus-times"
          ? "three distinct routes"
          : id === "min-plus"
            ? "the fewest roads"
            : id === "max-plus"
              ? "three roads on the longest route"
              : "D is reachable";

      const events: GameEvent[] = [
        {
          text: `Ran k = 1…4 under ${entry.name}. A→D = ${reading}: ${meaning}.`,
          kind: "info",
        },
      ];

      return {
        state: { ...state, semiring: id, choices: state.choices + 1 },
        events,
      };
    }

    if (moveId !== "cell:A:D") {
      return { state, events: [], error: "Unknown move." };
    }

    if (state.semiring === null) {
      return {
        state,
        events: [],
        error: "A→D is still the raw input. Choose one arithmetic before reading the cell.",
      };
    }

    if (state.semiring === "min-plus") {
      return {
        state,
        events: [],
        error:
          "A→D reads 2 under (min, +): the fewest roads. A distance is not a count of routes.",
      };
    }

    if (state.semiring === "max-plus") {
      return {
        state,
        events: [],
        error:
          "A→D prints 3 under (max, +), but that is three roads on the longest route, not three distinct routes.",
      };
    }

    if (state.semiring === "or-and") {
      return {
        state,
        events: [],
        error:
          "A→D reads 1 under (OR, AND): D is reachable. Reachability is not a count of routes.",
      };
    }

    return {
      state: { ...state, done: true },
      events: [
        {
          text: "A→D = 3 distinct routes: A→B→D, A→C→D and A→B→C→D.",
          kind: "good",
        },
      ],
    };
  },

  view(state) {
    const closed = state.semiring === null ? null : closure(state.semiring);
    const targetValue = closed === null ? "·" : format(closed[0][3]);
    const name = semiringName(state.semiring);
    const cells: GridView["cells"] = [];

    for (let r = 0; r < NODES.length; r += 1) {
      for (let c = 0; c < NODES.length; c += 1) {
        const isTarget = r === 0 && c === 3;
        const value = closed === null ? String(RAW[r][c]) : format(closed[r][c]);
        const canRead = isTarget && state.semiring !== null && !state.done;

        let aria: string;
        if (isTarget) {
          aria =
            state.semiring === null
              ? "A to D in the input matrix: no direct road."
              : `A to D under ${name}: ${value}.`;
        } else {
          aria = `Row ${NODES[r]}, column ${NODES[c]}: ${value}.`;
        }

        cells.push({
          r,
          c,
          value,
          state: isTarget ? (state.done ? "done" : "target") : "idle",
          moveId: canRead ? "cell:A:D" : undefined,
          aria,
        });
      }
    }

    return {
      kind: "grid",
      rows: NODES.length,
      cols: NODES.length,
      cells,
      rowLabels: [...NODES],
      colLabels: [...NODES],
      caption:
        state.semiring === null
          ? "Input matrix · 5 one-way roads · A→D absent · Clean run: 1 arithmetic"
          : `${name} · k = 4 / 4 · A→D = ${targetValue} · Arithmetic runs: ${state.choices} · Clean run: 1 arithmetic`,
    };
  },

  status(state) {
    return state.done ? "won" : "playing";
  },

  score(state) {
    if (!state.done) {
      return { stars: 1, detail: "A→D is not certified." };
    }
    if (state.choices === 1) {
      return {
        stars: 3,
        detail: "A→D = 3 under (+, ×); one arithmetic run.",
      };
    }
    if (state.choices === 2) {
      return {
        stars: 2,
        detail: "A→D = 3 under (+, ×); two arithmetic runs.",
      };
    }
    return {
      stars: 1,
      detail: `A→D = 3 under (+, ×); ${state.choices} arithmetic runs.`,
    };
  },

  solution: ["semiring:plus-times", "cell:A:D"],
};

export default level;
