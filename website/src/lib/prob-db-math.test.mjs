import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clamp01,
  probIndependentAnd,
  probIndependentOr,
  possibleWorldsCount,
} from "./prob-db-math.ts";

describe("clamp01", () => {
  it("clamps to [0, 1]", () => {
    assert.equal(clamp01(-0.5), 0);
    assert.equal(clamp01(1.5), 1);
    assert.equal(clamp01(0.5), 0.5);
  });
});

describe("probIndependentAnd", () => {
  it("multiplies confidences", () => {
    assert.equal(probIndependentAnd([0.5, 0.8]), 0.4);
  });

  it("returns 1 for empty list", () => {
    assert.equal(probIndependentAnd([]), 1);
  });
});

describe("probIndependentOr", () => {
  it("computes 1 - product(1-p)", () => {
    assert.equal(probIndependentOr([0.5, 0.5]), 0.75);
  });

  it("increases with more events", () => {
    const one = probIndependentOr([0.3]);
    const two = probIndependentOr([0.3, 0.3]);
    assert.ok(two > one);
  });
});

describe("possibleWorldsCount", () => {
  it("returns 2^n for small n", () => {
    assert.equal(possibleWorldsCount(3), 8);
  });
});
