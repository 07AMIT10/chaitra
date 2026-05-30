import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashPartition,
  littlesLaw,
  utilizationMc,
  imbalanceRatio,
} from "./dist-queues-math.ts";

describe("hashPartition", () => {
  it("returns value in [0, partitions)", () => {
    const p = hashPartition(42, 8);
    assert.ok(p >= 0 && p < 8);
  });

  it("is deterministic for same key", () => {
    assert.equal(hashPartition(99, 16), hashPartition(99, 16));
  });
});

describe("littlesLaw", () => {
  it("returns λ×W", () => {
    assert.equal(littlesLaw(10, 0.5), 5);
  });
});

describe("utilizationMc", () => {
  it("returns λ/(c·μ)", () => {
    assert.equal(utilizationMc(8, 2, 5), 0.8);
  });
});

describe("imbalanceRatio", () => {
  it("returns 1 for uniform loads", () => {
    assert.equal(imbalanceRatio([10, 10, 10]), 1);
  });

  it("exceeds 1 for skewed loads", () => {
    assert.ok(imbalanceRatio([1, 10, 1]) > 1);
  });
});
