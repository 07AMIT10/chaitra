import type { FormulaView, GameEvent, LevelModule, Move } from "../../types";
import { strassenMatrixMultiplicationMeta } from "../meta/strassen-matrix-multiplication";

type Sign = 1 | -1;

type Term = {
  id: string;
  sign: Sign;
};

type State = {
  bought: string[];
  selected: string | null;
  placements: Record<string, Term[]>;
  wasted: number;
};

type Candidate = {
  id: string;
  label: string;
  expr: string;
  nums: string;
  value: number;
  trap?: boolean;
};

const CANDIDATES: Candidate[] = [
  { id: "m1", label: "M₁", expr: "(a₁₁+a₂₂)(b₁₁+b₂₂)", nums: "(1+4)(5+8) = 5×13", value: 65 },
  { id: "m2", label: "M₂", expr: "(a₂₁+a₂₂)b₁₁", nums: "(3+4)×5 = 7×5", value: 35 },
  { id: "m3", label: "M₃", expr: "a₁₁(b₁₂−b₂₂)", nums: "1×(6−8) = 1×(−2)", value: -2 },
  { id: "m4", label: "M₄", expr: "a₂₂(b₂₁−b₁₁)", nums: "4×(7−5) = 4×2", value: 8 },
  { id: "m5", label: "M₅", expr: "(a₁₁+a₁₂)b₂₂", nums: "(1+2)×8 = 3×8", value: 24 },
  { id: "m6", label: "M₆", expr: "(a₂₁−a₁₁)(b₁₁+b₁₂)", nums: "(3−1)(5+6) = 2×11", value: 22 },
  { id: "m7", label: "M₇", expr: "(a₁₂−a₂₂)(b₂₁+b₂₂)", nums: "(2−4)(7+8) = (−2)×15", value: -30 },
  { id: "w1", label: "a₁₁b₁₁", expr: "a₁₁b₁₁", nums: "1×5", value: 5, trap: true },
  { id: "w2", label: "a₂₂b₂₂", expr: "a₂₂b₂₂", nums: "4×8", value: 32, trap: true },
];

const OUTS = [
  { id: "c11", label: "c₁₁", target: 19 },
  { id: "c12", label: "c₁₂", target: 22 },
  { id: "c21", label: "c₂₁", target: 43 },
  { id: "c22", label: "c₂₂", target: 50 },
] as const;

const LABEL: Record<string, string> = {
  m1: "M₁",
  m2: "M₂",
  m3: "M₃",
  m4: "M₄",
  m5: "M₅",
  m6: "M₆",
  m7: "M₇",
  w1: "a₁₁b₁₁",
  w2: "a₂₂b₂₂",
};

const VALUE: Record<string, number> = {
  m1: 65,
  m2: 35,
  m3: -2,
  m4: 8,
  m5: 24,
  m6: 22,
  m7: -30,
  w1: 5,
  w2: 32,
};

const CORRECT = ["m1", "m2", "m3", "m4", "m5", "m6", "m7"];

function fmt(n: number): string {
  const digits = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `−${digits}` : digits;
}

function termsOf(state: State, out: string): Term[] {
  return state.placements[out] ?? [];
}

function sumTerms(terms: Term[]): number {
  return terms.reduce((sum, term) => sum + term.sign * VALUE[term.id], 0);
}

function termsCount(state: State): number {
  return OUTS.reduce((sum, out) => sum + termsOf(state, out.id).length, 0);
}

function isWon(state: State): boolean {
  if (state.bought.length !== 7) return false;
  if (!CORRECT.every((id) => state.bought.includes(id))) return false;
  return OUTS.every((out) => sumTerms(termsOf(state, out.id)) === out.target);
}

function winText(state: State): string {
  return `C = [[19,22],[43,50]] from seven products and ${termsCount(state)} signed entries.`;
}

function initialState(): State {
  return {
    bought: [],
    selected: null,
    placements: { c11: [], c12: [], c21: [], c22: [] },
    wasted: 0,
  };
}

