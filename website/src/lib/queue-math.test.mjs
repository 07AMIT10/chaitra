import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  utilization,
  theoreticalQueueLength,
  theoreticalWait,
  theoreticalSystemTime,
} from "./queue-math.ts";

describe("utilization", () => {
  it("returns λ/μ", () => {
    assert.equal(utilization(8, 10), 0.8);
  });

  it("returns Infinity when μ=0", () => {
    assert.equal(utilization(5, 0), Infinity);
  });
});

describe("theoreticalQueueLength", () => {
  it("returns ρ²/(1-ρ) for stable system", () => {
    const rho = 0.5;
    assert.equal(theoreticalQueueLength(rho), 0.5);
  });

  it("returns Infinity at ρ=1", () => {
    assert.equal(theoreticalQueueLength(1), Infinity);
  });
});

describe("theoreticalSystemTime", () => {
  it("returns 1/(μ-λ) when λ<μ", () => {
    assert.equal(theoreticalSystemTime(8, 10), 0.5);
  });

  it("increases as λ approaches μ", () => {
    const low = theoreticalSystemTime(5, 10);
    const high = theoreticalSystemTime(9, 10);
    assert.ok(high > low);
  });
});

describe("theoreticalWait", () => {
  it("returns finite wait for ρ<1", () => {
    const w = theoreticalWait(0.8, 10);
    assert.ok(Number.isFinite(w) && w > 0);
  });
});
