import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cmsDimensions, errorBound } from "./cms-math.ts";

describe("cmsDimensions", () => {
  it("width = ceil(e/epsilon), depth = ceil(ln(1/delta))", () => {
    const { width, depth } = cmsDimensions(0.01, 0.05);
    // width = ceil(e / 0.01) = ceil(271.8) = 272
    assert.equal(width, 272);
    // depth = ceil(ln(1/0.05)) = ceil(ln(20)) = ceil(2.996) = 3
    assert.equal(depth, 3);
  });

  it("tighter epsilon gives wider sketch", () => {
    const tight = cmsDimensions(0.001, 0.05);
    const loose = cmsDimensions(0.1, 0.05);
    assert.ok(tight.width > loose.width);
  });

  it("tighter delta gives deeper sketch", () => {
    const tight = cmsDimensions(0.01, 0.001);
    const loose = cmsDimensions(0.01, 0.5);
    assert.ok(tight.depth > loose.depth);
  });
});

describe("errorBound", () => {
  it("formats percentage correctly", () => {
    assert.equal(errorBound(0.01), "±1.0% of total stream mass");
    assert.equal(errorBound(0.1), "±10.0% of total stream mass");
  });
});
