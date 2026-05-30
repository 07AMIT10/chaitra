/** Softmax probabilities for toy logits at temperature T (> 0). */
export function softmaxAtTemperature(logits: number[], temperature: number): number[] {
  const t = Math.max(temperature, 0.05);
  const scaled = logits.map((x) => x / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function entropyBits(probs: number[]): number {
  return -probs.reduce((h, p) => (p > 0 ? h + p * Math.log2(p) : h), 0);
}
