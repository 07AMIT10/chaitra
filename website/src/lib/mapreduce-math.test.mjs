import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  noFailureProbability,
  expectedMaxExponential,
  expectedMinOfTwoExponential,
  backupSpeedup,
} from "./mapreduce-math.ts";

describe("noFailureProbability", () => {
  it("returns (1-p)^N", () => {
    assert.equal(noFailureProbability(0.1, 2), 0.81);
  });

  it("decreases with more servers", () => {
    const small = noFailureProbability(0.01, 10);
    const large = noFailureProbability(0.01, 100);
    assert.ok(large < small);
  });
});

describe("expectedMaxExponential", () => {
  it("returns ln(N)/λ for N>1", () => {
    assert.ok(Math.abs(expectedMaxExponential(10, 1) - Math.log(10)) < 1e-10);
  });

  it("increases with N", () => {
    assert.ok(expectedMaxExponential(100, 1) > expectedMaxExponential(10, 1));
  });
});

describe("expectedMinOfTwoExponential", () => {
  it("returns 1/(2λ)", () => {
    assert.equal(expectedMinOfTwoExponential(2), 0.25);
  });
});

describe("backupSpeedup", () => {
  it("returns straggler/fast ratio", () => {
    assert.equal(backupSpeedup(10, 2), 5);
  });
});
