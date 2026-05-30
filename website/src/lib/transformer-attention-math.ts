/** Scaled dot-product attention (toy vectors). */

export function dotProduct(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s;
}

export function scaleFactor(dim: number): number {
  return dim > 0 ? 1 / Math.sqrt(dim) : 1;
}

export function attentionScores(query: number[], keys: number[][], dim?: number): number[] {
  const d = dim ?? query.length;
  const scale = scaleFactor(d);
  return keys.map((k) => scale * dotProduct(query, k));
}

export function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => (sum > 0 ? e / sum : 0));
}

export function attentionOutput(weights: number[], values: number[][]): number[] {
  const dim = values[0]?.length ?? 0;
  const out = Array(dim).fill(0);
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i]!;
    const v = values[i] ?? [];
    for (let j = 0; j < dim; j++) out[j]! += w * (v[j] ?? 0);
  }
  return out;
}

export function formatWeight(w: number, digits = 3): string {
  return w.toFixed(digits);
}

export function topAttentionIndex(weights: number[]): number {
  let best = 0;
  for (let i = 1; i < weights.length; i++) {
    if (weights[i]! > weights[best]!) best = i;
  }
  return best;
}
