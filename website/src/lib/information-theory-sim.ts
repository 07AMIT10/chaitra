/**
 * Symbol distributions for the information-theory lab (README coin & stream examples).
 */

export type SymbolPresetId = "fair" | "biased" | "skewed-stream" | "uniform-four";

export type SymbolPreset = {
  id: SymbolPresetId;
  label: string;
  symbols: string[];
  /** Base probabilities before optional 2-symbol slider tweak. */
  probs: number[];
  /** When true, lab exposes P(first symbol) slider. */
  tunableTwoSymbol?: boolean;
};

export const FAIR_COIN: SymbolPreset = {
  id: "fair",
  label: "Fair coin",
  symbols: ["H", "T"],
  probs: [0.5, 0.5],
  tunableTwoSymbol: true,
};

export const BIASED_COIN: SymbolPreset = {
  id: "biased",
  label: "Biased coin (99/1)",
  symbols: ["H", "T"],
  probs: [0.99, 0.01],
  tunableTwoSymbol: true,
};

/** Low-entropy 4-symbol stream (predictable like 9×A, 1×B). */
export const SKEWED_STREAM: SymbolPreset = {
  id: "skewed-stream",
  label: "Skewed stream (4 symbols)",
  symbols: ["A", "B", "C", "D"],
  probs: [0.72, 0.12, 0.1, 0.06],
};

export const UNIFORM_FOUR: SymbolPreset = {
  id: "uniform-four",
  label: "Uniform (4 symbols)",
  symbols: ["A", "B", "C", "D"],
  probs: [0.25, 0.25, 0.25, 0.25],
};

export const PRESETS: SymbolPreset[] = [
  FAIR_COIN,
  BIASED_COIN,
  SKEWED_STREAM,
  UNIFORM_FOUR,
];

export function getPreset(id: SymbolPresetId): SymbolPreset {
  return PRESETS.find((p) => p.id === id) ?? FAIR_COIN;
}

/** Two-symbol distribution with P(first) = p0 (percent 1–99 in UI). */
export function twoSymbolProbs(p0Pct: number): number[] {
  const p0 = Math.min(0.99, Math.max(0.01, p0Pct / 100));
  return [p0, 1 - p0];
}

export function resolveDistribution(
  preset: SymbolPreset,
  p0Pct: number
): { symbols: string[]; probs: number[] } {
  if (preset.tunableTwoSymbol && preset.symbols.length === 2) {
    return { symbols: preset.symbols, probs: twoSymbolProbs(p0Pct) };
  }
  return { symbols: preset.symbols, probs: [...preset.probs] };
}

export const FAIR_PRESET = { presetId: "fair" as const, p0Pct: 50 };
export const BIASED_PRESET = { presetId: "biased" as const, p0Pct: 99 };
export const SKEWED_PRESET = { presetId: "skewed-stream" as const, p0Pct: 72 };
export const UNIFORM_PRESET = { presetId: "uniform-four" as const, p0Pct: 25 };
