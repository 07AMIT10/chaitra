import type { GridView } from "../../game/types";
import { canonicalJson, hash32, scenarioHash } from "../hash";
import { gridCellId } from "../scenario";
import {
  GRID_STRATEGIES,
  type Diagnostic,
  type Frame,
  type GridStrategy,
  type Highlight,
  type Invariant,
  type Metric,
  type RunOutcome,
  type Runner,
  type RunResult,
  type Scenario,
  type TableModel,
  type TraceEvent,
} from "../types";

/** Spec cap from the observatory contract. */
export const GRID_MAX_FRAMES = 300;
const MAX_ROWS = 12;
const MAX_COLS = 14;
const EPSILON = "ε";

type CellRef = { r: number; c: number };
type CellValue = number | null;

const STRATEGY_LABEL: Record<GridStrategy, string> = {
  "edit-distance": "Edit distance",
  lcs: "Longest common subsequence",
};

const diagnostic = (code: string, path: string, message: string): Diagnostic => ({
  code,
  path,
  message,
});

/**
 * Grid scenarios render a table of `a.length + 1` rows by `b.length + 1`
 * columns. Both strings may be empty; the table is then a 1 x 1 base case.
 */
export function validateGridScenario(scenario: Scenario): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (typeof scenario !== "object" || scenario === null) {
    return [diagnostic("scenario-shape", "scenario", "A scenario must be an object.")];
  }

  const record = scenario as unknown as Record<string, unknown>;
  if (record.substrate !== "grid") {
    diagnostics.push(
      diagnostic("substrate-mismatch", "substrate", 'The grid runner needs substrate "grid".'),
    );
  }
  if (!GRID_STRATEGIES.includes(record.strategy as GridStrategy)) {
    diagnostics.push(
      diagnostic(
        "strategy-mismatch",
        "strategy",
        `Strategy ${JSON.stringify(record.strategy)} is not a grid strategy (edit-distance or lcs).`,
      ),
    );
  }

  const model = record.model;
  if (typeof model !== "object" || model === null || Array.isArray(model)) {
    diagnostics.push(
      diagnostic("model-shape", "model", "The grid runner needs a table model."),
    );
    return diagnostics;
  }

  const table = model as Record<string, unknown>;
  if (table.kind !== "table") {
    diagnostics.push(
      diagnostic("model-kind", "model.kind", 'Table model kind must be "table".'),
    );
  }
  for (const key of ["a", "b"] as const) {
    if (typeof table[key] !== "string") {
      diagnostics.push(
        diagnostic("model-string", `model.${key}`, `Table model field "${key}" must be a string.`),
      );
    }
  }

  if (typeof table.a === "string" && table.a.length + 1 > MAX_ROWS) {
    diagnostics.push(
      diagnostic(
        "table-rows",
        "model.a",
        `Rendered table has ${table.a.length + 1} rows; the limit is ${MAX_ROWS}. Shorten "a" to at most ${
          MAX_ROWS - 1
        } characters.`,
      ),
    );
  }
  if (typeof table.b === "string" && table.b.length + 1 > MAX_COLS) {
    diagnostics.push(
      diagnostic(
        "table-cols",
        "model.b",
        `Rendered table has ${table.b.length + 1} columns; the limit is ${MAX_COLS}. Shorten "b" to at most ${
          MAX_COLS - 1
        } characters.`,
      ),
    );
  }

  return diagnostics;
}

function recurrenceValue(
  strategy: GridStrategy,
  a: string,
  b: string,
  values: readonly (readonly CellValue[])[],
  r: number,
  c: number,
): number {
  const diagonal = values[r - 1][c - 1] as number;
  const above = values[r - 1][c] as number;
  const left = values[r][c - 1] as number;
  if (strategy === "edit-distance") {
    const cost = a.charAt(r - 1) === b.charAt(c - 1) ? 0 : 1;
    return Math.min(above + 1, left + 1, diagonal + cost);
  }
  return a.charAt(r - 1) === b.charAt(c - 1) ? diagonal + 1 : Math.max(above, left);
}

