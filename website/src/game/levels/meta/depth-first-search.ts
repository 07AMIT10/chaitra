import type { LevelMeta } from "../../types";

export const depthFirstSearchMeta: LevelMeta = {
  slug: "depth-first-search",
  number: 8,
  act: 1,
  title: "One Back Edge in Nine Arcs",
  algorithm: "Depth-First Search",
  page: "/algorithms/programming/depth-first-search",
  minutes: 4,
  scenario: {
    from: "DERELICT LOG",
    code: "REPAIR 08",
    lines: [
      "The drone has twelve ticks for six chambers beneath Sector 6; nine one-way ducts connect them.",
      "Visited flags record where it went, not when a frame closed. Without the second clock, a cross duct reads like a back edge.",
      "The same clock stamps entry and return; the intervals nest or stay disjoint.",
    ],
    question: "Which duct does the drone dive from A first?",
  },
  goal: "Timestamp all six chambers with 12 ticks, close every frame, and record E→A as the single back edge.",
  constraint:
    "Dive only from the stack top, and return only the innermost frame after its arcs are examined. Intervals nest or stay disjoint.",
  hints: [
    "Start with A→B: the manual opens A 1–12, B 2–7, D 3–6, E 4–5.",
    "At E, E→A points to A, still open at tick 1. That is the back edge; C→D and F→D reach a finished D and are cross edges.",
  ],
  win: "Twelve ticks, six closed intervals, one back edge: E→A. The digraph has a cycle.",
  invariant:
    "The parenthesis theorem: every vertex gets d[v] and f[v], and its interval nests inside or stays disjoint from every other. Twelve ticks across six vertices leave exactly one back edge, E→A.",
};
