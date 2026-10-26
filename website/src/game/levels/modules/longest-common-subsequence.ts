import type { GameEvent, GridView, LevelModule, Move } from "../../types";
import { longestCommonSubsequenceMeta } from "../meta/longest-common-subsequence";

type StaircaseStep = { r: number; c: number; diag: boolean };

type LCSState = {
  r: number;
  c: number;
  path: StaircaseStep[];
  diagonals: number;
  thread: string;
  lost: boolean;
};

const A = "ABCBDAB";
const B = "BDCABA";
const ROWS = A.length + 1;
const COLS = B.length + 1;
const TARGET = 4;

function buildTable(): number[][] {
  const table = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  for (let i = 1; i < ROWS; i += 1) {
    for (let j = 1; j < COLS; j += 1) {
      table[i][j] =
        A[i - 1] === B[j - 1]
          ? table[i - 1][j - 1] + 1
          : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table;
}

/** H[r][c] is the most diagonals still reachable from (r,c) to the corner. */
function buildHeight(): number[][] {
  const table = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  for (let i = ROWS - 2; i >= 0; i -= 1) {
    for (let j = COLS - 2; j >= 0; j -= 1) {
      table[i][j] = Math.max(
        table[i + 1][j],
        table[i][j + 1],
        A[i] === B[j] ? table[i + 1][j + 1] + 1 : 0,
      );
    }
  }
  return table;
}

const L = buildTable();
const H = buildHeight();

function initialState(): LCSState {
  return {
    r: 0,
    c: 0,
    path: [{ r: 0, c: 0, diag: false }],
    diagonals: 0,
    thread: "",
    lost: false,
  };
}

function statusOf(state: LCSState): "playing" | "won" | "lost" {
  if (state.lost) return "lost";
  if (state.diagonals + H[state.r][state.c] < TARGET) return "lost";
  if (state.r === A.length && state.c === B.length) return "won";
  return "playing";
}

const level: LevelModule<LCSState> = {
  meta: longestCommonSubsequenceMeta,
  initial: initialState(),

  moves(state) {
    if (statusOf(state) !== "playing") return [];

    const moves: Move[] = [];
    if (state.r < A.length) {
      moves.push({ id: "step:down", label: `Step down to (${state.r + 1},${state.c})` });
    }
    if (state.c < B.length) {
      moves.push({ id: "step:right", label: `Step right to (${state.r},${state.c + 1})` });
    }
    if (state.r < A.length && state.c < B.length) {
      moves.push({
        id: "step:diag",
        label: `Step diagonal to (${state.r + 1},${state.c + 1})`,
      });
    }
    return moves;
  },

  apply(state, moveId) {
    const directions: Record<string, { dr: number; dc: number; diag: boolean }> = {
      "step:down": { dr: 1, dc: 0, diag: false },
      "step:right": { dr: 0, dc: 1, diag: false },
      "step:diag": { dr: 1, dc: 1, diag: true },
    };
    const step = directions[moveId];
    if (!step) return { state, events: [], error: "Unknown step." };

    const nr = state.r + step.dr;
    const nc = state.c + step.dc;
    if (nr > A.length || nc > B.length) {
      return {
        state,
        events: [],
        error: `A step from (${state.r},${state.c}) leaves the ${ROWS}×${COLS} grid.`,
      };
    }

    if (step.diag && A[state.r] !== B[state.c]) {
      return {
        state,
        events: [],
        error: `${A[state.r]} at row ${state.r + 1} and ${B[state.c]} at column ${
          state.c + 1
        } differ; a diagonal only takes a matching pair.`,
      };
    }

    const nextState: LCSState = {
      r: nr,
      c: nc,
      path: [...state.path, { r: nr, c: nc, diag: step.diag }],
      diagonals: state.diagonals + (step.diag ? 1 : 0),
      thread: state.thread + (step.diag ? A[state.r] : ""),
      lost: false,
    };

    const events: GameEvent[] = [];
    if (step.diag) {
      events.push({
        text: `Diagonal to (${nr},${nc}) matches ${A[state.r]} (row ${state.r + 1}, column ${
          state.c + 1
        }). Thread: ${nextState.thread}.`,
        kind: "good",
      });
    } else {
      events.push({
        text: `${step.dr === 1 ? "Down" : "Right"} to (${nr},${nc}) skips ${
          step.dr === 1 ? `${A[state.r]} (row ${state.r + 1})` : `${B[state.c]} (column ${state.c + 1})`
        }. Thread: ${nextState.thread === "" ? "—" : nextState.thread}.`,
        kind: "info",
      });
    }

    const reachable = nextState.diagonals + H[nr][nc];
    if (reachable < TARGET) {
      nextState.lost = true;
      events.push({
        text:
          nr === A.length && nc === B.length
            ? `The corner is (${A.length},${B.length}), but the staircase carries ${
                nextState.diagonals
              } diagonals; the corner cell reads ${L[A.length][B.length]}. This thread is not longest.`
            : `The best thread from (${nr},${nc}) is ${H[nr][nc]}; with ${
                nextState.diagonals
              } diagonals the reachable height is ${reachable}, below 4. The skipped match cannot be recovered.`,
        kind: "bad",
      });
    } else if (nr === A.length && nc === B.length) {
      events.push({
        text: `Corner (${A.length},${B.length}). Thread ${nextState.thread}; ${
          nextState.diagonals
        } diagonals; cell L(${A.length},${B.length}) = ${L[A.length][B.length]}.`,
        kind: "good",
      });
    }

    return { state: nextState, events };
  },

  view(state) {
    const status = statusOf(state);
    const closed = status !== "playing";
    const cells: GridView["cells"] = [];

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        let moveId: string | undefined;
        if (!closed) {
          if (r === state.r + 1 && c === state.c && state.r < A.length) moveId = "step:down";
          else if (r === state.r && c === state.c + 1 && state.c < B.length) moveId = "step:right";
          else if (
            r === state.r + 1 &&
            c === state.c + 1 &&
            state.r < A.length &&
            state.c < B.length
          ) {
            moveId = "step:diag";
          }
        }

        const onPath = state.path.some((entry) => entry.r === r && entry.c === c);
        let cellState: "target" | "done" | "active" | "idle" = "idle";
        if (r === state.r && c === state.c) cellState = "target";
        else if (onPath) cellState = "done";
        else if (moveId) cellState = "active";

        const hint =
          moveId === "step:down"
            ? " Step down."
            : moveId === "step:right"
              ? " Step right."
              : moveId === "step:diag"
                ? " Step diagonal."
                : "";

        cells.push({
          r,
          c,
          value: L[r][c],
          state: cellState,
          moveId,
          aria: `Row ${r}, column ${c}: ${L[r][c]}${
            r === state.r && c === state.c ? ", current cell" : onPath ? ", on the staircase" : ""
          }.${hint}`,
        });
      }
    }

    return {
      kind: "grid",
      rows: ROWS,
      cols: COLS,
      cells,
      rowLabels: ["", ...A.split("")],
      colLabels: ["", ...B.split("")],
      caption:
        status === "won"
          ? `Corner (${A.length},${B.length}) · Diagonals ${state.diagonals} · Thread ${state.thread} · L(${A.length},${B.length}) = ${L[A.length][B.length]}`
          : `Cell (${state.r},${state.c}) · Diagonals ${state.diagonals} · Thread ${
              state.thread === "" ? "—" : state.thread
            } · Reachable ${state.diagonals + H[state.r][state.c]} / 4`,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") {
      return { stars: 1, detail: "The staircase has not reached the corner with four diagonals." };
    }
    if (state.thread === "BCAB") {
      return { stars: 3, detail: "Four diagonals: B C A B. Corner cell L(7,6) = 4." };
    }
    return {
      stars: 2,
      detail: `Four diagonals: ${state.thread.split("").join(" ")}. The canonical trace spells BCAB.`,
    };
  },

  solution: [
    "step:down",
    "step:diag",
    "step:right",
    "step:diag",
    "step:down",
    "step:down",
    "step:diag",
    "step:diag",
    "step:right",
  ],
};

export default level;