function hashState(
  strategy: GridStrategy,
  a: string,
  b: string,
  values: readonly (readonly CellValue[])[],
  active: CellRef | null,
  path: readonly string[],
): string {
  return hash32(
    canonicalJson({
      strategy,
      a,
      b,
      values,
      active: active ? gridCellId(active.r, active.c) : null,
      path,
    }),
  );
}

function seedEvent(strategy: GridStrategy, a: string, b: string): TraceEvent {
  const interior = a.length * b.length;
  const cells = `${interior} interior cell${interior === 1 ? "" : "s"}`;
  if (strategy === "edit-distance") {
    return {
      step: 0,
      kind: "info",
      text: `Base cases seeded: column 0 = 0..${a.length}, row 0 = 0..${b.length}. ${cells} fill row by row.`,
    };
  }
  return {
    step: 0,
    kind: "info",
    text: `Base cases seeded: row 0 and column 0 are zeros. ${cells} fill row by row.`,
  };
}

function fillEvent(
  step: number,
  strategy: GridStrategy,
  a: string,
  b: string,
  values: readonly (readonly CellValue[])[],
  r: number,
  c: number,
  value: number,
): TraceEvent {
  const diagonal = values[r - 1][c - 1] as number;
  const above = values[r - 1][c] as number;
  const left = values[r][c - 1] as number;
  const match = a.charAt(r - 1) === b.charAt(c - 1);
  if (strategy === "edit-distance") {
    if (match) {
      return {
        step,
        kind: "good",
        text: `Match "${a.charAt(r - 1)}": d(${r},${c}) = d(${r - 1},${c - 1}) = ${value}.`,
      };
    }
    return {
      step,
      kind: "info",
      text: `d(${r},${c}) = min(${above} + 1, ${left} + 1, ${diagonal} + 1) = ${value}.`,
    };
  }
  if (match) {
    return {
      step,
      kind: "good",
      text: `Match "${a.charAt(r - 1)}": LCS(${r},${c}) = LCS(${r - 1},${c - 1}) + 1 = ${value}.`,
    };
  }
  return {
    step,
    kind: "info",
    text: `LCS(${r},${c}) = max(${above}, ${left}) = ${value}.`,
  };
}

function recurrenceInvariant(
  strategy: GridStrategy,
  a: string,
  b: string,
  values: readonly (readonly CellValue[])[],
): Invariant {
  const label = "Recurrence";
  const formula =
    strategy === "edit-distance"
      ? "d(r,c) = min(d(r-1,c) + 1, d(r,c-1) + 1, d(r-1,c-1) + cost)"
      : "LCS(r,c) = LCS(r-1,c-1) + 1 on a match, else max(LCS(r-1,c), LCS(r,c-1))";

  let checked = 0;
  let failures = 0;
  for (let r = 1; r <= a.length; r += 1) {
    for (let c = 1; c <= b.length; c += 1) {
      if (values[r][c] === null) continue;
      checked += 1;
      if (recurrenceValue(strategy, a, b, values, r, c) !== values[r][c]) failures += 1;
    }
  }

  if (checked === 0) {
    return {
      label,
      holds: true,
      detail:
        a.length * b.length === 0
          ? "No interior cells; the base cases are the whole table."
          : "No interior cell filled yet; the recurrence applies from (1,1).",
    };
  }
  return {
    label,
    holds: failures === 0,
    detail:
      failures === 0
        ? `${checked} filled cell${checked === 1 ? "" : "s"} satisfy ${formula}.`
        : `${failures} of ${checked} filled cells disagree with ${formula}.`,
  };
}

function finalCellInvariant(
  strategy: GridStrategy,
  a: string,
  b: string,
  values: readonly (readonly CellValue[])[],
): Invariant {
  const label = "Final cell";
  const value = values[a.length][b.length];
  const id = gridCellId(a.length, b.length);
  if (value === null) {
    return { label, holds: false, detail: `Cell ${id} is not filled yet.` };
  }
  const name = strategy === "edit-distance" ? `d(${a.length},${b.length})` : `LCS(${a.length},${b.length})`;
  return { label, holds: true, detail: `${name} = ${value}.` };
}

