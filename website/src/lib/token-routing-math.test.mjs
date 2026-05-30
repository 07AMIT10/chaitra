import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  idealLoadPerExpert,
  loadImbalanceRatio,
  coefficientOfVariation,
} from "./token-routing-math.ts";

describe("idealLoadPerExpert", () => {
  it("distributes tokens×topK evenly across experts", () => {
    assert.equal(idealLoadPerExpert(100, 2, 4), 50);
  });

  it("returns 0 for zero experts", () => {
    assert.equal(idealLoadPerExpert(100, 2, 0), 0);
  });
});

describe("loadImbalanceRatio", () => {
  it("returns 1 when max equals ideal", () => {
    assert.equal(loadImbalanceRatio(50, 50), 1);
  });

  it("increases when max exceeds ideal", () => {
    assert.ok(loadImbalanceRatio(100, 50) > 1);
  });
});

describe("coefficientOfVariation", () => {
  it("returns 0 for uniform loads", () => {
    assert.equal(coefficientOfVariation([10, 10, 10]), 0);
  });

  it("increases with spread", () => {
    const low = coefficientOfVariation([10, 11, 9]);
    const high = coefficientOfVariation([1, 10, 19]);
    assert.ok(high > low);
  });
});
