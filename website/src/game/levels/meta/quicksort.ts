import type { LevelMeta } from "../../types";

export const quicksortMeta: LevelMeta = {
  slug: "quicksort",
  number: 11,
  act: 2,
  title: "Don't Build the Chain",
  algorithm: "Quicksort",
  page: "/algorithms/programming/quicksort",
  minutes: 4,
  scenario: {
    from: "SORT CORE",
    code: "REPAIR 11",
    lines: [
      "The rack holds sixteen coolant keys, already in order. The sort core still pivots on the first key.",
      "On a hundred thousand presorted keys that habit costs 5×10⁹ comparisons and a stack 100,000 calls deep.",
      "This rack has sixteen keys. A median pivot pays 15 comparisons and leaves a 7–8 split; the first key leaves a chain.",
    ],
    question: "Which key do you freeze first?",
  },
  goal: "Freeze all sixteen keys within 58 comparisons and depth 5; a clean run stays within 44 comparisons at depth 4.",
  constraint:
    "A partition pays one comparison per other key in the active segment and freezes the pivot. The first or last key is legal, but it peels one key per level.",
  hints: [
    "Fifteen comparisons buy the first pivot. Choose the key that splits the sixteen most evenly.",
    "At 16 keys the exact average is 2(n+1)Hₙ − 4n = 50.94 comparisons. A median path costs 38; a first-element chain costs 120 with one pivot per level.",
  ],
  win: "Sixteen keys frozen in 38 comparisons at depth 4. Every pivot froze in its segment's middle two keys.",
  invariant:
    "E[C] = 2(n+1)Hₙ − 4n, which is 50.94 comparisons for 16 keys; sorted input with a first-element pivot is a chain of n(n−1)/2 = 120 comparisons, one pivot per level.",
};
