/**
 * Coin & dice experiments for the probability-theory lab (README LLN / axioms).
 */

export type ExperimentMode = "coin" | "dice";

export type ExperimentPreset = {
  id: string;
  label: string;
  mode: ExperimentMode;
  trials: number;
  pHeadsPct?: number;
  sides?: number;
  seed: number;
};

export const CHAOTIC_COIN_PRESET: ExperimentPreset = {
  id: "chaotic",
  label: "Chaotic (40 flips)",
  mode: "coin",
  trials: 40,
  pHeadsPct: 50,
  seed: 42,
};

export const LLN_FAIR_COIN_PRESET: ExperimentPreset = {
  id: "lln-coin",
  label: "LLN fair coin",
  mode: "coin",
  trials: 8000,
  pHeadsPct: 50,
  seed: 42,
};

export const BIASED_COIN_PRESET: ExperimentPreset = {
  id: "biased-coin",
  label: "Biased 72% heads",
  mode: "coin",
  trials: 5000,
  pHeadsPct: 72,
  seed: 7,
};

export const FAIR_DIE_PRESET: ExperimentPreset = {
  id: "fair-die",
  label: "Fair die (600)",
  mode: "dice",
  trials: 600,
  sides: 6,
  seed: 42,
};

export const MANY_DICE_PRESET: ExperimentPreset = {
  id: "many-dice",
  label: "LLN die (5000)",
  mode: "dice",
  trials: 5000,
  sides: 6,
  seed: 99,
};

export const PRESETS: ExperimentPreset[] = [
  CHAOTIC_COIN_PRESET,
  LLN_FAIR_COIN_PRESET,
  BIASED_COIN_PRESET,
  FAIR_DIE_PRESET,
  MANY_DICE_PRESET,
];

function nextUniform(seed: number): { value: number; seed: number } {
  const s = (seed * 1103515245 + 12345) & 0x7fffffff;
  return { value: s / 0x7fffffff, seed: s };
}

export type CoinFlipResult = {
  heads: number;
  tails: number;
  headsFrac: number;
  runningHeadsFrac: number[];
};

/** Seeded Bernoulli trials; runningHeadsFrac[i] = fraction heads after i+1 flips. */
export function simulateCoinFlips(n: number, pHeads: number, seed = 42): CoinFlipResult {
  let s = seed;
  let heads = 0;
  const runningHeadsFrac: number[] = [];
  for (let i = 0; i < n; i++) {
    const step = nextUniform(s);
    s = step.seed;
    if (step.value < pHeads) heads++;
    runningHeadsFrac.push(heads / (i + 1));
  }
  return {
    heads,
    tails: n - heads,
    headsFrac: n > 0 ? heads / n : 0,
    runningHeadsFrac,
  };
}

export type DiceRollResult = {
  hist: number[];
  sides: number;
  sampleMean: number;
  runningMeans: number[];
};

/** Fair die rolls (seeded LCG; same recipe as legacy DiceLab / minisim). */
export function simulateDiceRolls(n: number, sides: number, seed = 42): DiceRollResult {
  let s = seed;
  const hist = Array(sides).fill(0);
  const runningMeans: number[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % sides;
    hist[idx]++;
    sum += idx + 1;
    runningMeans.push(sum / (i + 1));
  }
  return {
    hist,
    sides,
    sampleMean: n > 0 ? sum / n : 0,
    runningMeans,
  };
}

export function empiricalProbsFromHist(hist: number[]): number[] {
  const n = hist.reduce((a, b) => a + b, 0);
  if (n === 0) return hist.map(() => 0);
  return hist.map((c) => c / n);
}

export function empiricalCoinProbs(heads: number, tails: number): number[] {
  const n = heads + tails;
  if (n === 0) return [0, 0];
  return [heads / n, tails / n];
}
