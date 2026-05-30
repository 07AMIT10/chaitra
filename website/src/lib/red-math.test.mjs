import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ewmaUpdate,
  baseDropProbability,
  actualDropProbability,
  redZone,
} from "./red-math.ts";

describe("ewmaUpdate", () => {
  it("blends previous average with instant queue", () => {
    assert.equal(ewmaUpdate(10, 20, 0.5), 15);
  });

  it("clamps weight to [0, 1]", () => {
    assert.equal(ewmaUpdate(10, 20, 2), 20);
  });
});

describe("baseDropProbability", () => {
  it("returns 0 below min threshold", () => {
    assert.equal(baseDropProbability(5, 100, 0.2, 0.8, 0.1), 0);
  });

  it("returns 1 at or above max threshold", () => {
    assert.equal(baseDropProbability(90, 100, 0.2, 0.8, 0.1), 1);
  });

  it("increases monotonically in linear region", () => {
    const low = baseDropProbability(50, 100, 0.2, 0.8, 0.1);
    const high = baseDropProbability(70, 100, 0.2, 0.8, 0.1);
    assert.ok(high > low);
  });
});

describe("actualDropProbability", () => {
  it("returns 0 for zero base probability", () => {
    assert.equal(actualDropProbability(0, 5), 0);
  });
});

describe("redZone", () => {
  it("classifies accept, prob, and drop_all regions", () => {
    assert.equal(redZone(0.1, 0.2, 0.8), "accept");
    assert.equal(redZone(0.5, 0.2, 0.8), "prob");
    assert.equal(redZone(0.9, 0.2, 0.8), "drop_all");
  });
});
