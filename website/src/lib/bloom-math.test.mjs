import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { falsePositiveRate, optimalK, bitArraySize, hashCountFromSizing, fillRatio } from "./bloom-math.ts";

describe("falsePositiveRate", () => {
  it("returns 0 for empty filter", () => {
    assert.equal(falsePositiveRate(64, 0, 3), 0);
  });

  it("returns plausible rate for typical params", () => {
    // m=1024, n=100, k=7 → FP ≈ 0.82% (classic textbook)
    const fp = falsePositiveRate(1024, 100, 7);
    assert.ok(fp > 0.005 && fp < 0.02, `Expected ~1% FP, got ${fp}`);
  });

  it("increases with more items", () => {
    const fp50 = falsePositiveRate(256, 50, 3);
    const fp100 = falsePositiveRate(256, 100, 3);
    assert.ok(fp100 > fp50, "FP should increase with more items");
  });

  it("approaches 1 when massively overfilled", () => {
    const fp = falsePositiveRate(16, 1000, 3);
    assert.ok(fp > 0.95, `Expected near 1.0, got ${fp}`);
  });
});

describe("optimalK", () => {
  it("returns k ≈ (m/n) ln2", () => {
    // m=1024, n=100 → k = 1024/100 * 0.693 ≈ 7
    const k = optimalK(1024, 100);
    assert.equal(k, 7);
  });

  it("returns 1 when n=0", () => {
    assert.equal(optimalK(64, 0), 1);
  });
});

describe("bitArraySize", () => {
  it("m = -(n ln p) / (ln 2)^2 for 1% FP", () => {
    // n=100, p=0.01 → m ≈ 958
    const m = bitArraySize(100, 0.01);
    assert.ok(m >= 512, `Expected large m for 1% FP with 100 items, got ${m}`);
  });

  it("clamps to minimum 16", () => {
    assert.equal(bitArraySize(1, 0.5), 16);
  });

  it("rejects invalid inputs gracefully", () => {
    assert.equal(bitArraySize(0, 0.01), 16);
    assert.equal(bitArraySize(10, 0), 16);
  });
});

describe("hashCountFromSizing", () => {
  it("returns integer hash count", () => {
    const k = hashCountFromSizing(1024, 100);
    assert.ok(Number.isInteger(k));
    assert.ok(k >= 1 && k <= 16);
  });
});

describe("fillRatio", () => {
  it("returns 0 for empty array", () => {
    assert.equal(fillRatio(new Uint8Array(10)), 0);
  });

  it("returns 1 for full array", () => {
    const bits = new Uint8Array(8).fill(1);
    assert.equal(fillRatio(bits), 1);
  });

  it("returns correct fraction", () => {
    const bits = new Uint8Array([1, 0, 1, 0]);
    assert.equal(fillRatio(bits), 0.5);
  });
});
