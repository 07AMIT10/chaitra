import {
  INTEGRAL_X2_TRUE,
  isInsideQuarterCircle,
  piEstimate,
  piStandardError,
} from "./mc-systems-math";

export type McPoint = { x: number; y: number; inside: boolean };

export type PiSimResult = {
  samples: number;
  inside: number;
  estimate: number;
  stderr: number;
  points: McPoint[];
};

export type ConvergencePoint = {
  n: number;
  estimate: number;
  stderr: number;
  error: number;
};

export type IntegralSimResult = {
  samples: number;
  estimate: number;
  sampleVariance: number;
  stderr: number;
  trueValue: number;
};

function makeRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Log-spaced sample counts from minN to maxN (inclusive endpoints). */
export function convergenceCheckpoints(minN: number, maxN: number, steps: number): number[] {
  if (maxN <= minN) return [maxN];
  const out = new Set<number>();
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(steps - 1, 1);
    const n = Math.round(minN * Math.pow(maxN / minN, t));
    out.add(Math.min(maxN, Math.max(minN, n)));
  }
  out.add(maxN);
  return [...out].sort((a, b) => a - b);
}

export function simulatePi(samples: number, seed = 42, maxVizPoints = 600): PiSimResult {
  const rand = makeRand(seed);
  let inside = 0;
  const points: McPoint[] = [];
  for (let i = 0; i < samples; i++) {
    const x = rand();
    const y = rand();
    const insidePoint = isInsideQuarterCircle(x, y);
    if (insidePoint) inside++;
    if (i < maxVizPoints) points.push({ x, y, inside: insidePoint });
  }
  return {
    samples,
    inside,
    estimate: piEstimate(inside, samples),
    stderr: piStandardError(inside, samples),
    points,
  };
}

export function piConvergenceSeries(
  maxSamples: number,
  seed = 42,
  steps = 36
): ConvergencePoint[] {
  const rand = makeRand(seed);
  const checkpoints = convergenceCheckpoints(200, maxSamples, steps);
  let inside = 0;
  let i = 0;
  const series: ConvergencePoint[] = [];
  for (const target of checkpoints) {
    while (i < target) {
      const x = rand();
      const y = rand();
      if (isInsideQuarterCircle(x, y)) inside++;
      i++;
    }
    const estimate = piEstimate(inside, target);
    const stderr = piStandardError(inside, target);
    series.push({
      n: target,
      estimate,
      stderr,
      error: Math.abs(estimate - Math.PI),
    });
  }
  return series;
}

export function simulateIntegralXSquared(samples: number, seed = 42): IntegralSimResult {
  const rand = makeRand(seed);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < samples; i++) {
    const x = rand();
    const fx = x * x;
    sum += fx;
    sumSq += fx * fx;
  }
  const mean = sum / samples;
  const sampleVariance =
    samples > 1 ? (sumSq - (sum * sum) / samples) / (samples - 1) : 0;
  const stderr = Math.sqrt(sampleVariance / samples);
  return {
    samples,
    estimate: mean,
    sampleVariance,
    stderr,
    trueValue: INTEGRAL_X2_TRUE,
  };
}
