import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  versionVectorMerge,
  staleReadProbability,
  replicationArrivalProbability,
  quorumSatisfied,
} from "./eventual-math.ts";

describe("versionVectorMerge", () => {
  it("takes component-wise max", () => {
    const merged = versionVectorMerge({ a: 1, b: 3 }, { a: 2, c: 1 });
    assert.deepEqual(merged, { a: 2, b: 3, c: 1 });
  });
});

describe("staleReadProbability", () => {
  it("returns 0 for single replica", () => {
    assert.equal(staleReadProbability(1, 1, 1), 0);
  });

  it("decreases as deltaT increases", () => {
    const early = staleReadProbability(3, 1, 0.1);
    const late = staleReadProbability(3, 1, 10);
    assert.ok(late < early);
  });
});

describe("replicationArrivalProbability", () => {
  it("approaches 1 for large deltaT", () => {
    const p = replicationArrivalProbability(1, 10);
    assert.ok(p > 0.99);
  });
});

describe("quorumSatisfied", () => {
  it("holds when W+R>N", () => {
    assert.equal(quorumSatisfied(5, 3, 3), true);
    assert.equal(quorumSatisfied(5, 2, 2), false);
  });
});
