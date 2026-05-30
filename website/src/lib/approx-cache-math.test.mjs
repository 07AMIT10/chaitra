import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BLOOM_FP_BASE,
  falsePositiveFromBitsPerItem,
  bitsPerItemFromFpr,
  expectedAbsentLookupCost,
  diskReadSavingsPercent,
} from "./approx-cache-math.ts";

describe("falsePositiveFromBitsPerItem", () => {
  it("returns BLOOM_FP_BASE^m/n", () => {
    const fp = falsePositiveFromBitsPerItem(10);
    assert.ok(Math.abs(fp - Math.pow(BLOOM_FP_BASE, 10)) < 1e-10);
  });

  it("decreases with more bits per item", () => {
    const low = falsePositiveFromBitsPerItem(5);
    const high = falsePositiveFromBitsPerItem(15);
    assert.ok(high < low);
  });
});

describe("bitsPerItemFromFpr", () => {
  it("inverts falsePositiveFromBitsPerItem", () => {
    const bits = bitsPerItemFromFpr(0.01);
    const fp = falsePositiveFromBitsPerItem(bits);
    assert.ok(Math.abs(fp - 0.01) < 0.001);
  });
});

describe("expectedAbsentLookupCost", () => {
  it("equals RAM + p×disk", () => {
    assert.equal(expectedAbsentLookupCost(10, 1000, 0.01), 10 + 10);
  });
});

describe("diskReadSavingsPercent", () => {
  it("returns (1-FP)×100", () => {
    assert.equal(diskReadSavingsPercent(0.01), 99);
  });
});
