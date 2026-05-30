import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expectedNewInfections,
  logConvergenceRoundsEstimate,
} from "./gossip-math.ts";

describe("expectedNewInfections", () => {
  it("returns 0 when all nodes infected", () => {
    assert.equal(expectedNewInfections(10, 10, 3), 0);
  });

  it("returns positive value for partial spread", () => {
    const n = expectedNewInfections(100, 5, 3);
    assert.ok(n > 0 && n < 95);
  });

  it("increases with more infected nodes", () => {
    const low = expectedNewInfections(100, 2, 3);
    const high = expectedNewInfections(100, 20, 3);
    assert.ok(high > low);
  });
});

describe("logConvergenceRoundsEstimate", () => {
  it("grows sublinearly with n", () => {
    const small = logConvergenceRoundsEstimate(100, 3);
    const large = logConvergenceRoundsEstimate(10000, 3);
    assert.ok(large > small);
    assert.ok(large < small * 3);
  });

  it("returns 0 for n≤1", () => {
    assert.equal(logConvergenceRoundsEstimate(1, 3), 0);
  });
});
