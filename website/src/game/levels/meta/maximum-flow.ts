import type { LevelMeta } from "../../types";

export const maximumFlowMeta: LevelMeta = {
  slug: "maximum-flow",
  number: 18,
  act: 3,
  title: "The Fault Line Through the Interior",
  algorithm: "Maximum Flow",
  page: "/algorithms/programming/maximum-flow",
  minutes: 4,
  scenario: {
    from: "PRESSURE CONTROL",
    code: "REPAIR 18",
    lines: [
      "The manifold holds seven pipes and five junctions. The source can push 2 + 6 = 8; the sink can drink 7 + 3 = 10.",
      "A greedy run along s→a→b→c→t then s→b→t reads 5 and stops, blind to the interior fault line.",
      "The line {s,b} is worth 2 + 2 + 3 = 7. The missing units are a cancellation, not a new pipe.",
    ],
    question: "Which residual path reaches t?",
  },
  goal: "Raise the flow to 7, close the gap to 0, and certify the cut {s,b}; the clean run takes three augmentations.",
  constraint:
    "Every pipe stays within capacity and every junction conserves flow. A reverse residual pipe cancels flow already sent; it adds no capacity.",
  hints: [
    "Push 2 along s→a→b→c→t and 3 along s→b→t. The flow is 5 and a→b is full.",
    "The last 2 units go s→b→a→c→t: b→a cancels the a→b flow, and a→c still has room.",
  ],
  win: "Flow 7, gap 0. The reachable set {s,b} cuts s→a (2), b→c (2), and b→t (3); 2 + 2 + 3 = 7.",
  invariant:
    "Max-flow min-cut: no flow exceeds any cut. When no residual s→t path remains, the reachable set {s,b} has cut capacity 2 + 2 + 3 = 7, equal to the flow, so the gap is 0.",
};
