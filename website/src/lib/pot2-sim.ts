/** Power-of-two-choices balls-into-bins simulation */

export function randomBin(n: number, rand: () => number): number {
  return Math.floor(rand() * n);
}

export function powerOfTwoBin(n: number, rand: () => number): number {
  const a = randomBin(n, rand);
  const b = randomBin(n, rand);
  return a <= b ? a : b;
}

export type BinStats = {
  bins: number[];
  maxLoad: number;
  avgLoad: number;
  emptyBins: number;
};

export function simulateBins(
  nBins: number,
  nBalls: number,
  strategy: "random" | "power-of-two",
  seed = 42
): BinStats {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const bins = Array(nBins).fill(0);
  for (let i = 0; i < nBalls; i++) {
    const bin =
      strategy === "random" ? randomBin(nBins, rand) : powerOfTwoBin(nBins, rand);
    bins[bin]++;
  }
  const maxLoad = Math.max(...bins);
  const avgLoad = nBalls / nBins;
  const emptyBins = bins.filter((b) => b === 0).length;
  return { bins, maxLoad, avgLoad, emptyBins };
}

export function runTrials(
  nBins: number,
  nBalls: number,
  trials: number,
  strategy: "random" | "power-of-two"
): { avgMax: number; avgEmpty: number } {
  let sumMax = 0;
  let sumEmpty = 0;
  for (let t = 0; t < trials; t++) {
    const stats = simulateBins(nBins, nBalls, strategy, 42 + t);
    sumMax += stats.maxLoad;
    sumEmpty += stats.emptyBins;
  }
  return { avgMax: sumMax / trials, avgEmpty: sumEmpty / trials };
}
