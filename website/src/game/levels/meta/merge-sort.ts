import type { LevelMeta } from "../../types";

export const mergeSortMeta: LevelMeta = {
  slug: "merge-sort",
  number: 7,
  act: 1,
  title: "The Ribbon Budget",
  algorithm: "Merge Sort",
  page: "/algorithms/programming/merge-sort",
  minutes: 4,
  scenario: {
    from: "SIGNAL LOOM",
    code: "REPAIR 07",
    lines: [
      "Eight timing ribbons are wound out of order: 1, 3, 2, 7, 4, 6, 5, 8.",
      "A billion scrambled keys would take 15.8 years of rescans; von Neumann's two-finger zipper does the same job in 28.9 seconds.",
      "This loom has eight keys and three levels, and every merge level pays its length.",
    ],
    question: "Where do you split the loom first?",
  },
  goal: "Split all eight ribbons to single keys at depth 3; the loom zips the siblings and must finish in 17 comparisons.",
  constraint:
    "Each split must fit the depth-3 room: 4 | 4 at the root, then 2 | 2, then 1 | 1. The loom zips a finished sibling pair and appends a drained run free.",
  hints: [
    "The root must split 4 | 4. A 1 | 7 child would need a fourth level; each 4-key run then splits 2 | 2.",
    "The loom zips as soon as both siblings are ready: four leaf zips pay 1 comparison each, the two 2-key zips pay 3, and the root pays 7.",
  ],
  win: "One sorted ribbon: 1 2 3 4 5 6 7 8 at depth 3, in 17 comparisons.",
  invariant:
    "Merging runs of lengths p and q costs at most p + q − 1 comparisons; for n = 2³ = 8 the exact worst case is 8·3 − 8 + 1 = 17.",
};
