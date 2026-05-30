import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PI_TRUE,
  isInsideQuarterCircle,
  piEstimate,
  piStandardErrorTheory,
  samplesToHalveError,
} from "./mc-systems-math.ts";

describe("isInsideQuarterCircle", () => {
  it("includes origin", () => {
    assert.equal(isInsideQuarterCircle(0, 0), true);
  });

  it("excludes corner (1,1)", () => {
    assert.equal(isInsideQuarterCircle(1, 1), false);
  });
});

describe("piEstimate", () => {
  it("returns 4×inside/samples", () => {
    assert.equal(piEstimate(785, 1000), 3.14);
  });

  it("approaches π for realistic hit ratio", () => {
    const estimate = piEstimate(785, 1000);
    assert.ok(Math.abs(estimate - PI_TRUE) < 0.05);
  });
});

describe("piStandardErrorTheory", () => {
  it("decreases with more samples", () => {
    const small = piStandardErrorTheory(100);
    const large = piStandardErrorTheory(10000);
    assert.ok(large < small);
  });
});

describe("samplesToHalveError", () => {
  it("requires 4× samples to halve error", () => {
    assert.equal(samplesToHalveError(1000), 4000);
  });
});
