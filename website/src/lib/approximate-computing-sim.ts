/**
 * Simulations for ApproximateComputingLab.
 */

import { quantize } from "./approximate-computing-math";

export type QuantRangePreset = "demo" | "unit" | "symmetric" | "weight";

export const QUANT_PRESETS: Record<
  QuantRangePreset,
  { alpha: number; beta: number; label: string; defaultX: number }
> = {
  demo: { alpha: 0, beta: 4, label: "[0, 4] demo", defaultX: Math.PI },
  unit: { alpha: 0, beta: 1, label: "[0, 1]", defaultX: 0.42 },
  symmetric: { alpha: -1, beta: 1, label: "[−1, 1]", defaultX: 0.3 },
  weight: { alpha: -1, beta: 1, label: "Weight-like", defaultX: 0.15 },
};

export type HistogramMode = "uniform" | "gaussian";

function lcg(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function unitRandom(seed: number): [number, number] {
  const next = lcg(seed);
  return [next / 0xffffffff, next];
}

/** ~200 samples in [alpha, beta] for histogram. */
export function sampleForHistogram(
  alpha: number,
  beta: number,
  mode: HistogramMode,
  count: number,
  seed: number
): number[] {
  const out: number[] = [];
  let s = seed;
  const span = beta - alpha;
  for (let i = 0; i < count; i++) {
    let [u, next] = unitRandom(s);
    s = next;
    if (mode === "gaussian") {
      let sum = 0;
      for (let j = 0; j < 12; j++) {
        const [v, n] = unitRandom(s);
        s = n;
        sum += v;
      }
      u = sum / 12;
    }
    out.push(alpha + u * span);
  }
  return out;
}

export function buildHistogramBins(
  samples: number[],
  alpha: number,
  beta: number,
  bits: number,
  binCount = 24
): { raw: number[]; quantized: number[] } {
  const raw = new Array(binCount).fill(0);
  const quantized = new Array(binCount).fill(0);
  const span = beta - alpha || 1;
  for (const x of samples) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor(((x - alpha) / span) * binCount)));
    raw[idx]++;
    const xq = quantize(x, alpha, beta, bits);
    const qIdx = Math.min(
      binCount - 1,
      Math.max(0, Math.floor(((xq - alpha) / span) * binCount))
    );
    quantized[qIdx]++;
  }
  return { raw, quantized };
}

export function energyCurveSamples(
  vMin: number,
  vMax: number,
  steps: number,
  vTh: number,
  k: number
): { v: number; power: number; err: number }[] {
  const out: { v: number; power: number; err: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = vMin + ((vMax - vMin) * i) / steps;
    const power = v * v;
    const err = 1 / (1 + Math.exp(k * (v - vTh)));
    out.push({ v, power, err });
  }
  return out;
}

export type LoopSignalMode = "sine" | "noisy";

export function generateSignalValues(N: number, mode: LoopSignalMode, seed: number): number[] {
  const values: number[] = [];
  if (mode === "sine") {
    for (let i = 0; i < N; i++) {
      values.push(Math.sin((2 * Math.PI * i) / Math.max(N, 1)));
    }
    return values;
  }
  let s = seed;
  let walk = 0;
  for (let i = 0; i < N; i++) {
    const [u, next] = unitRandom(s);
    s = next;
    walk += (u - 0.5) * 0.2;
    values.push(walk);
  }
  return values;
}

export function simulateLoopPerforation(
  values: number[],
  skipRate: number,
  seed: number
): { exactMean: number; perforatedMean: number; executed: number } {
  const N = values.length;
  const exactMean = values.reduce((a, b) => a + b, 0) / N;
  let sum = 0;
  let executed = 0;
  let s = seed;
  for (let i = 0; i < N; i++) {
    const [u, next] = unitRandom(s);
    s = next;
    if (u < skipRate) continue;
    sum += values[i];
    executed++;
  }
  const perforatedMean = executed > 0 ? sum / executed : 0;
  return { exactMean, perforatedMean, executed };
}

/** Running means for chart (subsampled for display). */
export function runningMeans(
  values: number[],
  skipRate: number,
  seed: number,
  maxPoints: number
): { i: number; exact: number; perforated: number }[] {
  const N = values.length;
  const step = Math.max(1, Math.floor(N / maxPoints));
  const out: { i: number; exact: number; perforated: number }[] = [];
  let exactSum = 0;
  let perfSum = 0;
  let perfCount = 0;
  let s = seed;
  for (let i = 0; i < N; i++) {
    exactSum += values[i];
    const [u, next] = unitRandom(s);
    s = next;
    if (u >= skipRate) {
      perfSum += values[i];
      perfCount++;
    }
    if (i % step === 0 || i === N - 1) {
      out.push({
        i: i + 1,
        exact: exactSum / (i + 1),
        perforated: perfCount > 0 ? perfSum / perfCount : 0,
      });
    }
  }
  return out;
}

export const LOOP_N_PRESETS = [
  { id: "1k", label: "N = 1k", N: 1000 },
  { id: "10k", label: "N = 10k", N: 10000 },
  { id: "100k", label: "N = 100k", N: 100000 },
] as const;
