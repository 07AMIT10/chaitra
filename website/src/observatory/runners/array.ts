/**
 * Array runner: binary search, merge sort, and quick sort over an
 * `ArrayModel`. The runner is pure: it never mutates the scenario, never
 * reads the clock, and derives every frame from deterministic state —
 * tie-breaks use stable item ids (`item:<originalIndex>`), never values
 * that could reorder between runs.
 */
import type { ArrayView, BoardView, NodeState } from "../../game/types";
import { canonicalJson, hash32, scenarioHash } from "../hash";
import { ARRAY_STRATEGIES } from "../types";
import type {
  Diagnostic,
  Frame,
  Highlight,
  Invariant,
  Metric,
  RunResult,
  Runner,
  Scenario,
  TraceEvent,
} from "../types";

const MAX_FRAMES = 300;
const MAX_VALUES = 32;
const MIN_VALUES = 1;

type Item = { id: string; value: number; label: string; state?: NodeState };
type Pointer = { label: string; index: number };
type Segment = { from: number; to: number; label?: string; state?: "idle" | "active" | "done" };

type FrameDraft = {
  caption?: string;
  items: Item[];
  pointers: Pointer[];
  segments: Segment[];
  metrics: Metric[];
  highlights: Highlight[];
  events: TraceEvent[];
  invariants: Invariant[];
};

type Trace = {
  drafts: FrameDraft[];
  capped: boolean;
  hasRoom(): boolean;
  push(draft: FrameDraft): boolean;
};

type StrategyResult = { drafts: FrameDraft[]; capped: boolean; completed: boolean };

function createTrace(): Trace {
  const drafts: FrameDraft[] = [];
  const trace: Trace = {
    drafts,
    capped: false,
    hasRoom(): boolean {
      return drafts.length < MAX_FRAMES && !trace.capped;
    },
    push(draft: FrameDraft): boolean {
      if (drafts.length >= MAX_FRAMES) {
        trace.capped = true;
        return false;
      }
      drafts.push(draft);
      return true;
    },
  };
  return trace;
}

const makeItems = (values: number[]): Item[] =>
  values.map((value, index) => ({ id: `item:${index}`, value, label: String(value) }));

const snapshotItems = (items: Item[]): Item[] => items.map((item) => ({ ...item }));

const originalIndexOf = (item: Item): number =>
  Number.parseInt(item.id.slice("item:".length), 10);

function isSortedRange(items: Item[], from: number, to: number): boolean {
  for (let i = from + 1; i <= to; i += 1) {
    if (items[i - 1].value > items[i].value) return false;
  }
  return true;
}

/* ---------------------------------------------------------------- invariants */

function ascendingInvariant(items: Item[]): Invariant {
  let violations = 0;
  for (let i = 1; i < items.length; i += 1) {
    if (items[i - 1].value > items[i].value) violations += 1;
  }
  return {
    label: "Values are ascending",
    holds: violations === 0,
    detail:
      violations === 0
        ? "Every value is greater than or equal to the one before it."
        : `${violations} adjacent pair(s) of values descend.`,
  };
}

function eliminatedInvariant(items: Item[], lo: number, hi: number, target: number): Invariant {
  let below = 0;
  let above = 0;
  let violations = 0;
  let example = "";
  for (let i = 0; i < items.length; i += 1) {
    if (i < lo) {
      below += 1;
      if (!(items[i].value < target)) {
        violations += 1;
        example = `${items[i].id} was eliminated but could still hold the target`;
      }
    } else if (i > hi) {
      above += 1;
      if (!(items[i].value > target)) {
        violations += 1;
        example = `${items[i].id} was eliminated but could still hold the target`;
      }
    }
  }
  if (below === 0 && above === 0) {
    return {
      label: "Target lies outside eliminated ranges",
      holds: true,
      detail: "No value has been eliminated yet.",
    };
  }
  return {
    label: "Target lies outside eliminated ranges",
    holds: violations === 0,
    detail:
      violations === 0
        ? `${below} value(s) below the range are < ${target}; ${above} above are > ${target}. The target can only be in [${lo}, ${hi}].`
        : `${example}.`,
  };
}

function stableOrderInvariant(): Invariant {
  return {
    label: "Equal values keep their original order",
    holds: true,
    detail: "The merge takes the left value whenever the two compared values are equal.",
  };
}

