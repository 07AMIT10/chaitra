import type { LevelMeta } from "../../types";

export const floydWarshallMeta: LevelMeta = {
  slug: "floyd-warshall",
  number: 19,
  act: 3,
  title: "Four Arithmetics, One Cell",
  algorithm: "Floyd–Warshall",
  page: "/algorithms/programming/floyd-warshall",
  minutes: 3,
  scenario: {
    from: "ROUTE ARCHIVE",
    code: "REPAIR 19",
    lines: [
      "Four towns, five one-way roads, one 4×4 table. The same four lines close it under any arithmetic you name.",
      "Under one arithmetic cell A→D prints 2, the fewest roads. Under another it prints 3, the number of distinct routes.",
      "The ledger does not care which answer you prefer; it asks what the cell means.",
    ],
    question: "Which arithmetic makes A→D a count of routes?",
  },
  goal: "Read cell A→D as 3 distinct routes, not the distance 2.",
  constraint:
    "The four nested loops do not change; only ⊕ and ⊗ decide whether the closed cell is a distance, a count, a truth value or a longest route.",
  hints: [
    "A route count adds one per branch and multiplies along a road; a distance adds road lengths.",
    "Under (+, ×) the closure of A→D is 1 + 1 + 1 = 3. Under (min, +) it is 2.",
  ],
  win: "A→D reads 3: three distinct routes under (+, ×), not the distance 2.",
  invariant:
    "The semiring closure uses only ⊕, ⊗, 0 and 1; under (+, ×) cell A→D counts the three routes A→B→D, A→C→D and A→B→C→D.",
};
