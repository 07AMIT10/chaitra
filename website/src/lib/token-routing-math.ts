/** Load balance metrics for Top-K token routing. */

export function idealLoadPerExpert(tokens: number, topK: number, experts: number): number {
  if (experts <= 0) return 0;
  return (tokens * topK) / experts;
}

export function loadImbalanceRatio(maxLoad: number, ideal: number): number {
  if (ideal <= 0) return maxLoad > 0 ? Infinity : 1;
  return maxLoad / ideal;
}

export function coefficientOfVariation(loads: number[]): number {
  const n = loads.length;
  if (n === 0) return 0;
  const mean = loads.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) return 0;
  const variance = loads.reduce((s, l) => s + (l - mean) ** 2, 0) / n;
  return Math.sqrt(variance) / mean;
}

export function formatLoad(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

export function formatRatio(x: number): string {
  return x >= 10 ? x.toFixed(1) : x.toFixed(2);
}
