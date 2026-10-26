import type { LevelMeta } from "../../types";

export const newtonMethodMeta: LevelMeta = {
  slug: "newton-method",
  number: 21,
  act: 3,
  title: "Eleven Steps to a Thousand Digits",
  algorithm: "Newton's Method",
  page: "/algorithms/programming/newton-method",
  minutes: 3,
  scenario: {
    from: "ORBITAL GUIDANCE",
    code: "REPAIR 21",
    lines: [
      "The insertion thruster needs twelve correct digits of √2. The loop starts at x₀ = 1.2 on f(x) = x² − 2.",
      "The manual quotes eleven tangent steps to a thousand digits, against 3,322 bisections. This burn needs twelve and has four firings.",
      "A damped half-step is gentler. A bracket step is safer. Only the full tangent step squares the error.",
    ],
    question: "How do you spend the four firings?",
  },
  goal: "Reach 12 correct digits of √2 within four firings, then stop.",
  constraint:
    "A full tangent step squares the error; a half-step only halves it, and the fourth firing is the last.",
  hints: [
    "A full step is x − (x² − 2)/(2x). From 1.2 it lands at 1.4333, then 1.41434.",
    "The error ratio at √2 is 1/(2√2) = 0.3536. Four full steps take 1.2 to 1.414213562373095.",
  ],
  win: "Four tangent firings: x = 1.414213562373095 clears twelve digits with residual 4.4×10⁻¹⁶.",
  invariant:
    "Newton's map has derivative zero at a simple root, so eₙ₊₁ ≈ (1/(2√2)) eₙ² = 0.3536 eₙ²; four full steps from x₀ = 1.2 reach 1.414213562373095.",
};
