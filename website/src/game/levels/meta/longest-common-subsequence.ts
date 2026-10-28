import type { LevelMeta } from "../../types";

export const longestCommonSubsequenceMeta: LevelMeta = {
  slug: "longest-common-subsequence",
  number: 16,
  act: 2,
  title: "The Surviving Thread",
  algorithm: "Longest Common Subsequence",
  page: "/algorithms/programming/longest-common-subsequence",
  minutes: 4,
  scenario: {
    from: "FLIGHT RECORDER",
    code: "REPAIR 16",
    lines: [
      "The burn left two recorder logs: ABCBDAB and BDCABA, seven and six characters.",
      "Their shared thread is four letters long. A down or right step skips one character; a diagonal keeps a match.",
      "The prefix grid is eight rows by seven columns, 56 cells; the corner will read 4.",
    ],
    question: "Which cell do you step to from the empty prefix?",
  },
  goal: "Reach the corner (7,6) with four diagonals; the clean staircase spells BCAB.",
  constraint:
    "A diagonal is legal only when the two letters match; a down or right step skips one character.",
  hints: [
    "Step down first. A right step at (0,0) skips B's first B, and the best thread left is three.",
    "The clean thread is B at (2,1), C at (3,3), A at (6,4), B at (7,5).",
  ],
  win: "Four diagonals to the corner: B C A B. The corner cell reads 4.",
  invariant:
    "Every staircase spells a common subsequence, so the tallest staircase is the LCS; the 8×7 grid has 56 cells, the corner reads 4, and BCAB is one witness.",
};
