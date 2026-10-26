import type { FormulaView, GameEvent, LevelModule, Move } from "../../types";
import { karatsubaMultiplicationMeta } from "../meta/karatsuba-multiplication";

type State = {
  bought: string[];
  route: string | null;
  assembled: boolean;
  misroutes: number;
};

type Candidate = {
  id: string;
  label: string;
  expr: string;
  nums: string;
  value: number;
  trap?: boolean;
};

type Route = {
  id: string;
  label: string;
  formula: string;
  value: number;
  correct: boolean;
};

const CANDIDATES: Candidate[] = [
  { id: "z2", label: "z₂", expr: "a₁b₁", nums: "12 × 56", value: 672 },
  { id: "z0", label: "z₀", expr: "a₀b₀", nums: "34 × 78", value: 2652 },
  { id: "m", label: "m", expr: "(a₁+a₀)(b₁+b₀)", nums: "46 × 134", value: 6164 },
  { id: "x1", label: "a₁b₀", expr: "a₁b₀", nums: "12 × 78", value: 936, trap: true },
  { id: "x0", label: "a₀b₁", expr: "a₀b₁", nums: "34 × 56", value: 1904, trap: true },
];

const ROUTES: Route[] = [
  {
    id: "middle",
    label: "A",
    formula: "z₁ = m − z₂ − z₀ = 6,164 − 672 − 2,652 = 2,840",
    value: 2840,
    correct: true,
  },
  { id: "raw", label: "B", formula: "z₁ = m = 6,164", value: 6164, correct: false },
  { id: "half", label: "C", formula: "z₁ = m − z₂ = 5,492", value: 5492, correct: false },
  { id: "sum", label: "D", formula: "z₁ = z₂ + z₀ = 3,324", value: 3324, correct: false },
];

const B2 = 672 * 10000;
const B0 = 2652;
const PRODUCT = 7006652;

function fmt(n: number): string {
  const digits = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `−${digits}` : digits;
}

function hasThree(state: State): boolean {
  return ["z2", "z0", "m"].every((id) => state.bought.includes(id));
}

function isWon(state: State): boolean {
  return hasThree(state) && state.assembled && state.route === "middle";
}

function routeValue(route: string | null): number | null {
  const found = ROUTES.find((entry) => entry.id === route);
  return found ? found.value : null;
}

function initialState(): State {
  return { bought: [], route: null, assembled: false, misroutes: 0 };
}

