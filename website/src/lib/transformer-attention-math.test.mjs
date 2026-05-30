import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dotProduct,
  scaleFactor,
  softmax,
  attentionOutput,
  topAttentionIndex,
} from "./transformer-attention-math.ts";

describe("dotProduct", () => {
  it("computes standard inner product", () => {
    assert.equal(dotProduct([1, 2, 3], [4, 5, 6]), 32);
  });

  it("uses min length when vectors differ", () => {
    assert.equal(dotProduct([1, 2], [3, 4, 5]), 11);
  });
});

describe("scaleFactor", () => {
  it("returns 1/sqrt(dim) for positive dim", () => {
    assert.equal(scaleFactor(4), 0.5);
  });

  it("returns 1 for dim=0", () => {
    assert.equal(scaleFactor(0), 1);
  });
});

describe("softmax", () => {
  it("sums to 1", () => {
    const w = softmax([1, 2, 3]);
    const sum = w.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-10);
  });

  it("assigns highest weight to largest score", () => {
    const w = softmax([0, 5, 1]);
    assert.equal(topAttentionIndex(w), 1);
  });
});

describe("attentionOutput", () => {
  it("returns weighted sum of value vectors", () => {
    const out = attentionOutput([0.5, 0.5], [[2, 0], [0, 4]]);
    assert.equal(out[0], 1);
    assert.equal(out[1], 2);
  });
});
