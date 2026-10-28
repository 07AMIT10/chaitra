import type { LevelMeta } from "../../types";

export const dijkstraMeta: LevelMeta = {
  slug: "dijkstra",
  number: 9,
  act: 2,
  title: "Settle Third, Not Nearest",
  algorithm: "Dijkstra's Algorithm",
  page: "/algorithms/programming/dijkstra",
  minutes: 3,
  scenario: {
    from: "TRANSIT CONTROL",
    code: "REPAIR 09",
    lines: [
      "Source A is still live. Ten one-way roads cross seven towns.",
      "The old transit desk would spend 5×10¹⁵ probes on 10⁸ towns — fifty-eight days.",
      "This map has seven towns and one rule: take the least label.",
    ],
    question: "Which town's distance is carved in stone third?",
  },
  goal: "Settle all seven towns with their true distances; D's 2 must settle before B's direct 9.",
  constraint:
    "Settle the least frontier label. Non-negative roads mean no later wave can undercut a settled distance.",
  hints: [
    "From A the frontier holds C 1, F 6, B 9. C's 1 is least.",
    "After C settles, D enters at 2 — less than F's 6 and B's 9. The third stamp is D; B's direct 9 waits.",
  ],
  win: "Seven labels final: A 0, C 1, D 2, E 3, B 4, G 5, F 6. D settled third at 2 while B still read 9.",
  invariant:
    "Dijkstra's exchange argument: with w ≥ 0, the least frontier label is final and never drops. Here the labels settle 0, 1, 2, 3, 4, 5, 6; D's 2 is stamped before B's direct 9.",
};
