import { md5Hex } from "./md5";

/** Hash indices — mirrors bloom_filter.py (item + str(i), MD5, mod m) */
export function bloomHashIndices(item: string, k: number, m: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < k; i++) {
    const digest = md5Hex(item + String(i));
    indices.push(parseInt(digest, 16) % m);
  }
  return indices;
}

export function buildBitArray(keys: Iterable<string>, k: number, m: number): Uint8Array {
  const bits = new Uint8Array(m);
  for (const key of keys) {
    for (const idx of bloomHashIndices(key, k, m)) {
      bits[idx] = 1;
    }
  }
  return bits;
}

export function bloomMaybeContains(
  bits: Uint8Array,
  item: string,
  k: number,
  m: number
): { present: boolean; indices: number[] } {
  const indices = bloomHashIndices(item, k, m);
  const present = indices.every((idx) => bits[idx] === 1);
  return { present, indices };
}

export const DEMO_PRESENT = [
  "abound",
  "abounds",
  "abundance",
  "abundant",
  "accessible",
  "adjustable",
  "adjustment",
  "affordable",
] as const;

export const DEMO_ABSENT = ["bluff", "cheater", "hate", "war", "humanity"] as const;
