import type { LevelMeta } from "../../types";

export const huffmanCodingMeta: LevelMeta = {
  slug: "huffman-coding",
  number: 5,
  act: 1,
  title: "The 40-Gram Graft",
  algorithm: "Huffman Coding",
  page: "/algorithms/programming/huffman-coding",
  minutes: 3,
  scenario: {
    from: "RELAY BUFFER",
    code: "REPAIR 05",
    lines: [
      "Six telemetry channels crowd the downlink: A 40, B 25, C 15, D 10, E 5, F 5.",
      "A fixed-width code spends three bits per symbol. A graft made too high stays in the bill.",
      "The downlink is at its limit; the optimal tree reaches 2.25 bits per symbol.",
    ],
    question: "Which two roots do you graft first?",
  },
  goal: "Graft the six symbols into one tree with L = 2.25 bits per symbol.",
  constraint:
    "Each graft adds the two root weights to the bill, and L is that bill over 100. A stem paid early stays in the bill, so an optimal graft takes the two lightest roots.",
  hints: [
    "The two lightest roots are E = 5 and F = 5. Their 10-unit stem is the first graft of the optimal tree.",
    "After E + F, the lightest roots are the new 10 and D = 10. Graft those next; the optimal bill is 2.25 against H = 2.2037.",
  ],
  win: "One tree. L = 2.25 bits/symbol: the 40-gram symbol at depth 1, the two 5-gram symbols at depth 5.",
  invariant:
    "Huffman's exchange argument: merging the two lightest roots attains the minimum L* = 2.25 for these six weights, whose sum is 100. That is above H = 2.2037 and below H + 1.",
};