const level: LevelModule<State> = {
  meta: strassenMatrixMultiplicationMeta,
  initial: initialState(),

  moves(state) {
    if (isWon(state)) return [];

    const moves: Move[] = [];
    for (const candidate of CANDIDATES) {
      if (state.bought.includes(candidate.id)) {
        if (state.selected !== candidate.id) {
          moves.push({ id: `select:${candidate.id}`, label: `Select ${candidate.label}` });
        }
      } else if (state.bought.length < 7) {
        moves.push({ id: `buy:${candidate.id}`, label: `Buy ${candidate.label}` });
      }
    }

    if (state.selected !== null) {
      for (const out of OUTS) {
        moves.push({ id: `place:${out.id}:+`, label: `${out.label} +`, placement: "tray" });
        moves.push({ id: `place:${out.id}:-`, label: `${out.label} −`, placement: "tray" });
      }
    }

    return moves;
  },

  apply(state, moveId) {
    if (moveId.startsWith("buy:")) {
      const candidate = CANDIDATES.find((entry) => entry.id === moveId.slice("buy:".length));
      if (!candidate) return { state, events: [], error: "Unknown measurement." };
      if (state.bought.includes(candidate.id)) {
        return { state, events: [], error: `${candidate.label} is already on the ledger.` };
      }
      if (state.bought.length >= 7) {
        return {
          state,
          events: [],
          error: "Seven product slots are full; the sign table is the next move.",
        };
      }
      if (candidate.trap) {
        return {
          state,
          events: [],
          error: `${candidate.label} = ${fmt(candidate.value)} is a single matrix entry, not a compound measurement. The seven rows are products of sums or differences; a single entry cannot carry the signs that cancel the cross terms.`,
        };
      }

      const bought = [...state.bought, candidate.id];
      const events: GameEvent[] = [
        {
          text: `${candidate.label} = ${candidate.nums} = ${fmt(candidate.value)}. Products ${bought.length} / 7.`,
          kind: "info",
        },
      ];
      const next: State = { ...state, bought, selected: candidate.id };
      if (isWon(next)) {
        events.push({ text: winText(next), kind: "good" });
      }
      return { state: next, events };
    }

    if (moveId.startsWith("select:")) {
      const id = moveId.slice("select:".length);
      if (!state.bought.includes(id)) {
        return { state, events: [], error: `${LABEL[id] ?? id} is not on the ledger.` };
      }
      return { state: { ...state, selected: id }, events: [] };
    }

    if (moveId.startsWith("place:")) {
      const [, outId, signText] = moveId.split(":");
      const out = OUTS.find((entry) => entry.id === outId);
      const sign: Sign | 0 = signText === "+" ? 1 : signText === "-" ? -1 : 0;
      if (!out || sign === 0) {
        return { state, events: [], error: "Unknown sign route." };
      }
      if (state.selected === null) {
        return { state, events: [], error: "No measurement is selected; select a bought row first." };
      }

      const selected = state.selected;
      if (!state.bought.includes(selected)) {
        return { state, events: [], error: `${LABEL[selected] ?? selected} is not on the ledger.` };
      }

      const current = termsOf(state, out.id);
      const before = sumTerms(current);
      const wasExact = before === out.target;
      const existing = current.find((term) => term.id === selected);
      let nextTerms: Term[];
      if (existing) {
        nextTerms =
          existing.sign === sign
            ? current.filter((term) => term.id !== selected)
            : current.map((term) => (term.id === selected ? { ...term, sign } : term));
      } else {
        nextTerms = [...current, { id: selected, sign }];
      }

      const placements = { ...state.placements, [out.id]: nextTerms };
      const next: State = {
        ...state,
        placements,
        wasted: state.wasted + (existing ? 1 : 0),
      };
      const value = sumTerms(nextTerms);
      const contribution = sign * VALUE[selected];
      const events: GameEvent[] = [];

      if (existing) {
        events.push({
          text:
            existing.sign === sign
              ? `${LABEL[selected]} removed from ${out.label}. ${out.label} = ${fmt(value)}.`
              : `${LABEL[selected]} flipped to ${contribution >= 0 ? "+" : "−"}${fmt(
                  Math.abs(contribution),
                )} in ${out.label}. ${out.label} = ${fmt(value)}.`,
          kind: "info",
        });
      } else {
        events.push({
          text: `${LABEL[selected]} ${contribution >= 0 ? "+" : "−"}${fmt(
            Math.abs(contribution),
          )} into ${out.label}. ${out.label} = ${fmt(value)}.`,
          kind: "info",
        });
      }

      if (value === out.target) {
        events.push({ text: `${out.label} = ${fmt(out.target)}, exact.`, kind: "good" });
      } else {
        events.push({
          text: `${out.label} = ${fmt(value)}, residue ${
            value - out.target > 0 ? "+" : ""
          }${fmt(value - out.target)}.`,
          kind: wasExact ? "bad" : "info",
        });
      }

      if (isWon(next)) {
        events.push({ text: winText(next), kind: "good" });
      }
      return { state: next, events };
    }

    return { state, events: [], error: "Unknown move." };
  },

  view(state) {
    const complete = isWon(state);
    const shown =
      state.bought.length >= 7
        ? CANDIDATES.filter((candidate) => state.bought.includes(candidate.id))
        : CANDIDATES;
    const rows: FormulaView["rows"] = shown.map((candidate) => {
      const isBought = state.bought.includes(candidate.id);
      const isSelected = state.selected === candidate.id;
      const slotsFull = state.bought.length >= 7;
      let rowState: "idle" | "active" | "done" | "target" = "idle";
      let moveId: string | undefined;

      if (isBought) {
        rowState = isSelected ? "target" : "done";
        if (!isSelected && !complete) moveId = `select:${candidate.id}`;
      } else if (!slotsFull) {
        rowState = "active";
        moveId = `buy:${candidate.id}`;
      }

      const signs = OUTS.flatMap((out) => {
        const term = termsOf(state, out.id).find((entry) => entry.id === candidate.id);
        return term ? [`${out.label}${term.sign === 1 ? "+" : "−"}`] : [];
      });

      return {
        id: candidate.id,
        label: candidate.label,
        formula: `${candidate.expr} = ${candidate.nums} = ${fmt(candidate.value)}${
          isBought ? (signs.length > 0 ? ` → ${signs.join(" ")}` : " → —") : ""
        }`,
        state: rowState,
        moveId,
      };
    });

    const outputs: FormulaView["outputs"] = OUTS.map((out) => {
      const terms = termsOf(state, out.id);
      const value = sumTerms(terms);
      const residue = value - out.target;
      const expression =
        terms.length === 0
          ? "0"
          : terms
              .map((term, index) => {
                const label = LABEL[term.id] ?? term.id;
                if (index === 0) return term.sign > 0 ? label : `−${label}`;
                return `${term.sign > 0 ? " + " : " − "}${label}`;
              })
              .join("");
      const outputState: "idle" | "active" | "target" =
        terms.length === 0 ? "idle" : residue === 0 ? "target" : "active";

      return {
        id: out.id,
        label: `${out.label} · target ${out.target}`,
        formula: `${expression} = ${fmt(value)}${
          terms.length > 0 && residue !== 0
            ? ` · residue ${residue > 0 ? "+" : ""}${fmt(residue)}`
            : ""
        }`,
        state: outputState,
      };
    });

    const selected =
      state.selected === null ? "no measurement selected" : `${LABEL[state.selected]} selected`;
    const entries = termsCount(state);
    const exact = OUTS.filter(
      (out) => sumTerms(termsOf(state, out.id)) === out.target,
    ).length;

    return {
      kind: "formula",
      caption: `${selected} · Products: ${state.bought.length} / 7 · Sign entries: ${entries} · Exact: ${exact} / 4 · Clean run: 12`,
      rows,
      outputs,
    };
  },

  status(state) {
    return isWon(state) ? "won" : "playing";
  },

  score(state) {
    if (!isWon(state)) {
      return { stars: 1, detail: "C is not exact." };
    }
    const entries = termsCount(state);
    const cost = state.wasted + Math.max(0, entries - 12);
    if (cost === 0) {
      return {
        stars: 3,
        detail: `Seven products, ${entries} signed entries, C = [[19,22],[43,50]].`,
      };
    }
    if (cost <= 3) {
      return {
        stars: 2,
        detail: `C is exact with seven products after ${cost} correction${
          cost === 1 ? "" : "s"
        }.`,
      };
    }
    return {
      stars: 1,
      detail: `C is exact after ${cost} corrections; the clean table has 12 signed entries.`,
    };
  },

  solution: [
    "buy:m1",
    "place:c11:+",
    "place:c22:+",
    "buy:m2",
    "place:c21:+",
    "place:c22:-",
    "buy:m3",
    "place:c12:+",
    "place:c22:+",
    "buy:m4",
    "place:c11:+",
    "place:c21:+",
    "buy:m5",
    "place:c11:-",
    "place:c12:+",
    "buy:m6",
    "place:c22:+",
    "buy:m7",
    "place:c11:+",
  ],
};

export default level;
