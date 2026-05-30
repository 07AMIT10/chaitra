import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { falsePositiveRate, tombstoneMemoryBytes } from "./crdt-math.ts";

describe("falsePositiveRate (re-export)", () => {
  it("returns 0 for empty filter", () => {
    assert.equal(falsePositiveRate(64, 0, 3), 0);
  });
});

describe("tombstoneMemoryBytes", () => {
  it("exact uses 32 bytes per tombstone", () => {
    const { exact } = tombstoneMemoryBytes(10, 256);
    assert.equal(exact, 320);
  });

  it("bloom uses ceil(bits/8)", () => {
    const { bloom } = tombstoneMemoryBytes(10, 256);
    assert.equal(bloom, 32);
  });

  it("bloom is smaller than exact for many tombstones", () => {
    const { exact, bloom } = tombstoneMemoryBytes(1000, 8192);
    assert.ok(bloom < exact);
  });
});
