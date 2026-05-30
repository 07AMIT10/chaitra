/** MoE gating scores and Top-K routing (toy dot-product router). */

export function dotProduct(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s;
}

export function expertGateScores(token: number[], expertWeights: number[][]): number[] {
  return expertWeights.map((w) => dotProduct(token, w));
}

export function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => (sum > 0 ? e / sum : 0));
}

export function topKExpertIndices(scores: number[], topK: number): number[] {
  const k = Math.max(1, Math.min(topK, scores.length));
  return scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.i);
}

export function activeExpertFraction(numExperts: number, topK: number): number {
  return topK / Math.max(1, numExperts);
}

export function formatScore(x: number, digits = 2): string {
  return x.toFixed(digits);
}

export function formatPercent(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}
