import {
  deterministicWorstComparisons,
  lasVegasExpectedComparisons,
  monteCarloAnyHitSuccess,
} from "./randomized-algorithms-math.ts";

export type ArrayPresetId = "sorted" | "shuffled";

export type ArrayPreset = {
  id: ArrayPresetId;
  label: string;
  values: readonly number[];
};

/** Sorted input — first-pivot quickselect hits Θ(n²) comparisons (README adversarial case). */
export const SORTED_PRESET: ArrayPreset = {
  id: "sorted",
  label: "Sorted (adversarial)",
  values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export const SHUFFLED_PRESET: ArrayPreset = {
  id: "shuffled",
  label: "Shuffled",
  values: [7, 2, 11, 4, 9, 1, 12, 5, 8, 3, 10, 6],
};

export const DEFAULT_K = 3;

export const ADVERSARIAL_PRESET = {
  presetId: "sorted" as const,
  k: 3,
  seed: 7,
  mcProbes: 1,
};

export const BALANCED_PRESET = {
  presetId: "shuffled" as const,
  k: 3,
  seed: 42,
  mcProbes: 4,
};

export const MC_MANY_PROBES_PRESET = {
  presetId: "sorted" as const,
  k: 3,
  seed: 99,
  mcProbes: 8,
};

export function getArrayPreset(id: ArrayPresetId): ArrayPreset {
  return id === "sorted" ? SORTED_PRESET : SHUFFLED_PRESET;
}

export function groundTruthKth(values: readonly number[], k: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(Math.max(1, k), sorted.length) - 1;
  return sorted[idx]!;
}

export type QuickselectResult = {
  value: number;
  comparisons: number;
  correct: boolean;
};

export type MonteCarloKthResult = {
  guess: number;
  probes: number;
  correct: boolean;
  /** Fixed work units — one read per probe (README: fixed runtime). */
  reads: number;
};

function makeRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function swap(arr: number[], i: number, j: number): void {
  const t = arr[i]!;
  arr[i] = arr[j]!;
  arr[j] = t;
}

type PivotStrategy = "first" | "random";

function quickselect(
  arr: number[],
  left: number,
  right: number,
  kIndex: number,
  strategy: PivotStrategy,
  rand: () => number
): QuickselectResult {
  let comparisons = 0;
  let lo = left;
  let hi = right;

  while (lo <= hi) {
    const pivotIndex =
      strategy === "first" ? lo : lo + Math.floor(rand() * (hi - lo + 1));
    const pivotValue = arr[pivotIndex]!;
    swap(arr, pivotIndex, hi);

    let store = lo;
    for (let i = lo; i < hi; i++) {
      comparisons++;
      if (arr[i]! < pivotValue) {
        swap(arr, i, store);
        store++;
      }
    }
    swap(arr, store, hi);
    const pivotFinal = store;

    if (pivotFinal === kIndex) {
      const value = arr[pivotFinal]!;
      return { value, comparisons, correct: true };
    }
    if (pivotFinal < kIndex) lo = pivotFinal + 1;
    else hi = pivotFinal - 1;
  }

  const value = arr[lo]!;
  return { value, comparisons, correct: true };
}

/** Las Vegas: randomized pivot quickselect — always correct, comparisons vary. */
export function lasVegasQuickselect(
  values: readonly number[],
  k: number,
  seed: number
): QuickselectResult {
  const truth = groundTruthKth(values, k);
  const arr = [...values];
  const kIndex = Math.min(Math.max(1, k), arr.length) - 1;
  const result = quickselect(arr, 0, arr.length - 1, kIndex, "random", makeRand(seed));
  return { ...result, correct: result.value === truth };
}

/** Deterministic worst-case baseline: always first pivot (sorted input blows up). */
export function deterministicQuickselect(
  values: readonly number[],
  k: number
): QuickselectResult {
  const truth = groundTruthKth(values, k);
  const arr = [...values];
  const kIndex = Math.min(Math.max(1, k), arr.length) - 1;
  const result = quickselect(arr, 0, arr.length - 1, kIndex, "first", () => 0);
  return { ...result, correct: result.value === truth };
}

/**
 * Monte Carlo: fixed m uniform probes; return the sample whose rank in the full array
 * is closest to k (tie → smallest distance). Always m reads; may be wrong.
 */
export function monteCarloKthGuess(
  values: readonly number[],
  k: number,
  probes: number,
  seed: number
): MonteCarloKthResult {
  const truth = groundTruthKth(values, k);
  const n = values.length;
  const m = Math.max(1, Math.min(probes, 20));
  const rand = makeRand(seed);
  const samples: { value: number; rank: number }[] = [];

  for (let i = 0; i < m; i++) {
    const idx = Math.floor(rand() * n);
    const value = values[idx]!;
    const rank = [...values].filter((x) => x < value).length + 1;
    samples.push({ value, rank });
  }

  samples.sort((a, b) => {
    const da = Math.abs(a.rank - k);
    const db = Math.abs(b.rank - k);
    if (da !== db) return da - db;
    return a.rank - b.rank;
  });

  const guess = samples[0]!.value;
  return {
    guess,
    probes: m,
    reads: m,
    correct: guess === truth,
  };
}

export function theoryForPreset(n: number, probes: number) {
  return {
    mcSuccess: monteCarloAnyHitSuccess(n, probes),
    lvExpected: lasVegasExpectedComparisons(n),
    detWorst: deterministicWorstComparisons(n),
  };
}
