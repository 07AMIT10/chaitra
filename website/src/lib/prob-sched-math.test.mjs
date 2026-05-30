import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  successProbability,
  heuristicMaxLoadRandom,
  optimalMaxLoad,
} from "./prob-sched-math.ts";

describe("successProbability", () => {
  it("returns 1 - (1-p)^k", () => {
    assert.equal(successProbability(0.5, 2), 0.75);
  });

  it("increases with sample size", () => {
    const k1 = successProbability(0.3, 1);
    const k5 = successProbability(0.3, 5);
    assert.ok(k5 > k1);
  });

  it("returns 0 for k=0", () => {
    assert.equal(successProbability(0.5, 0), 0);
  });
});

describe("heuristicMaxLoadRandom", () => {
  it("exceeds optimal for large task counts", () => {
    const heuristic = heuristicMaxLoadRandom(1000, 10);
    const optimal = optimalMaxLoad(1000, 10);
    assert.ok(heuristic > optimal);
  });
});

describe("optimalMaxLoad", () => {
  it("returns ceil(tasks/workers)", () => {
    assert.equal(optimalMaxLoad(10, 3), 4);
  });
});
