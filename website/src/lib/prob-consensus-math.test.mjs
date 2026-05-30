import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  poissonPmf,
  nakamotoReversalProbability,
  nakamotoFinality,
  confirmationsForThreshold,
} from "./prob-consensus-math.ts";

describe("poissonPmf", () => {
  it("sums to ~1 over reasonable range", () => {
    const lambda = 3;
    let sum = 0;
    for (let k = 0; k <= 20; k++) sum += poissonPmf(k, lambda);
    assert.ok(Math.abs(sum - 1) < 1e-6);
  });

  it("returns 0 for negative k", () => {
    assert.equal(poissonPmf(-1, 5), 0);
  });
});

describe("nakamotoReversalProbability", () => {
  it("matches README table for q=0.1, z=5", () => {
    const p = nakamotoReversalProbability(5, 0.1);
    assert.ok(p > 0.0005 && p < 0.002, `Expected ~0.001, got ${p}`);
  });

  it("decreases with more confirmations", () => {
    const z1 = nakamotoReversalProbability(1, 0.1);
    const z10 = nakamotoReversalProbability(10, 0.1);
    assert.ok(z10 < z1);
  });
});

describe("nakamotoFinality", () => {
  it("complements reversal probability", () => {
    const rev = nakamotoReversalProbability(5, 0.1);
    assert.ok(Math.abs(nakamotoFinality(5, 0.1) - (1 - rev)) < 1e-10);
  });
});

describe("confirmationsForThreshold", () => {
  it("finds z for q=0.1 and maxReversal=0.001", () => {
    const z = confirmationsForThreshold(0.1, 0.001);
    assert.ok(z >= 4 && z <= 6);
  });
});