const level: LevelModule<State> = {
  meta: karatsubaMultiplicationMeta,
  initial: initialState(),

  moves(state) {
    if (isWon(state)) return [];

    if (state.bought.length < 3) {
      return CANDIDATES.filter((candidate) => !state.bought.includes(candidate.id)).map<Move>(
        (candidate) => ({
          id: `buy:${candidate.id}`,
          label: `Buy ${candidate.label}`,
        }),
      );
    }

    const moves: Move[] = ROUTES.filter((route) => route.id !== state.route).map<Move>((route) => ({
      id: `route:${route.id}`,
      label: `Route z₁ (${route.label})`,
    }));
    if (state.route !== null) moves.push({ id: "assemble", label: "Assemble the product" });
    return moves;
  },

  apply(state, moveId) {
    if (moveId.startsWith("buy:")) {
      const candidate = CANDIDATES.find((entry) => entry.id === moveId.slice("buy:".length));
      if (!candidate) return { state, events: [], error: "Unknown ledger entry." };
      if (state.bought.includes(candidate.id)) {
        return { state, events: [], error: `${candidate.label} is already on the ledger.` };
      }
      if (state.bought.length >= 3) {
        return { state, events: [], error: "Three product slots are full; route the middle measurement." };
      }
      if (candidate.trap) {
        return {
          state,
          events: [],
          error: `${candidate.label} = ${fmt(candidate.value)} is a schoolbook cross product. m = 46 × 134 already carries 936 + 1,904; buying it separately would make four products, not three.`,
        };
      }

      const bought = [...state.bought, candidate.id];
      const events: GameEvent[] = [
        {
          text: `Bought ${candidate.label} = ${candidate.nums} = ${fmt(candidate.value)}. Products ${bought.length} / 3.`,
          kind: "info",
        },
      ];
      if (bought.length === 3) {
        events.push({ text: "Three products, one split. Depth 2 holds 3 × 3 = 9 leaves.", kind: "info" });
      }
      return { state: { ...state, bought }, events };
    }

    if (moveId.startsWith("route:")) {
      const route = ROUTES.find((entry) => entry.id === moveId.slice("route:".length));
      if (!route) return { state, events: [], error: "Unknown route." };
      if (!hasThree(state)) {
        return { state, events: [], error: "The three measurements are not on the ledger yet." };
      }
      if (state.route === route.id) {
        return { state, events: [{ text: "z₁ is already routed this way.", kind: "info" }] };
      }

      const text = route.correct
        ? "Routed z₁ = 6,164 − 672 − 2,652 = 2,840. The cross terms 936 + 1,904 are recovered by subtraction."
        : route.id === "raw"
          ? "Routed z₁ = 6,164. The B coefficient still carries z₂ = 672 and z₀ = 2,652."
          : route.id === "half"
            ? "Routed z₁ = 5,492. The B coefficient still carries z₀ = 2,652."
            : "Routed z₁ = 3,324. The B coefficient carries z₂ + z₀; m is absent.";

      return {
        state: {
          ...state,
          route: route.id,
          misroutes: state.misroutes + (route.correct ? 0 : 1),
        },
        events: [{ text, kind: route.correct ? "good" : "info" }],
      };
    }

    if (moveId === "assemble") {
      if (state.route === null) {
        return { state, events: [], error: "z₁ is not routed; the middle coefficient has no value." };
      }
      if (state.route !== "middle") {
        const route = ROUTES.find((entry) => entry.id === state.route);
        const value = route ? route.value : 0;
        const total = B2 + value * 100 + B0;
        const residue = total - PRODUCT;
        const why =
          state.route === "raw"
            ? "z₂ and z₀ are still inside m."
            : state.route === "half"
              ? "z₀ is still inside m − z₂."
              : "m is absent; z₂ + z₀ is not the cross-term sum.";
        return {
          state,
          events: [],
          error: `The B coefficient reads ${fmt(value)}; the ledger totals ${fmt(total)}, ${fmt(residue)} above 7,006,652. ${why}`,
        };
      }

      return {
        state: { ...state, assembled: true },
        events: [{ text: "672·100² + 2,840·100 + 2,652 = 7,006,652.", kind: "good" }],
      };
    }

    return { state, events: [], error: "Unknown move." };
  },

  view(state) {
    const routesUnlocked = hasThree(state);
    const shown = routesUnlocked
      ? CANDIDATES.filter((candidate) => state.bought.includes(candidate.id))
      : CANDIDATES;
    const rows: FormulaView["rows"] = shown.map((candidate) => {
      const isBought = state.bought.includes(candidate.id);
      let rowState: "idle" | "active" | "done" = "idle";
      let moveId: string | undefined;

      if (isBought) {
        rowState = "done";
      } else if (!routesUnlocked) {
        rowState = "active";
        moveId = `buy:${candidate.id}`;
      }

      return {
        id: candidate.id,
        label: candidate.label,
        formula: `${candidate.expr} = ${candidate.nums} = ${isBought ? fmt(candidate.value) : "?"}`,
        state: rowState,
        moveId,
      };
    });

    if (routesUnlocked) {
      rows.push({
        id: "leaves",
        label: "depth 2",
        formula: "3 products per split → 3 × 3 = 9 leaves",
        state: "done",
      });

      for (const route of ROUTES) {
        const selected = state.route === route.id;
        rows.push({
          id: `route-${route.id}`,
          label: route.label,
          formula: route.formula,
          state: state.assembled
            ? route.correct
              ? "target"
              : "done"
            : selected
              ? route.correct
                ? "target"
                : "bad"
              : "active",
          moveId: state.assembled || selected ? undefined : `route:${route.id}`,
        });
      }
    }

    const z1 = routeValue(state.route);
    const b1 = z1 === null ? null : z1 * 100;
    const total = b1 === null ? null : B2 + b1 + B0;
    const residue = total === null ? 0 : total - PRODUCT;

    const outputs: FormulaView["outputs"] = [
      {
        id: "b2",
        label: "B² coefficient",
        formula: state.bought.includes("z2") ? "z₂ = 672 → 6,720,000" : "z₂ = ?",
        state: state.bought.includes("z2") ? "done" : "idle",
      },
      {
        id: "b1",
        label: "B coefficient",
        formula: z1 === null ? "z₁ not routed" : `z₁ = ${fmt(z1)} → ${fmt(z1 * 100)}`,
        state: z1 === null ? "idle" : state.route === "middle" ? "target" : "bad",
      },
      {
        id: "b0",
        label: "1 coefficient",
        formula: state.bought.includes("z0") ? "z₀ = 2,652" : "z₀ = ?",
        state: state.bought.includes("z0") ? "done" : "idle",
      },
      {
        id: "product",
        label: state.route === null || state.assembled ? "Product" : "Product · commit",
        formula:
          total === null
            ? "not assembled"
            : `${fmt(B2)} + ${fmt(b1 ?? 0)} + ${fmt(B0)} = ${fmt(total)}${
                residue === 0 ? "" : ` · residue ${residue > 0 ? "+" : ""}${fmt(residue)}`
              }`,
        state: state.assembled
          ? "target"
          : state.route === null
            ? "idle"
            : state.route === "middle"
              ? "active"
              : "bad",
        moveId: state.route !== null && !state.assembled ? "assemble" : undefined,
      },
    ];

    return {
      kind: "formula",
      caption: `Products: ${state.bought.length} / 3 · Depth-2 leaves: ${
        routesUnlocked ? "9" : "—"
      } · Product: ${state.assembled ? "7,006,652" : "open"}`,
      rows,
      outputs,
    };
  },

  status(state) {
    return isWon(state) ? "won" : "playing";
  },

  score(state) {
    if (!isWon(state)) return { stars: 1, detail: "The ledger is not assembled." };
    if (state.misroutes === 0) {
      return { stars: 3, detail: "Three products, one route, 7,006,652; depth 2 holds 9 leaves." };
    }
    if (state.misroutes <= 2) {
      return {
        stars: 2,
        detail: `The middle was routed ${state.misroutes + 1} ways; the product is exact.`,
      };
    }
    return {
      stars: 1,
      detail: `The middle was routed ${state.misroutes + 1} ways; a clean route is one.`,
    };
  },

  solution: ["buy:z2", "buy:z0", "buy:m", "route:middle", "assemble"],
};

export default level;
