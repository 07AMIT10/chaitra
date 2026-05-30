import { attentionScores, softmax } from "./transformer-attention-math";

/** Toy sentence keys (4 words) for pronoun / context demo. */
export const SENTENCE_KEYS: { label: string; key: number[] }[] = [
  { label: "The", key: [0.2, 0.1] },
  { label: "animal", key: [0.95, 0.3] },
  { label: "street", key: [0.15, 0.85] },
  { label: "tired", key: [0.7, 0.9] },
];

export const SENTENCE_VALUES: number[][] = [
  [0.1, 0.0],
  [1.0, 0.2],
  [0.2, 1.0],
  [0.8, 0.95],
];

export const IT_QUERY: number[] = [0.92, 0.35];
export const STREET_QUERY: number[] = [0.2, 0.95];
export const ANIMAL_QUERY: number[] = [0.9, 0.25];

export function computeAttention(query: number[]) {
  const keys = SENTENCE_KEYS.map((k) => k.key);
  const scores = attentionScores(query, keys, keys[0]?.length ?? 2);
  const weights = softmax(scores);
  return { scores, weights, labels: SENTENCE_KEYS.map((k) => k.label) };
}

export const IT_PRONOUN_PRESET = { q0: 92, q1: 35 };
export const STREET_FOCUS_PRESET = { q0: 20, q1: 95 };
export const ANIMAL_FOCUS_PRESET = { q0: 90, q1: 25 };

export function queryFromSliders(q0Pct: number, q1Pct: number): number[] {
  return [q0Pct / 100, q1Pct / 100];
}
