import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  raftQuorum,
  maxCrashFailures,
  minNodesForCrashFaults,
  minNodesForByzantine,
  quorumIntersectionHolds,
} from "./consensus-math.ts";

describe("raftQuorum", () => {
  it("returns floor(N/2)+1", () => {
    assert.equal(raftQuorum(7), 4);
  });
});

describe("maxCrashFailures", () => {
  it("returns floor((N-1)/2)", () => {
    assert.equal(maxCrashFailures(7), 3);
  });
});

describe("minNodesForCrashFaults", () => {
  it("returns 2f+1", () => {
    assert.equal(minNodesForCrashFaults(2), 5);
  });
});

describe("minNodesForByzantine", () => {
  it("returns 3f+1", () => {
    assert.equal(minNodesForByzantine(1), 4);
  });
});

describe("quorumIntersectionHolds", () => {
  it("holds when 2Q > N", () => {
    assert.equal(quorumIntersectionHolds(3, 5), true);
    assert.equal(quorumIntersectionHolds(2, 5), false);
  });
});
