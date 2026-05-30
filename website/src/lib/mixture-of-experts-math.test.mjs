import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expertGateScores,
  softmax,
  topKExpertIndices,
  activeExpertFraction,
} from "./mixture-of-experts-math.ts";

describe("expertGateScores", () => {
  it("computes dot product per expert", () => {
    const scores = expertGateScores([1, 0], [[1, 0], [0, 1]]);
    assert.deepEqual(scores, [1, 0]);
  });
});

describe("softmax", () => {
  it("sums to 1", () => {
    const w = softmax([1, 2, 3]);
    const sum = w.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-10);
  });
});

describe("topKExpertIndices", () => {
  it("returns k highest-scoring expert indices", () => {
    const indices = topKExpertIndices([0.1, 0.9, 0.5], 2);
    assert.deepEqual(indices, [1, 2]);
  });
});

describe("activeExpertFraction", () => {
  it("returns topK/numExperts", () => {
    assert.equal(activeExpertFraction(8, 2), 0.25);
  });
});