function sortedRangeInvariant(items: Item[], from: number, to: number): Invariant {
  const holds = isSortedRange(items, from, to);
  return {
    label: `Segment [${from}..${to}] is sorted`,
    holds,
    detail: holds
      ? `All ${to - from + 1} value(s) in the merged segment are in non-decreasing order.`
      : "The merged segment still contains an adjacent descending pair.",
  };
}

function wholeSortedInvariant(items: Item[]): Invariant {
  const holds = isSortedRange(items, 0, items.length - 1);
  return {
    label: "Array is sorted",
    holds,
    detail: holds
      ? `${items.length} value(s) in ascending order across the whole array.`
      : "The array still contains an adjacent descending pair.",
  };
}

function settledPivotsInvariant(items: Item[], finalized: number[]): Invariant {
  if (finalized.length === 0) {
    return {
      label: "Settled pivots are in final position",
      holds: true,
      detail: "No pivot has settled yet.",
    };
  }
  let violations = 0;
  let example = "";
  for (const p of finalized) {
    const pivotValue = items[p].value;
    for (let i = 0; i < p; i += 1) {
      if (items[i].value > pivotValue) {
        violations += 1;
        example = `${items[i].id} sits to the left of settled pivot ${items[p].id} but is larger`;
      }
    }
    for (let i = p + 1; i < items.length; i += 1) {
      if (items[i].value < pivotValue) {
        violations += 1;
        example = `${items[i].id} sits to the right of settled pivot ${items[p].id} but is smaller`;
      }
    }
  }
  return {
    label: "Settled pivots are in final position",
    holds: violations === 0,
    detail:
      violations === 0
        ? `${finalized.length} pivot(s) settled; every value is on the correct side of each.`
        : `${example}.`,
  };
}

/* ------------------------------------------------------------------ runners */

