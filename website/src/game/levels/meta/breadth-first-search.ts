import type { LevelMeta } from "../../types";

export const breadthFirstSearchMeta: LevelMeta = {
  slug: "breadth-first-search",
  number: 3,
  act: 1,
  title: "The Chord at Depth Three",
  algorithm: "Breadth-First Search",
  page: "/algorithms/programming/breadth-first-search",
  minutes: 3,
  scenario: {
    from: "DAMAGE CONTROL",
    code: "REPAIR 03",
    lines: [
      "Venting in eight compartments, ring by ring, around S. The seal is at G; the perimeter route is four hops.",
      "The bulkhead chart carries an unused chord, C–G. A level queue proves the seal is three hops out.",
    ],
    question: "Which compartment does the queue stamp next?",
  },
  goal: "Stamp every reachable town from S and leave G reading 3 hops when the last one settles.",
  constraint:
    "Stamp only an unvisited neighbour of the queue front; a town's level is fixed the first time it is stamped.",
  hints: [
    "S is the front. A and B are both one hop away; either can be stamped first, and both wait in the queue.",
    "C reaches G directly. When C is the front, stamp G at level 3; the perimeter route through E or F is 4.",
  ],
  win: "Eight towns stamped. G reads 3 hops: S→A→C→G, one hop inside the perimeter's 4.",
  invariant:
    "The BFS level invariant: every edge joins levels that differ by at most one, and the queue drains level k before k+1, so first arrival fixes G at 3 hops.",
};
