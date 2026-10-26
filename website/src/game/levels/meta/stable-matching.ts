import type { LevelMeta } from "../../types";

export const stableMatchingMeta: LevelMeta = {
  slug: "stable-matching",
  number: 15,
  act: 2,
  title: "Three Rejections, Zero Blocking Pairs",
  algorithm: "Stable Matching",
  page: "/algorithms/programming/stable-matching",
  minutes: 3,
  scenario: {
    from: "MATCHING OFFICE",
    code: "REPAIR 15",
    lines: [
      "The roster holds four applicants and four posts; each side ranks the other in strict order.",
      "The old clearinghouse held two offers at one post; the roster closed with a pair who would rather defect.",
      "Deferred acceptance holds one offer per post, swaps only for a better rank, and sends the rest back down.",
    ],
    question: "Which free applicant do you advance, and which post does it approach?",
  },
  goal: "Fill all four posts with a matching that has zero blocking pairs; a clean run is the seven-offer, three-rejection walk down the lists.",
  constraint:
    "A post holds one offer and swaps only for a better rank; never repeat a post. The clean walk goes down each list in order.",
  hints: [
    "Start with the free applicants whose first choice is free: A→w, B→x, D→y.",
    "C is rejected by x, then y, then w before z holds it. A receiver only swaps for a better rank.",
  ],
  win: "Four pairs. The scan finds zero blocking pairs: no applicant and post would rather defect together.",
  invariant:
    "Gale–Shapley deferred acceptance never repeats a proposal, so it stops within |L|·|R| = 16 offers; here four rounds and three rejections end at zero blocking pairs.",
};
