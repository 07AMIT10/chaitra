import assert from "node:assert/strict";
import { test } from "node:test";
import { hasLabIsland, hasSitePage, resolveStatus } from "./generate-catalog.mjs";

test("hasSitePage detects index.mdx", () => {
  assert.equal(hasSitePage("bloom-filters"), true);
  assert.equal(hasSitePage("nonexistent-topic"), false);
});

test("hasLabIsland requires Lab import and client:visible", () => {
  assert.equal(hasLabIsland("bloom-filters"), true);
  assert.equal(hasLabIsland("count-min-sketch"), true);
  assert.equal(hasLabIsland("distributed-systems"), false);
});

test("resolveStatus: golden preserved", () => {
  assert.equal(
    resolveStatus({
      slug: "bloom-filters",
      folder: "BLOOM_FILTERS",
      prior: { status: "golden" },
      hasPage: true,
      hasLab: true,
    }),
    "golden"
  );
});

test("resolveStatus: hasLab → live", () => {
  assert.equal(
    resolveStatus({
      slug: "count-min-sketch",
      folder: "COUNT_MIN_SKETCH",
      prior: {},
      hasPage: true,
      hasLab: true,
    }),
    "live"
  );
});

test("resolveStatus: hasPage without lab → preview", () => {
  assert.equal(
    resolveStatus({
      slug: "count-min-sketch",
      folder: "COUNT_MIN_SKETCH",
      prior: {},
      hasPage: true,
      hasLab: false,
    }),
    "preview"
  );
});

test("resolveStatus: coded folder without page → coded", () => {
  assert.equal(
    resolveStatus({
      slug: "hyperloglog",
      folder: "HYPERLOGLOG",
      prior: {},
      hasPage: false,
      hasLab: false,
    }),
    "coded"
  );
});

test("resolveStatus: default → readme-only", () => {
  assert.equal(
    resolveStatus({
      slug: "distributed-systems",
      folder: "DISTRIBUTED_SYSTEMS",
      prior: {},
      hasPage: false,
      hasLab: false,
    }),
    "readme-only"
  );
});
