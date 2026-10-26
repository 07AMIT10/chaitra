import type { LevelMeta } from "../../types";

export const knapsack01Meta: LevelMeta = {
  slug: "knapsack-0-1",
  number: 14,
  act: 2,
  title: "The Ten-Kilo Ceiling",
  algorithm: "0/1 Knapsack",
  page: "/algorithms/programming/knapsack-0-1",
  minutes: 3,
  scenario: {
    from: "SUMMIT LOG",
    code: "REPAIR 14",
    lines: [
      "Ten kilograms is the limit. Three modules: tent 6 kg / 42, stove 5 kg / 30, food 5 kg / 28.",
      "The density gauge takes the tent at 7.0 per kilo and stalls at 42 with 4 kg of dead air.",
      "Fractional relaxation promises 66; the modules cannot be sawn. The lattice's corner reads 58.",
    ],
    question: "Does the tent go in the pack?",
  },
  goal: "Close the pack at 58 by taking the stove and the food, not the tent's greedy 42.",
  constraint:
    "Every module is indivisible and the pack holds 10 kg. Taking the tent leaves 4 kg, less than either 5 kg module.",
  hints: [
    "The tent's ratio is 7.0, the highest on the ice. It also leaves 4 kg, and both remaining modules weigh 5.",
    "The corner cell (3,10) reads 58. Trace (3,10) → (2,5) → (1,0) → (0,0): food and stove, skipping the tent.",
  ],
  win: "Stove and food: 5 + 5 = 10 kg, 30 + 28 = 58. Cell (3,10) reads 58; the fractional ceiling was 66.",
  invariant:
    "The knapsack recurrence V(i,c) = max(V(i−1,c), vᵢ + V(i−1,c−wᵢ)). The corner reads 58; greedy density stops at 42, and the integrality gap to 66 is 8.",
};
