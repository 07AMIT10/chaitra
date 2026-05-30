/** Task placement simulation: random vs sample-k vs optimal (small N). */

export type PlacementStrategy = "random" | "sample-k" | "optimal";

export type WorkerLoads = {
  loads: number[];
  maxLoad: number;
  avgLoad: number;
  spread: number;
};

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandomIndices(n: number, k: number, rand: () => number): number[] {
  const indices: number[] = [];
  const seen = new Set<number>();
  const limit = Math.min(k, n);
  let guard = 0;
  while (indices.length < limit && guard < n * 4) {
    guard++;
    const i = Math.floor(rand() * n);
    if (!seen.has(i)) {
      seen.add(i);
      indices.push(i);
    }
  }
  return indices;
}

function minLoadIndex(loads: number[], candidates: number[]): number {
  let best = candidates[0];
  for (const i of candidates) {
    if (loads[i] < loads[best]) best = i;
  }
  return best;
}

function globalMinIndex(loads: number[]): number {
  let best = 0;
  for (let i = 1; i < loads.length; i++) {
    if (loads[i] < loads[best]) best = i;
  }
  return best;
}

export function simulatePlacement(
  tasks: number,
  workers: number,
  strategy: PlacementStrategy,
  sampleSize: number,
  seed = 42
): WorkerLoads {
  const rand = mulberry32(seed);
  const loads = Array(workers).fill(0);
  const k = Math.max(1, Math.floor(sampleSize));

  for (let t = 0; t < tasks; t++) {
    let target: number;
    if (strategy === "optimal") {
      target = globalMinIndex(loads);
    } else if (strategy === "sample-k") {
      const sample = pickRandomIndices(workers, k, rand);
      target = minLoadIndex(loads, sample);
    } else {
      target = Math.floor(rand() * workers);
    }
    loads[target]++;
  }

  const maxLoad = Math.max(...loads, 0);
  const avgLoad = workers > 0 ? tasks / workers : 0;
  return { loads, maxLoad, avgLoad, spread: maxLoad - avgLoad };
}

export function runPlacementTrials(
  tasks: number,
  workers: number,
  strategy: PlacementStrategy,
  sampleSize: number,
  trials: number
): { avgMax: number; avgSpread: number } {
  let sumMax = 0;
  let sumSpread = 0;
  for (let t = 0; t < trials; t++) {
    const result = simulatePlacement(tasks, workers, strategy, sampleSize, 42 + t);
    sumMax += result.maxLoad;
    sumSpread += result.spread;
  }
  return { avgMax: sumMax / trials, avgSpread: sumSpread / trials };
}

export function compareStrategies(
  tasks: number,
  workers: number,
  sampleSize: number,
  trials: number
): {
  random: { avgMax: number; avgSpread: number };
  sampleK: { avgMax: number; avgSpread: number };
  optimal: WorkerLoads;
} {
  return {
    random: runPlacementTrials(tasks, workers, "random", sampleSize, trials),
    sampleK: runPlacementTrials(tasks, workers, "sample-k", sampleSize, trials),
    optimal: simulatePlacement(tasks, workers, "optimal", sampleSize, 7),
  };
}

export const NOMAD_STYLE_PRESET = { tasks: 120, workers: 8, sampleSize: 3, trials: 60 };
export const HEAVY_LOAD_PRESET = { tasks: 240, workers: 5, sampleSize: 2, trials: 80 };
export const HIGH_P_SUCCESS_PRESET = { tasks: 80, workers: 10, sampleSize: 5, trials: 50 };
