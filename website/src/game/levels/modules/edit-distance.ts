import type { GameEvent, LevelModule, Move } from "../../types";
import { editDistanceMeta } from "../meta/edit-distance";

type EDState = {
  r: number;
  c: number;
  paid: number;
  trail: { r: number; c: number }[];
  deletes: number;
  inserts: number;
  matches: number;
  substitutions: number;
};

type Pred = { r: number; c: number; id: string; kind: "up" | "left" | "diag" };

const A = "emotions";
const B = "demotion";
const M = A.length;
const N = B.length;
const BUDGET = 2;

function buildDistance(): number[][] {
  const table = Array.from({ length: M + 1 }, () => Array<number>(N + 1).fill(0));
  for (let i = 0; i <= M; i += 1) table[i][0] = i;
  for (let j = 0; j <= N; j += 1) table[0][j] = j;

  for (let i = 1; i <= M; i += 1) {
    for (let j = 1; j <= N; j += 1) {
      table[i][j] = Math.min(
        table[i - 1][j] + 1,
        table[i][j - 1] + 1,
        table[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1),
      );
    }
  }
  return table;
}

const DIST = buildDistance();

function scriptOf(state: EDState): string {
  const parts = [
    `${state.deletes} delete${state.deletes === 1 ? "" : "s"}`,
    `${state.inserts} insert${state.inserts === 1 ? "" : "s"}`,
    `${state.matches} match${state.matches === 1 ? "" : "es"}`,
  ];
  if (state.substitutions > 0) {
    parts.push(`${state.substitutions} substitution${state.substitutions === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function statusOf(state: EDState): "playing" | "won" {
  return state.r === 0 && state.c === 0 ? "won" : "playing";
}

function predecessors(state: EDState): Pred[] {
  const out: Pred[] = [];
  if (state.r > 0) {
    out.push({ r: state.r - 1, c: state.c, id: `to:${state.r - 1}:${state.c}`, kind: "up" });
  }
  if (state.c > 0) {
    out.push({ r: state.r, c: state.c - 1, id: `to:${state.r}:${state.c - 1}`, kind: "left" });
  }
  if (state.r > 0 && state.c > 0) {
    out.push({
      r: state.r - 1,
      c: state.c - 1,
      id: `to:${state.r - 1}:${state.c - 1}`,
      kind: "diag",
    });
  }
  return out;
}

function initialState(): EDState {
  return {
    r: M,
    c: N,
    paid: 0,
    trail: [{ r: M, c: N }],
    deletes: 0,
    inserts: 0,
    matches: 0,
    substitutions: 0,
  };
}

const level: LevelModule<EDState> = {
  meta: editDistanceMeta,
  initial: initialState(),

  moves(state) {
    if (statusOf(state) !== "playing") return [];

    return predecessors(state).map<Move>((pred) => {
      if (pred.kind === "up") {
        return { id: pred.id, label: `Delete ${A[state.r - 1]} (cost 1)` };
      }
      if (pred.kind === "left") {
        return { id: pred.id, label: `Insert ${B[state.c - 1]} (cost 1)` };
      }
      const same = A[state.r - 1] === B[state.c - 1];
      return {
        id: pred.id,
        label: same
          ? `Match ${A[state.r - 1]}–${B[state.c - 1]} (cost 0)`
          : `Substitute ${A[state.r - 1]}→${B[state.c - 1]} (cost 1)`,
      };
    });
  },

  apply(state, moveId) {
    const parts = moveId.split(":");
    if (parts.length !== 3 || parts[0] !== "to") {
      return { state, events: [], error: "Unknown move." };
    }

    const r = Number(parts[1]);
    const c = Number(parts[2]);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r > M || c < 0 || c > N) {
      return { state, events: [], error: `Cell (${r},${c}) is outside the 9×9 table.` };
    }

    const dr = r - state.r;
    const dc = c - state.c;
    let kind: "up" | "left" | "diag";
    if (dr === -1 && dc === 0) kind = "up";
    else if (dr === 0 && dc === -1) kind = "left";
    else if (dr === -1 && dc === -1) kind = "diag";
    else {
      return {
        state,
        events: [],
        error: `Cell (${r},${c}) is not one of the three predecessors of (${state.r},${state.c}).`,
      };
    }

    const predDistance = DIST[r][c];
    const upChar = A[state.r - 1];
    const leftChar = B[state.c - 1];
    const diagonalA = A[state.r - 1];
    const diagonalB = B[state.c - 1];
    const same = diagonalA === diagonalB;
    const stepCost = kind === "diag" && same ? 0 : 1;
    const total = state.paid + stepCost + predDistance;

    if (total > BUDGET) {
      let error: string;
      if (kind === "up") {
        error = `Cell (${r},${c}) reads ${predDistance}. The delete pays 1, so the walk would cost ${total}; the budget is ${BUDGET}.`;
      } else if (kind === "left") {
        error = `Cell (${r},${c}) reads ${predDistance}. The insert pays 1, so the walk would cost ${total}; the budget is ${BUDGET}.`;
      } else if (!same) {
        error = `${diagonalA} and ${diagonalB} differ, so the diagonal is a substitution and pays 1. Cell (${r},${c}) reads ${predDistance}, so the walk would cost ${total}; the budget is ${BUDGET}.`;
      } else {
        error = `Cell (${r},${c}) reads ${predDistance}. The match is free, but ${state.paid} is already paid, so the walk would cost ${total}; the budget is ${BUDGET}.`;
      }
      return { state, events: [], error };
    }

    const paid = state.paid + stepCost;
    const events: GameEvent[] = [];

    if (kind === "up") {
      events.push({
        text: `Delete ${upChar}: up to (${r},${c}), which reads ${predDistance}. Paid ${paid} / ${BUDGET}.`,
        kind: "info",
      });
    } else if (kind === "left") {
      events.push({
        text: `Insert ${leftChar}: left to (${r},${c}), which reads ${predDistance}. Paid ${paid} / ${BUDGET}.`,
        kind: "info",
      });
    } else if (same) {
      events.push({
        text: `Match ${diagonalA}–${diagonalB}: free diagonal to (${r},${c}), which reads ${predDistance}. Paid ${paid} / ${BUDGET}.`,
        kind: "info",
      });
    } else {
      events.push({
        text: `Substitute ${diagonalA}→${diagonalB}: 1. Diagonal to (${r},${c}), which reads ${predDistance}. Paid ${paid} / ${BUDGET}.`,
        kind: "info",
      });
    }

    const next: EDState = {
      r,
      c,
      paid,
      trail: [...state.trail, { r, c }],
      deletes: state.deletes + (kind === "up" ? 1 : 0),
      inserts: state.inserts + (kind === "left" ? 1 : 0),
      matches: state.matches + (kind === "diag" && same ? 1 : 0),
      substitutions: state.substitutions + (kind === "diag" && !same ? 1 : 0),
    };

    if (next.r === 0 && next.c === 0) {
      events.push({
        text: `Cell (0,0) reads 0. Script: ${scriptOf(next)}.`,
        kind: "good",
      });
    }

    return { state: next, events };
  },

  view(state) {
    const preds = predecessors(state);
    const predKeys = new Set(preds.map((pred) => `${pred.r}:${pred.c}`));
    const predAria = new Map<string, string>();
    for (const pred of preds) {
      const key = `${pred.r}:${pred.c}`;
      if (pred.kind === "up") {
        predAria.set(
          key,
          `Cell (${pred.r},${pred.c}) reads ${DIST[pred.r][pred.c]}. Delete ${A[state.r - 1]}, cost 1.`,
        );
      } else if (pred.kind === "left") {
        predAria.set(
          key,
          `Cell (${pred.r},${pred.c}) reads ${DIST[pred.r][pred.c]}. Insert ${B[state.c - 1]}, cost 1.`,
        );
      } else {
        const same = A[state.r - 1] === B[state.c - 1];
        predAria.set(
          key,
          `Cell (${pred.r},${pred.c}) reads ${DIST[pred.r][pred.c]}. ${
            same
              ? `Match ${A[state.r - 1]}–${B[state.c - 1]}, cost 0`
              : `Substitute ${A[state.r - 1]}→${B[state.c - 1]}, cost 1`
          }.`,
        );
      }
    }
    const trailKeys = new Set(state.trail.map((cell) => `${cell.r}:${cell.c}`));
    const cells: {
      r: number;
      c: number;
      value: number;
      state?: "idle" | "active" | "done" | "target";
      moveId?: string;
      aria?: string;
    }[] = [];

    for (let r = 0; r <= M; r += 1) {
      for (let c = 0; c <= N; c += 1) {
        const key = `${r}:${c}`;
        const isCurrent = r === state.r && c === state.c;
        const isPred = predKeys.has(key);
        const isTrail = trailKeys.has(key);
        const cellState = isCurrent
          ? ("target" as const)
          : isPred
            ? ("active" as const)
            : isTrail
              ? ("done" as const)
              : ("idle" as const);

        cells.push({
          r,
          c,
          value: DIST[r][c],
          state: cellState,
          moveId: isPred ? `to:${r}:${c}` : undefined,
          aria: isCurrent
            ? `Cell (${r},${c}) reads ${DIST[r][c]}. Current cell.`
            : isPred
              ? predAria.get(key)
              : isTrail
                ? `Cell (${r},${c}) reads ${DIST[r][c]}. On the walk.`
                : `Cell (${r},${c}) reads ${DIST[r][c]}.`,
        });
      }
    }

    return {
      kind: "grid",
      rows: M + 1,
      cols: N + 1,
      rowLabels: ["ε", "e", "m", "o", "t", "i", "o", "n", "s"],
      colLabels: ["ε", "d", "e", "m", "o", "t", "i", "o", "n"],
      cells,
      caption: `Cost: ${state.paid} / ${BUDGET} · Cell (${state.r},${state.c}) reads ${DIST[state.r][state.c]} · Script: ${scriptOf(state)}`,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") {
      return {
        stars: 1,
        detail: `Cell (${state.r},${state.c}) reads ${DIST[state.r][state.c]}; ${state.paid} of ${BUDGET} is paid.`,
      };
    }
    return {
      stars: 3,
      detail: "Nine steps back: the script is insert d, seven matches, delete s. The corner reads 0.",
    };
  },

  solution: [
    "to:7:8",
    "to:6:7",
    "to:5:6",
    "to:4:5",
    "to:3:4",
    "to:2:3",
    "to:1:2",
    "to:0:1",
    "to:0:0",
  ],
};

export default level;
