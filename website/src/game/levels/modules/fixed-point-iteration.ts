import type { GameEvent, LevelModule, Move } from "../../types";
import { fixedPointIterationMeta } from "../meta/fixed-point-iteration";

type FPState = {
  n: number;
  x: number;
  history: { x: number; y: number }[];
  lastStep: number;
  stopped: boolean;
};

const Q = 0.6736;
const EPS = 1e-3;
/** The page's Dottie number: the unique fixed point of cos. */
const DOTTIE = 0.7390851332151607;
/** |x₁ − x₀| for x₀ = 1 on x ← cos x, the page's 0.4597. */
const FIRST_STEP = Math.abs(Math.cos(1) - 1);
/** Batch stops: the first five-cycle check, then the two late checks around the trap. */
const CHECKS = [5, 10, 15, 17, 19];

function bound(n: number): number {
  return (Math.pow(Q, n) / (1 - Q)) * FIRST_STEP;
}

function fmt(value: number): string {
  return value.toFixed(6);
}

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

function fmtSmall(value: number): string {
  if (value === 0) return "0";
  const [mantissa, exponent] = value.toExponential(2).split("e");
  const sign = exponent.startsWith("-") ? "⁻" : "";
  const digits = exponent
    .replace(/[+-]/g, "")
    .split("")
    .map((digit) => SUPERSCRIPT[digit] ?? digit)
    .join("");
  return `${mantissa}×10${sign}${digits}`;
}

function nextCheck(n: number): number | undefined {
  return CHECKS.find((check) => check > n);
}

function initialState(): FPState {
  return {
    n: 0,
    x: 1,
    history: [{ x: 0, y: 1 }],
    lastStep: 0,
    stopped: false,
  };
}

type Step = { n: number; x: number; step: number; bound: number };

/** Apply cycles until n reaches target, appending every cobweb point. */
function advance(state: FPState, target: number): { state: FPState; steps: Step[] } {
  let n = state.n;
  let x = state.x;
  const history = [...state.history];
  const steps: Step[] = [];

  while (n < target) {
    const next = Math.cos(x);
    n += 1;
    const step = Math.abs(next - x);
    x = next;
    history.push({ x: n, y: x });
    steps.push({ n, x, step, bound: bound(n) });
  }

  return {
    state: {
      ...state,
      n,
      x,
      history,
      lastStep: steps.length > 0 ? steps[steps.length - 1].step : state.lastStep,
    },
    steps,
  };
}

function stepEvents(steps: Step[]): GameEvent[] {
  return steps.map((entry, index) => {
    const ready = entry.bound <= EPS;
    const atCheck = steps.length > 1 && index === steps.length - 1;
    const lead = atCheck ? `Check n = ${entry.n}` : `n = ${entry.n}`;
    let text = `${lead}: x = ${fmt(entry.x)}; step ${fmt(entry.step)}; bound ${fmt(entry.bound)} ${ready ? "≤" : ">"} 0.001.`;

    if (ready && entry.n === 19) {
      text += " The certificate is ready; stop to certify.";
    } else if (ready) {
      text += " The first certificate was at n = 19.";
    } else if (entry.step < EPS) {
      text += " A small step is not a small error.";
    }

    return { text, kind: ready && entry.n === 19 ? "good" : "info" };
  });
}

const level: LevelModule<FPState> = {
  meta: fixedPointIterationMeta,
  initial: initialState(),

  moves(state) {
    if (state.stopped) return [];

    const moves: Move[] = [
      { id: "iterate", label: "Step once: x ← cos x", placement: "tray" },
    ];
    const check = nextCheck(state.n);
    if (check !== undefined) {
      const cycles = check - state.n;
      moves.push({
        id: "run-check",
        label: `Run ${cycles} ${cycles === 1 ? "cycle" : "cycles"} to the next check`,
        placement: "tray",
      });
    }
    moves.push({ id: "stop", label: "Stop and certify", placement: "tray" });
    return moves;
  },

  apply(state, moveId) {
    if (state.stopped) {
      return { state, events: [], error: "The loop is already certified." };
    }

    if (moveId === "iterate") {
      const advanced = advance(state, state.n + 1);
      return { state: advanced.state, events: stepEvents(advanced.steps) };
    }

    if (moveId === "run-check") {
      const check = nextCheck(state.n);
      if (check === undefined) {
        return {
          state,
          events: [],
          error: `There is no later check; at n = ${state.n} step once or stop.`,
        };
      }
      const advanced = advance(state, check);
      return { state: advanced.state, events: stepEvents(advanced.steps) };
    }

    if (moveId === "stop") {
      const currentBound = bound(state.n);
      if (currentBound > EPS) {
        const stepNote =
          state.n === 0
            ? "No cycle has run."
            : state.lastStep < EPS
              ? `The last step was ${fmt(state.lastStep)}. A small step is not a small error.`
              : `The last step was ${fmt(state.lastStep)}; the tail still sums.`;
        return {
          state,
          events: [],
          error: `At n = ${state.n} the bound is ${fmt(currentBound)}, above 0.001. ${stepNote}`,
        };
      }

      const actualError = Math.abs(state.x - DOTTIE);
      return {
        state: { ...state, stopped: true },
        events: [
          {
            text: `Stopped at n = ${state.n}: bound ${fmt(currentBound)} ≤ 0.001; x = ${fmt(state.x)}; actual error ${fmtSmall(actualError)}.`,
            kind: "good",
          },
        ],
      };
    }

    return { state, events: [], error: "Unknown move." };
  },

  view(state) {
    const currentBound = bound(state.n);
    const ready = currentBound <= EPS;
    const check = nextCheck(state.n);
    const tail = state.stopped
      ? " · certified"
      : ready
        ? " · certificate ready"
        : check !== undefined
          ? ` · next check n = ${check}`
          : "";
    const stepText = state.n === 0 ? "step —" : `step ${fmt(state.lastStep)}`;

    return {
      kind: "number",
      value: state.x,
      target: DOTTIE,
      history: state.history,
      xLabel: "cycle n",
      yLabel: "xₙ",
      note: `q = 0.6736 · |x₁−x₀| = 0.4597 · ε = 0.001 · a priori bound ${fmt(currentBound)}`,
      caption: `n = ${state.n} · x = ${fmt(state.x)} · ${stepText} · bound ${fmt(currentBound)} ${
        ready ? "≤" : ">"
      } 0.001${tail}`,
    };
  },

  status(state) {
    return state.stopped && bound(state.n) <= EPS ? "won" : "playing";
  },

  score(state) {
    if (!state.stopped) {
      return { stars: 1, detail: `n = ${state.n}; bound ${fmt(bound(state.n))}.` };
    }
    const actualError = Math.abs(state.x - DOTTIE);
    if (state.n === 19) {
      return {
        stars: 3,
        detail: `n = 19: bound 0.000773, actual error ${fmtSmall(actualError)}.`,
      };
    }
    if (state.n <= 22) {
      return {
        stars: 2,
        detail: `n = ${state.n}: bound ${fmt(bound(state.n))}; the first certificate was n = 19.`,
      };
    }
    return {
      stars: 1,
      detail: `n = ${state.n}: bound ${fmt(bound(state.n))}; the first certificate was n = 19.`,
    };
  },

  solution: ["run-check", "run-check", "run-check", "run-check", "run-check", "stop"],
};

export default level;
