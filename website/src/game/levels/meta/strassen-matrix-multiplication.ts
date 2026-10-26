import type { LevelMeta } from "../../types";

export const strassenMatrixMultiplicationMeta: LevelMeta = {
  slug: "strassen-matrix-multiplication",
  number: 24,
  act: 3,
  title: "Seven Measurements",
  algorithm: "Strassen's Algorithm",
  page: "/algorithms/programming/strassen-matrix-multiplication",
  minutes: 5,
  scenario: {
    from: "ORBITAL TRACKING",
    code: "REPAIR 24",
    lines: [
      "The tracking grid multiplies 2×2 sensor blocks at dimension 2³⁰. Eight products per block leave 8³⁰ = 1.24×10²⁷ leaf products.",
      "Seven leave 7³⁰ = 2.25×10²⁵ — 55× fewer — and recover the same four outputs.",
      "A = [1 2; 3 4] and B = [5 6; 7 8]. The grid needs C = [19 22; 43 50].",
    ],
    question: "Which seven measurements do you buy?",
  },
  goal: "Choose the seven compound measurements, sign-route them into the four outputs, and assemble C = [[19,22],[43,50]] with seven products.",
  constraint:
    "A measurement is a product of sums or differences, never a single matrix entry; each sign must cancel a cross term the output does not need.",
  hints: [
    "The two single-entry rows a₁₁b₁₁ = 5 and a₂₂b₂₂ = 32 are schoolbook products; every one of the seven measurements is a product of sums or differences.",
    "c₁₂ takes M₃ = −2 and M₅ = 24. In c₁₁, M₅ enters with a minus: 65 + 8 − 24 − 30 = 19; adding it with a plus leaves 67, a residue of 48.",
  ],
  win: "C = [[19,22],[43,50]] from seven products. Every output carried only the measurements whose signs cancel the cross terms it does not need.",
  invariant:
    "Strassen's recurrence: M₁ through M₇ rebuild all four blocks — c₁₁ = M₁+M₄−M₅+M₇ = 19, c₁₂ = M₃+M₅ = 22, c₂₁ = M₂+M₄ = 43, c₂₂ = M₁−M₂+M₃+M₆ = 50 — and recursion gives T(n) = 7T(n/2) + Θ(n²), so Θ(n^log₂7) ≈ Θ(n^2.807).",
};
