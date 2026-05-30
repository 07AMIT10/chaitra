import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  l1Distance,
  uniformRank,
  topNodeIndex,
  teleportMassPerNode,
} from "./pagerank-math.ts";

describe("l1Distance", () => {
  it("returns 0 for identical vectors", () => {
    assert.equal(l1Distance([0.5, 0.5], [0.5, 0.5]), 0);
  });

  it("returns 2 for opposite corners of simplex", () => {
    assert.equal(l1Distance([1, 0], [0, 1]), 2);
  });
});

describe("uniformRank", () => {
  it("returns 1/n for each node", () => {
    const r = uniformRank(4);
    assert.deepEqual(r, [0.25, 0.25, 0.25, 0.25]);
  });
});

describe("topNodeIndex", () => {
  it("returns index of maximum rank", () => {
    assert.equal(topNodeIndex([0.1, 0.7, 0.2]), 1);
  });
});

describe("teleportMassPerNode", () => {
  it("returns (1-d)/N", () => {
    assert.ok(Math.abs(teleportMassPerNode(4, 0.85) - 0.0375) < 1e-10);
  });
});
