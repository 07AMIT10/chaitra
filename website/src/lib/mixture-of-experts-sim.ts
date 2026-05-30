import { expertGateScores, topKExpertIndices } from "./mixture-of-experts-math";

/** Toy expert weight rows (4-dim token embeddings). */
export const EXPERT_WEIGHTS: number[][] = [
  [0.9, 0.1, 0.2, 0.1],
  [0.1, 0.8, 0.1, 0.2],
  [0.2, 0.1, 0.7, 0.3],
  [0.1, 0.2, 0.3, 0.9],
];

export const TOKEN_PRESETS = [
  { id: "physics", label: "Physics token", embedding: [1, 0, 0, 0] as number[] },
  { id: "law", label: "Law token", embedding: [0, 1, 0, 0] as number[] },
  { id: "bio", label: "Bio token", embedding: [0, 0, 1, 0] as number[] },
  { id: "history", label: "History token", embedding: [0, 0, 0, 1] as number[] },
] as const;

export type TokenPresetId = (typeof TOKEN_PRESETS)[number]["id"];

export function getTokenPreset(id: TokenPresetId) {
  return TOKEN_PRESETS.find((p) => p.id === id) ?? TOKEN_PRESETS[0]!;
}

export function routeToken(token: number[], topK: number) {
  const scores = expertGateScores(token, EXPERT_WEIGHTS);
  const routed = topKExpertIndices(scores, topK);
  const probs = softmaxFromScores(scores);
  return { scores, routed, probs };
}

function softmaxFromScores(scores: number[]) {
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => (sum > 0 ? e / sum : 0));
}

export const QUANTUM_PRESET = { tokenId: "physics" as TokenPresetId, topK: 2 };
export const LAW_PRESET = { tokenId: "law" as TokenPresetId, topK: 2 };
export const TOP1_PRESET = { tokenId: "bio" as TokenPresetId, topK: 1 };
export const ALL_EXPERTS_PRESET = { tokenId: "history" as TokenPresetId, topK: 4 };
