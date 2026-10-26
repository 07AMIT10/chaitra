import type { LevelMeta } from "../../types";

export const bellmanFordMeta: LevelMeta = {
  slug: "bellman-ford",
  number: 17,
  act: 3,
  title: "The Fourth Round Is the Certificate",
  algorithm: "Bellman–Ford",
  page: "/algorithms/programming/bellman-ford",
  minutes: 4,
  scenario: {
    from: "NAVIGATION RELAY",
    code: "REPAIR 17",
    lines: [
      "The relay holds five towns and six one-way roads. One road is negative: R→T is −4 and closes no loop.",
      "Dijkstra's autopilot froze T at 12 on its first pass, then refused to lower it.",
      "Relax one road per round. The negative road only pays after the wavefront reaches R.",
    ],
    question: "Which road do you relax in round one?",
  },
  goal: "Reach d(T) = 3 and certify the freeze; a clean certificate is round 4.",
  constraint:
    "One road per round; a label only falls. Certify only after T reads 3 and no incoming road can lower it.",
  hints: [
    "Start at S; the negative road cannot help until P→R has reached R.",
    "S→P sets P = 4, P→R sets R = 7, R→T sets T = 3. Q already reads 5; S→Q spends a round.",
  ],
  win: "d(T) = 3 and no incoming road lowers it. The row is 0, 4, 5, 7, 3; the certificate closes T's freeze.",
  invariant:
    "The Bellman equation's least fixed point: each round only lowers labels, and after n−1 = 4 rounds the vector is fixed. Here three rounds lower the row to 0, 4, 5, 7, 3; the fourth certifies T's freeze.",
};
