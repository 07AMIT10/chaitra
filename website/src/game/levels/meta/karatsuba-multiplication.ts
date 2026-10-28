import type { LevelMeta } from "../../types";

export const karatsubaMultiplicationMeta: LevelMeta = {
  slug: "karatsuba-multiplication",
  number: 23,
  act: 3,
  title: "Three Measurements",
  algorithm: "Karatsuba Multiplication",
  page: "/algorithms/programming/karatsuba-multiplication",
  minutes: 4,
  scenario: {
    from: "RELAY MULTIPLIER",
    code: "REPAIR 23",
    lines: [
      "The relay's multiplier is burning reserve on 2²⁰-digit coordinate keys. Schoolbook leaves 4²⁰ = 1.1×10¹² leaf products.",
      "Karatsuba's three half-size measurements leave 3²⁰ = 3.49×10⁹ — 315× fewer — but the ledger has only three slots.",
      "The register pair is 1234 and 5678. Cut at base B = 100.",
    ],
    question: "Which three measurements do you buy?",
  },
  goal: "Buy three half-size products for 1234 × 5678, route the middle one, and assemble exactly 7,006,652 with nine leaves at depth 2.",
  constraint:
    "Each buy spends one of three product slots; the middle measurement must lose both squares before it becomes the cross-term sum.",
  hints: [
    "The two squares are 12 × 56 = 672 and 34 × 78 = 2,652. The third measurement adds before it multiplies: 46 × 134.",
    "z₁ = m − z₂ − z₀ = 6,164 − 672 − 2,652 = 2,840. A fourth product buys 936 and 1,904 separately.",
  ],
  win: "7,006,652 from three products. The middle measurement held both cross terms and both squares; two subtractions left 2,840.",
  invariant:
    "Karatsuba's recurrence T(n) = 3T(n/2) + Θ(n): the top split buys 3 products, depth 2 holds 3² = 9 leaves, and the product runs in Θ(n^log₂3) ≈ Θ(n^1.585) instead of Θ(n²).",
};