function runBinarySearch(values: number[], target: number): StrategyResult {
  const trace = createTrace();
  const n = values.length;
  const items = makeItems(values);
  const targetText = String(target);
  let lo = 0;
  let hi = n - 1;
  let probes = 0;
  let comparisons = 0;
  let foundIndex = -1;
  let completed = false;

  const metrics = (): Metric[] => [
    { label: "Probes", value: String(probes) },
    { label: "Comparisons", value: String(comparisons) },
    { label: "Candidate range", value: lo <= hi ? `${lo}–${hi}` : "empty" },
  ];

  const segmentsFor = (loAt: number, hiAt: number): Segment[] => {
    const segments: Segment[] = [];
    if (loAt > 0) segments.push({ from: 0, to: loAt - 1, label: "eliminated", state: "idle" });
    if (loAt <= hiAt) segments.push({ from: loAt, to: hiAt, label: "candidates", state: "active" });
    if (hiAt < n - 1) segments.push({ from: hiAt + 1, to: n - 1, label: "eliminated", state: "idle" });
    return segments;
  };

  trace.push({
    caption: `Binary search for ${targetText} among ${n} ascending value(s).`,
    items: snapshotItems(items),
    pointers: [
      { label: "lo", index: lo },
      { label: "hi", index: hi },
    ],
    segments: segmentsFor(lo, hi),
    metrics: metrics(),
    highlights: [],
    events: [
      { step: 0, text: `Looking for ${targetText}; the candidate range is [${lo}, ${hi}].`, kind: "info" },
    ],
    invariants: [ascendingInvariant(items), eliminatedInvariant(items, lo, hi, target)],
  });

  while (lo <= hi && foundIndex < 0) {
    if (!trace.hasRoom()) break;
    const probeLo = lo;
    const probeHi = hi;
    const mid = Math.floor((probeLo + probeHi) / 2);
    probes += 1;
    comparisons += 1;
    const probed = items[mid].value;
    let event: TraceEvent;
    let foundHere = false;
    if (probed === target) {
      foundHere = true;
      foundIndex = mid;
      event = { step: 0, text: `Probe ${probes}: item:${mid} is ${probed} — that is the target.`, kind: "good" };
    } else if (probed < target) {
      event = {
        step: 0,
        text: `Probe ${probes}: item:${mid} is ${probed} < ${targetText}; eliminate [${probeLo}, ${mid}] and search right.`,
        kind: "info",
      };
    } else {
      event = {
        step: 0,
        text: `Probe ${probes}: item:${mid} is ${probed} > ${targetText}; eliminate [${mid}, ${probeHi}] and search left.`,
        kind: "info",
      };
    }
    const probeItems = snapshotItems(items);
    probeItems[mid].state = "active";
    trace.push({
      caption: `Probe ${probes} at item:${mid}.`,
      items: probeItems,
      pointers: [
        { label: "lo", index: probeLo },
        { label: "mid", index: mid },
        { label: "hi", index: probeHi },
      ],
      segments: segmentsFor(probeLo, probeHi),
      metrics: metrics(),
      highlights: [{ id: probeItems[mid].id, role: "active" }],
      events: [event],
      invariants: [ascendingInvariant(items), eliminatedInvariant(items, probeLo, probeHi, target)],
    });
    if (foundHere) break;
    if (probed < target) lo = mid + 1;
    else hi = mid - 1;
  }

  if (trace.hasRoom()) {
    if (foundIndex >= 0) {
      const finalItems = snapshotItems(items);
      finalItems[foundIndex].state = "done";
      trace.push({
        caption: `Target ${targetText} found at item:${foundIndex}.`,
        items: finalItems,
        pointers: [],
        segments: segmentsFor(lo, hi).map((segment) =>
          segment.label === "candidates"
            ? { from: foundIndex, to: foundIndex, label: "target", state: "done" }
            : segment,
        ),
        metrics: metrics(),
        highlights: [{ id: finalItems[foundIndex].id, role: "done" }],
        events: [
          {
            step: 0,
            text: `Found ${targetText} at item:${foundIndex} after ${probes} probe(s).`,
            kind: "good",
          },
        ],
        invariants: [ascendingInvariant(items), eliminatedInvariant(items, lo, hi, target)],
      });
      completed = true;
    } else {
      completed = trace.push({
        caption: `Target ${targetText} is not present.`,
        items: snapshotItems(items),
        pointers: [],
        segments: segmentsFor(lo, hi),
        metrics: metrics(),
        highlights: [],
        events: [
          {
            step: 0,
            text: `Target ${targetText} is not present: the candidate range is empty after ${probes} probe(s).`,
            kind: "info",
          },
        ],
        invariants: [ascendingInvariant(items), eliminatedInvariant(items, lo, hi, target)],
      });
    }
  }

  return { drafts: trace.drafts, capped: trace.capped, completed };
}

