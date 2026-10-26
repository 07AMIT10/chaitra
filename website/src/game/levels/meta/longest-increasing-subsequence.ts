import type { LevelMeta } from "../../types";

export const longestIncreasingSubsequenceMeta: LevelMeta = {
  slug: "longest-increasing-subsequence",
  number: 13,
  act: 2,
  title: "Sensor Skyline",
  algorithm: "Longest Increasing Subsequence",
  page: "/algorithms/programming/longest-increasing-subsequence",
  minutes: 3,
  scenario: {
    from: "SENSOR ARRAY",
    code: "REPAIR 13",
    lines: [
      "Thermal frames arrive out of order: 4, 1, 5, 2, 6, 3. The array needs a rising chain before the next burst.",
      "A chain may skip frames, but both coordinates must climb: a later index and a larger reading.",
      "Patience will deal the same six into three piles; the skyline's height is three.",
    ],
    question: "Which reading starts the chain?",
  },
  goal: "Append later, larger readings until the chain reaches length 3; the skyline's best is 3.",
  constraint:
    "Each append must be a later reading with a larger value. A reading that leaves no third rise is rejected before it ends the chain.",
  hints: [
    "A chain of three needs two rises after its start. The largest reading, 6, has no later rise.",
    "The patience deal ends with three piles, tops 1 · 2 · 3. By Mirsky, the pile count equals the longest chain.",
  ],
  win: "A chain of three: 4 → 5 → 6. The skyline's height is 3, and the patience deal ends with 3 piles.",
  invariant:
    "A chain has i < j and pᵢ < pⱼ. By Mirsky's theorem the height is the fewest antichains; the six readings have height 3, and patience sorting ends with 3 piles (tops 1, 2, 3).",
};
