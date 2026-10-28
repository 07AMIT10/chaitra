import type { LevelMeta } from "../../types";

export const minimumSpanningTreeMeta: LevelMeta = {
  slug: "minimum-spanning-tree",
  number: 10,
  act: 2,
  title: "Two of Twenty-Four",
  algorithm: "Minimum Spanning Tree",
  page: "/algorithms/programming/minimum-spanning-tree",
  minutes: 4,
  scenario: {
    from: "POWER GRID",
    code: "REPAIR 10",
    lines: [
      "No interconnect between six dome habitats. Eight copper bridges remain, and the conduit budget is a total weight of 6.",
      "The survey enumerates 24 spanning grids; exactly 2 weigh 6.",
      "Every weld must be the lightest bridge leaving the growing island.",
    ],
    question: "Which bridge do you weld first?",
  },
  goal: "Weld five bridges into one grid with total weight 6.",
  constraint:
    "Weld only a bridge that leaves the growing island, and only the lightest bridge across that cut; a bridge inside the island closes a cycle.",
  hints: [
    "From A the cut holds A–D at 1 and A–B at 2. Weld A–D.",
    "After A–D, the cut holds A–B 2, D–E 2 and B–D 3; either 2 is safe, and the 3 is not.",
  ],
  win: "Five welds, total 6: one of the two minimum grids. The span is complete.",
  invariant:
    "The cut property: the lightest bridge across a cut lies in some minimum tree. This graph has exactly 2 minimum trees of weight 6 among its 24 spanning trees.",
};