function runMergeSort(values: number[]): StrategyResult {
  const trace = createTrace();
  const n = values.length;
  const items = makeItems(values);
  let comparisons = 0;
  let merges = 0;
  let completed = false;

  const metrics = (): Metric[] => [
    { label: "Comparisons", value: String(comparisons) },
    { label: "Merges", value: String(merges) },
  ];

  trace.push({
    caption: `Merge sort of ${n} value(s); equal values keep their original order.`,
    items: snapshotItems(items),
    pointers: [],
    segments: [],
    metrics: metrics(),
    highlights: [],
    events: [{ step: 0, text: `Merge sort begins on ${n} value(s).`, kind: "info" }],
    invariants: [stableOrderInvariant()],
  });

  const merge = (lo: number, mid: number, hi: number): boolean => {
    const left = items.slice(lo, mid + 1);
    const right = items.slice(mid + 1, hi + 1);
    let a = 0;
    let b = 0;
    let k = lo;
    while (a < left.length && b < right.length) {
      if (!trace.hasRoom()) return false;
      comparisons += 1;
      if (left[a].value <= right[b].value) {
        items[k] = left[a];
        a += 1;
      } else {
        items[k] = right[b];
        b += 1;
      }
      k += 1;
    }
    while (a < left.length && trace.hasRoom()) {
      items[k] = left[a];
      a += 1;
      k += 1;
    }
    while (b < right.length && trace.hasRoom()) {
      items[k] = right[b];
      b += 1;
      k += 1;
    }
    if (!trace.hasRoom()) return false;
    merges += 1;
    const frameItems = snapshotItems(items);
    const highlights: Highlight[] = [];
    for (let i = lo; i <= hi; i += 1) {
      frameItems[i].state = "active";
      highlights.push({ id: frameItems[i].id, role: "flow" });
    }
    return trace.push({
      caption: `Merged [${lo}..${mid}] and [${mid + 1}..${hi}].`,
      items: frameItems,
      pointers: [],
      segments: [{ from: lo, to: hi, label: "merged", state: "active" }],
      metrics: metrics(),
      highlights,
      events: [
        {
          step: 0,
          text: `Merged [${lo}..${mid}] with [${mid + 1}..${hi}] into ${hi - lo + 1} sorted value(s).`,
          kind: "info",
        },
      ],
      invariants: [sortedRangeInvariant(items, lo, hi), stableOrderInvariant()],
    });
  };

  const msort = (lo: number, hi: number): boolean => {
    if (hi <= lo) return true;
    if (!trace.hasRoom()) return false;
    const mid = lo + Math.floor((hi - lo) / 2);
    if (!msort(lo, mid)) return false;
    if (!msort(mid + 1, hi)) return false;
    return merge(lo, mid, hi) && trace.hasRoom();
  };

  msort(0, n - 1);

  if (trace.hasRoom()) {
    const finalItems = snapshotItems(items);
    for (const item of finalItems) item.state = "done";
    completed = trace.push({
      caption: "Merge sort complete.",
      items: finalItems,
      pointers: [],
      segments: [{ from: 0, to: n - 1, label: "sorted", state: "done" }],
      metrics: metrics(),
      highlights: finalItems.map((item) => ({ id: item.id, role: "done" })),
      events: [
        {
          step: 0,
          text: `Merge sort complete: ${n} value(s) in ascending order; equal values kept their original order.`,
          kind: "good",
        },
      ],
      invariants: [wholeSortedInvariant(items), stableOrderInvariant()],
    });
  }

  return { drafts: trace.drafts, capped: trace.capped, completed };
}

