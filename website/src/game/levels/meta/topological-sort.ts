import type { LevelMeta } from "../../types";

export const topologicalSortMeta: LevelMeta = {
  slug: "topological-sort",
  number: 4,
  act: 1,
  title: "Five Shadows",
  algorithm: "Topological Sort",
  page: "/algorithms/programming/topological-sort",
  minutes: 3,
  scenario: {
    from: "SHIP AI",
    code: "REPAIR 04",
    lines: [
      "Six turbine stages wait on seven pressure arcs. I can fire only a stage with no unmet prerequisite.",
      "Five of the 720 orders respect every arc. The other 715 put an arrow into the already-fired set.",
    ],
    question: "Which stage ignites first?",
  },
  goal: "Emit all six stages in one order that respects every arc; five of the 720 orders are valid.",
  constraint:
    "Only a stage with in-degree 0 in the remaining graph can ignite; the emitted set stays an order ideal.",
  hints: [
    "A is the only stage with in-degree 0. It must ignite first.",
    "After A, B and C are both free. D waits for both, and E waits for C; a blocked stage leaves an arc pointing backward.",
  ],
  win: "Six stages lit. The emitted set is an order ideal, and the sequence is one of the five linear extensions of the 720 orders.",
  invariant:
    "A task is emitted only at in-degree 0, so no arc enters the emitted set from a waiting task; exactly 5 of the 720 orders on six tasks are linear extensions.",
};
