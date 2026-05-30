import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hitRatio, cmsErrorUpperBound } from "./tinylfu-math.ts";

describe("hitRatio", () => {
  it("returns hits/accesses", () => {
    assert.equal(hitRatio(80, 100), 0.8);
  });

  it("returns 0 for zero accesses", () => {
    assert.equal(hitRatio(0, 0), 0);
  });

  it("is bounded in [0, 1]", () => {
    const r = hitRatio(50, 100);
    assert.ok(r >= 0 && r <= 1);
  });
});

describe("cmsErrorUpperBound", () => {
  it("equals epsilon × windowEvents", () => {
    assert.equal(cmsErrorUpperBound(0.01, 1000), 10);
  });

  it("increases monotonically with window size", () => {
    const small = cmsErrorUpperBound(0.01, 100);
    const large = cmsErrorUpperBound(0.01, 1000);
    assert.ok(large > small);
  });
});