function runQuickSort(values: number[]): StrategyResult {
  const trace = createTrace();
  const n = values.length;
  const items = makeItems(values);
  let comparisons = 0;
  let swaps = 0;
  let completed = false;
  const finalized: number[] = [];

  const metrics = (): Metric[] => [
    { label: "Comparisons", value: String(comparisons) },
    { label: "Swaps", value: String(swaps) },
  ];

  const settledSegments = (): Segment[] =>
    finalized.map((p) => ({ from: p, to: p, label: "pivot settled", state: "done" as const }));

  trace.push({
    caption: `Quick sort of ${n} value(s); the last value of each range is the pivot.`,
    items: snapshotItems(items),
    pointers: [],
    segments: [],
    metrics: metrics(),
    highlights: [],
    events: [
      {
        step: 0,
        text: `Quick sort begins on ${n} value(s): the last value of each working range is the pivot.`,
        kind: "info",
      },
    ],
    invariants: [settledPivotsInvariant(items, finalized)],
  });

  const qsort = (lo: number, hi: number): void => {
    if (lo >= hi || !trace.hasRoom()) return;
    const pivotIndex = hi;
    const pivot = items[hi].value;
    let i = lo;
    for (let j = lo; j < hi; j += 1) {
      comparisons += 1;
      let swapped = false;
      if (items[j].value < pivot) {
        if (i !== j) {
          const temp = items[i];
          items[i] = items[j];
          items[j] = temp;
          swaps += 1;
          swapped = true;
        }
        i += 1;
      }
      if (!trace.hasRoom()) return;
      const frameItems = snapshotItems(items);
      frameItems[pivotIndex].state = "target";
      frameItems[j].state = "active";
      const highlights: Highlight[] = [
        { id: frameItems[pivotIndex].id, role: "active" },
        { id: frameItems[j].id, role: "active" },
      ];
      if (swapped) highlights.push({ id: frameItems[i - 1].id, role: "flow" });
      trace.push({
        caption: swapped
          ? `Swapped ${frameItems[i - 1].label} into position ${i - 1}.`
          : `Compared ${frameItems[j].label} with pivot ${pivot}.`,
        items: frameItems,
        pointers: [
          { label: "pivot", index: pivotIndex },
          { label: "i", index: i },
          { label: "j", index: j },
        ],
        segments: [...settledSegments(), { from: lo, to: hi, label: "partition", state: "active" }],
        metrics: metrics(),
        highlights,
        events: [
          {
            step: 0,
            text: swapped
              ? `item:${j} is ${frameItems[j].value} < pivot ${pivot}; swap into position ${i - 1}.`
              : `item:${j} is ${frameItems[j].value}${frameItems[j].value < pivot ? " <" : " ≥"} pivot ${pivot}; no swap.`,
            kind: "info",
          },
        ],
        invariants: [
          {
            label: "Store boundary (i) is sound",
            holds: (() => {
              for (let k = lo; k < i; k += 1) if (items[k].value >= pivot) return false;
              return true;
            })(),
            detail: `Value(s) left of the boundary i are all < pivot ${pivot}.`,
          },
          settledPivotsInvariant(items, finalized),
        ],
      });
    }
    if (i !== hi) {
      const temp = items[i];
      items[i] = items[hi];
      items[hi] = temp;
      swaps += 1;
    }
    finalized.push(i);
    if (!trace.hasRoom()) return;
    const placedItems = snapshotItems(items);
    placedItems[i].state = "done";
    const segments: Segment[] = [
      ...settledSegments(),
    ];
    if (lo <= i - 1) segments.push({ from: lo, to: i - 1, label: "partition", state: "active" });
    if (i + 1 <= hi) segments.push({ from: i + 1, to: hi, label: "partition", state: "active" });
    trace.push({
      caption: `Pivot ${pivot} settles at position ${i}.`,
      items: placedItems,
      pointers: [{ label: "pivot", index: i }],
      segments,
      metrics: metrics(),
      highlights: [{ id: placedItems[i].id, role: "done" }],
      events: [
        {
          step: 0,
          text: `Pivot ${pivot} settles at position ${i}: everything left is smaller, everything right is at least as large.`,
          kind: "good",
        },
      ],
      invariants: [settledPivotsInvariant(items, finalized)],
    });
    qsort(lo, i - 1);
    qsort(i + 1, hi);
  };

  qsort(0, n - 1);

  if (trace.hasRoom()) {
    const finalItems = snapshotItems(items);
    for (const item of finalItems) item.state = "done";
    completed = trace.push({
      caption: "Quick sort complete.",
      items: finalItems,
      pointers: [],
      segments: [{ from: 0, to: n - 1, label: "sorted", state: "done" }],
      metrics: metrics(),
      highlights: finalItems.map((item) => ({ id: item.id, role: "done" })),
      events: [
        {
          step: 0,
          text: `Quick sort complete: ${n} value(s) in ascending order after ${comparisons} comparison(s) and ${swaps} swap(s).`,
          kind: "good",
        },
      ],
      invariants: [wholeSortedInvariant(items), settledPivotsInvariant(items, finalized)],
    });
  }

  return { drafts: trace.drafts, capped: trace.capped, completed };
}

/* ------------------------------------------------------------- presentation */

function toFrames(drafts: FrameDraft[]): Frame[] {
  return drafts.map((draft, index) => {
    const view: ArrayView = {
      kind: "array",
      items: draft.items.map((item) => ({ ...item, state: item.state ?? "idle" })),
      pointers: draft.pointers.length > 0 ? draft.pointers : undefined,
      segments: draft.segments.length > 0 ? draft.segments : undefined,
      caption: draft.caption,
    };
    const boardView: BoardView = view;
    return {
      index,
      view: boardView,
      metrics: draft.metrics,
      highlights: draft.highlights,
      events: draft.events.map((event) => ({ ...event, step: index })),
      invariants: draft.invariants,
      stateHash: hash32(
        canonicalJson({
          order: draft.items.map((item) => [item.id, item.value, item.state ?? "idle"]),
          pointers: draft.pointers,
          segments: draft.segments,
        }),
      ),
    };
  });
}

/* -------------------------------------------------------------- validation */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const describeValue = (value: unknown): string => {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null || value === undefined) return String(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return "an object";
  return typeof value;
};

