import type { LevelMeta } from "../../types";

export const bipartiteMatchingMeta: LevelMeta = {
  slug: "bipartite-matching",
  number: 20,
  act: 3,
  title: "Ben's Resignation Chain",
  algorithm: "Bipartite Matching",
  page: "/algorithms/programming/bipartite-matching",
  minutes: 4,
  scenario: {
    from: "DOCKING DISPATCH",
    code: "REPAIR 20",
    lines: [
      "Greedy dispatch placed Ana in Wren and Cara in Yara, stopping at two berths. Ben and Dan are stranded.",
      "Four applicants, four roles, six acceptable edges. Ben accepts only Wren; Dan accepts only Yara.",
      "A resignation chain starts at a free applicant, alternates unmatched and matched edges, and ends at a free role.",
    ],
    question: "Which chain opens the third berth?",
  },
  goal: "Reach 3 placements by flipping the augmenting chain; the board's ceiling is 3.",
  constraint:
    "A chain starts and ends free, alternating unmatched and matched edges; a flip adds one placement and evicts nobody.",
  hints: [
    "Ben accepts only Wren, and Wren is held by Ana. From Ana, Xiu and Zed are free.",
    "Flip only when the chain ends at a free role. Ending at Wren would evict Ana and add nothing.",
  ],
  win: "Three placements: Ben–Wren and Ana–Xiu after the flip; Cara holds Yara; Dan has no augmenting route.",
  invariant:
    "Flipping an augmenting chain raises the matching by exactly one; with no chain left the size-3 matching is maximum (Berge), König's cover {Ana, Ben, Yara} has size 3, and Hall's set {Cara, Dan} has neighbourhood {Yara}, so 4 is impossible.",
};
