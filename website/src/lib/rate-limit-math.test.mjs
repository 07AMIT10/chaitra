import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sreDropProbability, tokenBucketAcceptBound } from "./rate-limit-math.ts";

describe("sreDropProbability", () => {
  it("returns 0 when requests ≤ k×accepts", () => {
    assert.equal(sreDropProbability(10, 10, 2), 0);
  });

  it("increases when requests exceed k×accepts", () => {
    const p = sreDropProbability(100, 10, 2);
    assert.ok(p > 0 && p < 1);
  });

  it("returns 0 for zero requests", () => {
    assert.equal(sreDropProbability(0, 0), 0);
  });
});

describe("tokenBucketAcceptBound", () => {
  it("returns 1 when budget exceeds offered load", () => {
    assert.equal(tokenBucketAcceptBound(100, 10, 1, 10), 1);
  });

  it("returns budget/offered when load exceeds budget", () => {
    const bound = tokenBucketAcceptBound(10, 1, 100, 10);
    assert.ok(bound < 1 && bound > 0);
  });
});
