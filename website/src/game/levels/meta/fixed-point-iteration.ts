import type { LevelMeta } from "../../types";

export const fixedPointIterationMeta: LevelMeta = {
  slug: "fixed-point-iteration",
  number: 22,
  act: 3,
  title: "The 23,025-Step Lie",
  algorithm: "Fixed-Point Iteration",
  page: "/algorithms/programming/fixed-point-iteration",
  minutes: 3,
  scenario: {
    from: "ATMOSPHERIC SCRUBBER",
    code: "REPAIR 22",
    lines: [
      "The recirculation loop is x ← cos x with contraction q = 0.6736. At q = 0.9999 one correct digit would cost 23,025 steps.",
      "The old gauge halts when the last step looks small. Late in the run the step falls below 0.001 while the bound is still above it.",
      "The log accepts only the certificate qⁿ/(1−q)·|x₁−x₀| ≤ 0.001.",
    ],
    question: "When does the bound let you stop?",
  },
  goal: "Run the loop in check-sized batches and stop at the first n where qⁿ/(1−q)·|x₁−x₀| ≤ 10⁻³; the clean run stops at n = 19.",
  constraint:
    "A small step is not a small error; the certificate is the bound, not the needle. Batch checks land at n = 5, 10, 15, 17 and 19; stop only when the bound is at most 0.001.",
  hints: [
    "Run to each check. At n = 17 the step is 0.000807 and the bound is 0.001704; at n = 18 the bound is 0.001148. A small step is not a small error.",
    "The first n with the bound ≤ 0.001 is 19, where q¹⁹/(1−q)·0.4597 = 0.000773. Stop there, not at 17.",
  ],
  win: "The bound first falls below 0.001 at n = 19, where 0.000773 carries an actual error of 0.000147; a small step was never the certificate.",
  invariant:
    "With q = 0.6736 and |x₁−x₀| = 0.4597, the a priori bound qⁿ/(1−q)·0.4597 first falls below 10⁻³ at n = 19; the actual error is 0.000147.",
};
