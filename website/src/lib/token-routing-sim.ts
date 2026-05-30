import { topKExpertIndices } from "./mixture-of-experts-math";

function lcg(seed: number): number {
  return (seed * 1103515245 + 12345) & 0x7fffffff;
}

/** Seeded Top-K routing: each token draws random expert scores, routes to top K. */
export function simulateTopKTokenRouting(
  numExperts: number,
  numTokens: number,
  topK: number,
  seed: number
): number[] {
  const loads = Array(numExperts).fill(0);
  let s = seed;
  const k = Math.max(1, Math.min(topK, numExperts));
  for (let t = 0; t < numTokens; t++) {
    const scores: number[] = [];
    for (let e = 0; e < numExperts; e++) {
      s = lcg(s);
      scores.push(s / 0x7fffffff);
    }
    const picked = topKExpertIndices(scores, k);
    for (const idx of picked) loads[idx]++;
  }
  return loads;
}

/** Deterministic skew: all tokens prefer expert 0 (load imbalance demo). */
export function simulateSkewedRouting(
  numExperts: number,
  numTokens: number,
  topK: number
): number[] {
  const loads = Array(numExperts).fill(0);
  const k = Math.max(1, Math.min(topK, numExperts));
  for (let t = 0; t < numTokens; t++) {
    loads[0]++;
    for (let j = 1; j < k && j < numExperts; j++) loads[j]++;
  }
  return loads;
}

export const SWITCH_TOP1_PRESET = { experts: 8, tokens: 200, topK: 1, seed: 7 };
export const MIXTRAL_TOP2_PRESET = { experts: 8, tokens: 256, topK: 2, seed: 42 };
export const HOTSPOT_PRESET = { experts: 6, tokens: 180, topK: 2, skewed: true as const };
