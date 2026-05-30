import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hllStandardError, alphaM } from "./hll-math.ts";

describe("hllStandardError", () => {
  it("SE = 1.04 / sqrt(m) for b=4 (m=16)", () => {
    const se = hllStandardError(4);
    // 1.04 / sqrt(16) = 1.04 / 4 = 0.26
    assert.ok(Math.abs(se - 0.26) < 0.001, `Expected 0.26, got ${se}`);
  });

  it("SE decreases with larger b", () => {
    assert.ok(hllStandardError(8) < hllStandardError(4));
    assert.ok(hllStandardError(12) < hllStandardError(8));
  });

  it("SE ≈ 6.5% for b=8 (m=256)", () => {
    const se = hllStandardError(8);
    // 1.04 / sqrt(256) = 1.04 / 16 = 0.065
    assert.ok(Math.abs(se - 0.065) < 0.001, `Expected 0.065, got ${se}`);
  });
});

describe("alphaM", () => {
  it("returns known constant for m=16", () => {
    assert.equal(alphaM(16), 0.673);
  });

  it("returns known constant for m=32", () => {
    assert.equal(alphaM(32), 0.697);
  });

  it("returns known constant for m=64", () => {
    assert.equal(alphaM(64), 0.709);
  });

  it("uses general formula for large m", () => {
    const a = alphaM(256);
    // 0.7213 / (1 + 1.079/256) ≈ 0.7183
    assert.ok(Math.abs(a - 0.7183) < 0.001, `Expected ~0.7183, got ${a}`);
  });

  it("converges toward 0.7213 for very large m", () => {
    const a = alphaM(65536);
    assert.ok(Math.abs(a - 0.7213) < 0.001, `Expected ~0.7213, got ${a}`);
  });
});