type FrameInput = {
  index: number;
  strategy: GridStrategy;
  a: string;
  b: string;
  values: readonly (readonly CellValue[])[];
  active: CellRef | null;
  dependencies: CellRef[];
  path: readonly string[];
  event: TraceEvent;
};

function buildFrame(input: FrameInput): Frame {
  const { index, strategy, a, b, values, active, dependencies, path, event } = input;
  const rows = values.length;
  const cols = values[0].length;
  const activeId = active ? gridCellId(active.r, active.c) : null;
  const pathIds = new Set(path);

  let filled = 0;
  const cells: GridView["cells"] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = values[r][c];
      if (value !== null) filled += 1;
      const id = gridCellId(r, c);
      const state =
        activeId === id ? "active" : pathIds.has(id) ? "target" : value === null ? "idle" : "done";
      cells.push({
        r,
        c,
        value: value === null ? "" : value,
        state,
        aria:
          value === null
            ? `Row ${r}, column ${c}, empty`
            : `Row ${r}, column ${c}, value ${value}`,
      });
    }
  }

  const roles = new Map<string, Highlight["role"]>();
  if (activeId) roles.set(activeId, "active");
  for (const dependency of dependencies) {
    const id = gridCellId(dependency.r, dependency.c);
    if (!roles.has(id)) roles.set(id, "flow");
  }

  const finalValue = values[rows - 1][cols - 1];
  const metrics: Metric[] = [
    { label: "Cells filled", value: `${filled} / ${rows * cols}` },
    {
      label: strategy === "edit-distance" ? "Distance" : "LCS length",
      value: finalValue === null ? "—" : String(finalValue),
      tone: "signal",
    },
    { label: "Cell", value: active ? `(${active.r}, ${active.c})` : "—" },
  ];

  const traceEvent: TraceEvent = { step: event.step, text: event.text };
  if (event.kind) traceEvent.kind = event.kind;

  return {
    index,
    view: {
      kind: "grid",
      rows,
      cols,
      cells,
      rowLabels: [EPSILON, ...a.split("")],
      colLabels: [EPSILON, ...b.split("")],
      caption: `${STRATEGY_LABEL[strategy]} · ${a || EPSILON} → ${b || EPSILON}`,
    },
    metrics,
    highlights: [...roles].map(([id, role]) => ({ id, role })),
    events: [traceEvent],
    invariants: [
      recurrenceInvariant(strategy, a, b, values),
      finalCellInvariant(strategy, a, b, values),
    ],
    stateHash: hashState(strategy, a, b, values, active, path),
  };
}

function withPath(frame: Frame, path: readonly string[], stateHash: string): Frame {
  const roles = new Map<string, Highlight["role"]>(
    frame.highlights.map((highlight) => [highlight.id, highlight.role]),
  );
  for (const id of path) {
    if (!roles.has(id)) roles.set(id, "emerge");
  }
  return {
    ...frame,
    highlights: [...roles].map(([id, role]) => ({ id, role })),
    stateHash,
  };
}

/**
 * Walk the filled table back to the origin. Prefers a diagonal move, then a
 * row move, then a column move, so ties are broken by direction rather than
 * by chance.
 */