export function validateArrayScenario(scenario: Scenario): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const raw = scenario as unknown;
  if (!isRecord(raw)) {
    diagnostics.push({
      code: "scenario-shape",
      path: "scenario",
      message: "Scenario must be an object.",
    });
    return diagnostics;
  }
  if (raw.substrate !== "array") {
    diagnostics.push({
      code: "substrate-mismatch",
      path: "substrate",
      message: `Array runner requires substrate "array"; received ${describeValue(raw.substrate)}.`,
    });
  }
  const strategy = typeof raw.strategy === "string" ? raw.strategy : "";
  if (!(ARRAY_STRATEGIES as readonly string[]).includes(strategy)) {
    diagnostics.push({
      code: "strategy-mismatch",
      path: "strategy",
      message: `Strategy must be one of ${ARRAY_STRATEGIES.join(", ")}; received ${describeValue(raw.strategy)}.`,
    });
  }
  const model = raw.model;
  if (!isRecord(model) || model.kind !== "array") {
    diagnostics.push({
      code: "model-mismatch",
      path: "model",
      message: `Model must be an array model with kind "array".`,
    });
    return diagnostics;
  }
  if (!Array.isArray(model.values)) {
    diagnostics.push({
      code: "values-type",
      path: "model.values",
      message: "Values must be an array of finite numbers.",
    });
    // Still check the target so the reader sees every problem at once.
    if (model.target !== undefined && !isFiniteNumber(model.target)) {
      diagnostics.push({
        code: "target-type",
        path: "model.target",
        message: `Target must be a finite number; received ${describeValue(model.target)}.`,
      });
    }
    return diagnostics;
  }
  const values = model.values as unknown[];
  if (values.length < MIN_VALUES || values.length > MAX_VALUES) {
    diagnostics.push({
      code: "values-count",
      path: "model.values",
      message: `Values must contain between ${MIN_VALUES} and ${MAX_VALUES} numbers; received ${values.length}.`,
    });
  }
  let allFinite = true;
  values.forEach((value, index) => {
    if (!isFiniteNumber(value)) {
      allFinite = false;
      diagnostics.push({
        code: "values-type",
        path: `model.values[${index}]`,
        message: `Values must be finite numbers; index ${index} is ${describeValue(value)}.`,
      });
    }
  });
  if (model.target !== undefined && !isFiniteNumber(model.target)) {
    diagnostics.push({
      code: "target-type",
      path: "model.target",
      message: `Target must be a finite number; received ${describeValue(model.target)}.`,
    });
  }
  if (strategy === "binary-search") {
    if (model.target === undefined) {
      diagnostics.push({
        code: "target-required",
        path: "model.target",
        message: "Binary search requires a numeric target.",
      });
    }
    if (allFinite) {
      const numbers = values as number[];
      for (let i = 1; i < numbers.length; i += 1) {
        if (numbers[i - 1] > numbers[i]) {
          diagnostics.push({
            code: "values-not-ascending",
            path: `model.values[${i}]`,
            message: `Binary search requires ascending values; ${numbers[i - 1]} precedes ${numbers[i]}.`,
          });
          break;
        }
      }
    }
  }
  return diagnostics;
}

function safeScenarioHash(scenario: Scenario): string {
  try {
    return scenarioHash(scenario);
  } catch {
    return hash32("unserializable-scenario");
  }
}

/* ------------------------------------------------------------------ runner */

export const arrayRunner: Runner = {
  substrate: "array",
  strategies: ARRAY_STRATEGIES,
  validate(scenario: Scenario): Diagnostic[] {
    return validateArrayScenario(scenario);
  },
  run(scenario: Scenario): RunResult {
    const diagnostics = validateArrayScenario(scenario);
    if (diagnostics.length > 0) {
      return { frames: [], outcome: "invalid", diagnostics, hash: safeScenarioHash(scenario) };
    }
    const arrayScenario = scenario as Extract<Scenario, { substrate: "array" }>;
    const values = arrayScenario.model.values.slice();
    let result: StrategyResult;
    switch (arrayScenario.strategy) {
      case "binary-search":
        result = runBinarySearch(values, arrayScenario.model.target as number);
        break;
      case "merge-sort":
        result = runMergeSort(values);
        break;
      case "quick-sort":
        result = runQuickSort(values);
        break;
      default:
        result = { drafts: [], capped: false, completed: true };
    }
    return {
      frames: toFrames(result.drafts),
      outcome: result.completed && !result.capped ? "done" : "max-steps",
      diagnostics: [],
      hash: safeScenarioHash(scenario),
    };
  },
};
