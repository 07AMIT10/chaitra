import type { GameEvent, LevelModule, Move } from "../../types";
import { newtonMethodMeta } from "../meta/newton-method";

type StepKind = "full" | "half" | "bisect";

type NewtonState = {
  x: number;
  steps: number;
  history: { x: number; y: number }[];
  last: StepKind | null;
  /** The last meaningful quadratic ratio; machine precision keeps the limit. */
  ratio: number | null;
  fullSteps: number;
  lo: number;
  hi: number;
  stopped: boolean;
};

const SQRT2 = Math.SQRT2;
const TARGET_DIGITS = 12;
const MAX_STEPS = 4;

function errorOf(x: number): number {
  const direct = Math.abs(x - SQRT2);
  if (direct > 1e-15) return direct;
  // At machine precision the residual is the honest remaining error scale.
  return Math.abs(x * x - 2) / (2 * SQRT2);
}

function accuracyOf(x: number): number {
  return Math.min(20, -Math.log10(Math.max(errorOf(x), Number.EPSILON)));
}

function residualOf(x: number): number {
  return Math.abs(x * x - 2);
}

function fmtX(x: number): string {
  return x.toFixed(15).replace(/0+$/, "").replace(/\.$/, "");
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

function initialState(): NewtonState {
  return {
    x: 1.2,
    steps: 0,
    history: [{ x: 0, y: 1.2 }],
    last: null,
    ratio: null,
    fullSteps: 0,
    lo: 1.2,
    hi: 2,
    stopped: false,
  };
}

function nextValue(state: NewtonState, kind: StepKind): number {
  if (kind === "bisect") return (state.lo + state.hi) / 2;
  const newton = (state.x * state.x - 2) / (2 * state.x);
  return state.x - (kind === "half" ? 0.5 : 1) * newton;
}

function tighten(state: NewtonState, value: number): { lo: number; hi: number } {
  let lo = state.lo;
  let hi = state.hi;
  if (value * value < 2) lo = Math.max(lo, value);
  else hi = Math.min(hi, value);
  return { lo, hi };
}

const level: LevelModule<NewtonState> = {
  meta: newtonMethodMeta,
  initial: initialState(),

  moves(state) {
    if (state.stopped) return [];
    if (state.steps >= MAX_STEPS && accuracyOf(state.x) < TARGET_DIGITS) return [];

    const moves: Move[] = [];
    if (state.steps < MAX_STEPS) {
      moves.push(
        { id: "step:full", label: "Full tangent step", placement: "tray" },
        { id: "step:half", label: "Damped half-step", placement: "tray" },
        { id: "step:bisect", label: "Bisection step", placement: "tray" },
      );
    }
    moves.push({ id: "stop", label: "Stop and certify", placement: "tray" });
    return moves;
  },

  apply(state, moveId) {
    if (moveId === "stop") {
      if (state.stopped) {
        return { state, events: [], error: "The burn is already certified." };
      }
      const accuracy = accuracyOf(state.x);
      if (accuracy < TARGET_DIGITS) {
        return {
          state,
          events: [],
          error: `x = ${fmtX(state.x)} carries ${accuracy.toFixed(1)} digits; the thruster needs ${TARGET_DIGITS}. ${
            state.steps < MAX_STEPS
              ? `${MAX_STEPS - state.steps} firing${MAX_STEPS - state.steps === 1 ? "" : "s"} remain${MAX_STEPS - state.steps === 1 ? "s" : ""}.`
              : "The four firings are spent."
          }`,
        };
      }
      return {
        state: { ...state, stopped: true },
        events: [
          {
            text: `Stopped at x = ${fmtX(state.x)} after ${state.steps} firing${state.steps === 1 ? "" : "s"}: ${accuracy.toFixed(1)} digits, residual ${fmtSmall(residualOf(state.x))}. Twelve digits cleared.`,
            kind: "good",
          },
        ],
      };
    }

    if (!moveId.startsWith("step:")) {
      return { state, events: [], error: "Unknown move." };
    }
    if (state.stopped) {
      return { state, events: [], error: "The burn is already certified." };
    }
    if (state.steps >= MAX_STEPS) {
      return {
        state,
        events: [],
        error: "All four firings are spent. Stop and read the residual.",
      };
    }

    const kind = moveId.slice("step:".length) as StepKind;
    if (kind !== "full" && kind !== "half" && kind !== "bisect") {
      return { state, events: [], error: "Unknown firing." };
    }

    const previousError = errorOf(state.x);
    const value = nextValue(state, kind);
    const steps = state.steps + 1;
    const accuracy = accuracyOf(value);
    const residual = residualOf(value);
    const bracket = tighten(state, value);

    let ratio = state.ratio;
    const rawRatio = errorOf(value) / (previousError * previousError);
    if (errorOf(value) >= 1e-14 && Number.isFinite(rawRatio)) ratio = rawRatio;

    const events: GameEvent[] = [];
    if (kind === "full") {
      events.push({
        text: `Full tangent step ${steps}: x = ${fmtX(value)}; residual ${fmtSmall(residual)}; ${accuracy.toFixed(1)} digits.`,
        kind: "info",
      });
    } else if (kind === "half") {
      events.push({
        text: `Damped half-step ${steps}: x = ${fmtX(value)}; residual ${fmtSmall(residual)}; ${accuracy.toFixed(1)} digits. The error ratio stays near 0.5.`,
        kind: "info",
      });
    } else {
      events.push({
        text: `Bisection step ${steps}: x = ${fmtX(value)}; residual ${fmtSmall(residual)}; ${accuracy.toFixed(1)} digits. Bracket ${fmtX(bracket.lo)}–${fmtX(bracket.hi)}.`,
        kind: "info",
      });
    }

    if (steps >= MAX_STEPS && accuracy < TARGET_DIGITS) {
      events.push({
        text: `Four firings spent: ${accuracy.toFixed(1)} digits, residual ${fmtSmall(residual)}. The thruster needs ${TARGET_DIGITS}.`,
        kind: "bad",
      });
    } else if (accuracy >= TARGET_DIGITS) {
      events.push({
        text: `Twelve digits cleared at firing ${steps}. Stop to certify the burn.`,
        kind: "good",
      });
    }

    return {
      state: {
        ...state,
        x: value,
        steps,
        history: [...state.history, { x: steps, y: value }],
        last: kind,
        ratio,
        fullSteps: state.fullSteps + (kind === "full" ? 1 : 0),
        lo: bracket.lo,
        hi: bracket.hi,
      },
      events,
    };
  },

  view(state) {
    const accuracy = accuracyOf(state.x);
    const residual = residualOf(state.x);
    const ratioText = state.ratio === null ? "—" : state.ratio.toFixed(4);

    return {
      kind: "number",
      value: state.x,
      target: SQRT2,
      history: state.history,
      xLabel: "firing",
      yLabel: "xₙ",
      note: `Error ratio eₙ₊₁/eₙ² = ${ratioText} · limit 1/(2√2) = 0.3536 · target √2 = ${fmtX(SQRT2)}`,
      caption: `Firings: ${state.steps} / ${MAX_STEPS} · x = ${fmtX(state.x)} · residual ${fmtSmall(residual)} · ${accuracy.toFixed(1)} digits / ${TARGET_DIGITS}`,
    };
  },

  status(state) {
    if (state.stopped) {
      return accuracyOf(state.x) >= TARGET_DIGITS ? "won" : "playing";
    }
    if (state.steps >= MAX_STEPS && accuracyOf(state.x) < TARGET_DIGITS) return "lost";
    return "playing";
  },

  score(state) {
    if (state.stopped === false || accuracyOf(state.x) < TARGET_DIGITS) {
      return { stars: 1, detail: "No twelve-digit certificate." };
    }
    if (state.fullSteps === MAX_STEPS) {
      return {
        stars: 3,
        detail: `Four full tangent steps; x = ${fmtX(state.x)}, accuracy ${accuracyOf(state.x).toFixed(1)} digits.`,
      };
    }
    return {
      stars: 2,
      detail: `${state.fullSteps} full steps and ${MAX_STEPS - state.fullSteps} damped or bracket steps; accuracy ${accuracyOf(state.x).toFixed(1)} digits.`,
    };
  },

  solution: ["step:full", "step:full", "step:full", "step:full", "stop"],
};

export default level;
