import type { LevelMeta } from "../../types";

export const unionFindMeta: LevelMeta = {
  slug: "union-find",
  number: 1,
  act: 1,
  title: "Seal the Decks",
  algorithm: "Union–Find",
  page: "/algorithms/programming/union-find",
  minutes: 3,
  scenario: {
    from: "BULKHEAD CONTROL",
    code: "REPAIR 01",
    lines: [
      "Six compartments are open to vacuum. The bridge needs one pressure hull, not six.",
      "At 10⁹ elements the old registry wrote 10¹⁸ labels — 31.7 years at a billion writes a second.",
      "This hull has six compartments and a budget of nine writes.",
    ],
    question: "Which block should A join first?",
  },
  goal: "Connect all six compartments with at most 9 label writes; a clean run is 5.",
  constraint:
    "Relabeling a block of size k costs k writes. Keep the larger registry and move the smaller block into it.",
  hints: [
    "Start with a singleton and move it into another block. That costs one write.",
    "A merge pays the size of the block you rewrite; moving the smaller block keeps the total at O(n log n).",
  ],
  win: "One pressure hull. Five writes, one for each singleton moved into a larger block.",
  invariant:
    "Union by size: the smaller block at least doubles on every merge, so a compartment is relabeled at most O(log n) times and n merges cost O(n log n).",
};
