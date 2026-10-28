import type { LevelMeta } from "../../types";

export const coinChangeMeta: LevelMeta = {
  slug: "coin-change",
  number: 6,
  act: 1,
  title: "Six Liters, Two Canisters",
  algorithm: "Coin Change",
  page: "/algorithms/programming/coin-change",
  minutes: 3,
  scenario: {
    from: "RATION BAY",
    code: "REPAIR 06",
    lines: [
      "The scrubber needs six liters of pressurization. The depot holds 1-, 3-, and 4-liter canisters.",
      "The dispensing arm grabs the 4 first and spends 4 + 1 + 1. Two 3s settle the same debt in two.",
    ],
    question: "Which canister do you spend first?",
  },
  goal: "Drain the 6 liters to 0; the clean run is 2 canisters, 3 + 3, not 4 + 1 + 1.",
  constraint:
    "Each spend must fit the liters remaining; the fewest canisters is the shortest path from 6 to 0, so a 4 that forces 1 + 1 loses to 3 + 3.",
  hints: [
    "A 4-liter canister leaves 2 liters. Only 1 fits, then another 1; that is three canisters.",
    "Skip 4. Spend 3 first; the second 3 lands on 0, and 2 is the shortest path from 6.",
  ],
  win: "0 liters left. 3 + 3 is the two-canister path; 4 + 1 + 1 is the greedy three.",
  invariant:
    "The amounts 0–6 are vertices and each coin a downward edge; the fewest canisters is the debt graph's shortest path from 6 to 0, and it reads 2.",
};