function tracebackFrom(
  values: readonly (readonly CellValue[])[],
  strategy: GridStrategy,
  a: string,
  b: string,
  startR: number,
  startC: number,
): string[] {
  if (values[startR]?.[startC] == null) return [];
  let r = startR;
  let c = startC;
  const path = [gridCellId(r, c)];
  const guard = values.length * values[0].length + 4;
  let steps = 0;

  while ((r > 0 || c > 0) && steps < guard) {
    steps += 1;
    const here = values[r][c] as number;
    if (strategy === "edit-distance") {
      const diagonal = r > 0 && c > 0 ? values[r - 1][c - 1] : null;
      const cost = r > 0 && c > 0 && a.charAt(r - 1) === b.charAt(c - 1) ? 0 : 1;
      if (diagonal !== null && here === diagonal + cost) {
        r -= 1;
        c -= 1;
      } else if (r > 0 && values[r - 1][c] !== null && here === (values[r - 1][c] as number) + 1) {
        r -= 1;
      } else if (c > 0 && values[r][c - 1] !== null && here === (values[r][c - 1] as number) + 1) {
        c -= 1;
      } else {
        break;
      }
    } else {
      const diagonal = r > 0 && c > 0 ? values[r - 1][c - 1] : null;
      const match = r > 0 && c > 0 && a.charAt(r - 1) === b.charAt(c - 1);
      if (match && diagonal !== null && here === diagonal + 1) {
        r -= 1;
        c -= 1;
      } else if (r > 0 && values[r - 1][c] !== null && here === values[r - 1][c]) {
        r -= 1;
      } else if (c > 0 && values[r][c - 1] !== null && here === values[r][c - 1]) {
        c -= 1;
      } else {
        break;
      }
    }
    path.push(gridCellId(r, c));
  }
  return path;
}

export type GridTrace = { frames: Frame[]; outcome: RunOutcome };

/**
 * Pure, row-major trace over a table model. `maxFrames` is injectable so the
 * frame cap can be exercised by tests; the runner always uses the contract cap.
 */
export function runGridTable(
  model: TableModel,
  strategy: GridStrategy,
  maxFrames: number = GRID_MAX_FRAMES,
): GridTrace {
  const a = model.a;
  const b = model.b;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const values: CellValue[][] = Array.from({ length: rows }, () =>
    Array<CellValue>(cols).fill(null),
  );

  for (let r = 0; r < rows; r += 1) values[r][0] = strategy === "edit-distance" ? r : 0;
  for (let c = 0; c < cols; c += 1) values[0][c] = strategy === "edit-distance" ? c : 0;

  const limit = Math.max(1, Math.floor(maxFrames));
  const frames: Frame[] = [];
  let active: CellRef | null = null;

  frames.push(
    buildFrame({
      index: 0,
      strategy,
      a,
      b,
      values,
      active: null,
      dependencies: [],
      path: [],
      event: seedEvent(strategy, a, b),
    }),
  );

  let outcome: RunOutcome = "done";

  fill: for (let r = 1; r <= a.length; r += 1) {
    for (let c = 1; c <= b.length; c += 1) {
      if (frames.length >= limit) {
        outcome = "max-steps";
        break fill;
      }
      const value = recurrenceValue(strategy, a, b, values, r, c);
      values[r][c] = value;
      active = { r, c };
      frames.push(
        buildFrame({
          index: frames.length,
          strategy,
          a,
          b,
          values,
          active,
          dependencies: [
            { r: r - 1, c: c - 1 },
            { r: r - 1, c },
            { r, c: c - 1 },
          ],
          path: [],
          event: fillEvent(frames.length, strategy, a, b, values, r, c, value),
        }),
      );
    }
  }

  const end = active ?? { r: a.length, c: b.length };
  const path = tracebackFrom(values, strategy, a, b, end.r, end.c);
  if (path.length > 0) {
    const last = frames[frames.length - 1];
    frames[frames.length - 1] = withPath(
      last,
      path,
      hashState(strategy, a, b, values, active, path),
    );
  }

  return { frames, outcome };
}

export const gridRunner: Runner = {
  substrate: "grid",
  strategies: GRID_STRATEGIES,
  validate: validateGridScenario,
  run(scenario: Scenario): RunResult {
    const diagnostics = validateGridScenario(scenario);
    if (diagnostics.length > 0) {
      return { frames: [], outcome: "invalid", diagnostics, hash: scenarioHash(scenario) };
    }
    const table = (scenario as { model: TableModel }).model;
    const strategy = (scenario as { strategy: GridStrategy }).strategy;
    const trace = runGridTable(table, strategy);
    return {
      frames: trace.frames,
      outcome: trace.outcome,
      diagnostics: [],
      hash: scenarioHash(scenario),
    };
  },
};
