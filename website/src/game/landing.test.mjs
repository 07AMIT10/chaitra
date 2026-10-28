import test from "node:test";
import assert from "node:assert/strict";

import { LEVEL_META } from "./levels/meta/index.ts";
import { EMPTY_PROGRESS } from "./progress.ts";
import { resolveLanding, campaignComplete } from "./landing.ts";

function solvedProgress(slugs) {
  const levels = {};
  for (const slug of slugs) {
    levels[slug] = {
      slug,
      moves: 3,
      stars: 3,
      at: "2026-10-27T12:00:00.000Z",
    };
  }
  return { version: 1, levels };
}

function makeParkRecord(slug, overrides = {}) {
  return {
    version: 1,
    slug,
    at: "2026-10-27T12:00:00.000Z",
    snapshot: {
      version: 1,
      slug,
      status: "playing",
      moves: 1,
      hints: 0,
      state: {},
      history: [{ moveId: "m1", before: {}, after: {}, event: { type: "move" } }],
      log: [],
    },
    lastMove: { id: "m1", label: "Inspect Hull" },
    ...overrides,
  };
}

test("no progress resolves to the first mission", () => {
  const decision = resolveLanding(LEVEL_META, EMPTY_PROGRESS, null);
  assert.equal(decision.kind, "mission");
  assert.equal(decision.slug, LEVEL_META[0].slug);
  assert.equal(decision.meta.slug, LEVEL_META[0].slug);
  assert.equal(decision.parked, undefined);
  assert.equal(decision.clearPark, undefined);
});

test("the earliest unsolved mission wins after an out-of-order solve", () => {
  const progress = solvedProgress([LEVEL_META[1].slug]);
  const decision = resolveLanding(LEVEL_META, progress, null);
  assert.equal(decision.kind, "mission");
  assert.equal(decision.slug, LEVEL_META[0].slug);
  assert.equal(decision.meta.slug, LEVEL_META[0].slug);
});

test("a valid park wins over the next unsolved mission", () => {
  const progress = solvedProgress([LEVEL_META[0].slug, LEVEL_META[1].slug]);
  const parkRecord = makeParkRecord(LEVEL_META[2].slug);
  const parkResult = { record: parkRecord, expired: false, corrupt: false };
  const decision = resolveLanding(LEVEL_META, progress, parkResult);
  assert.equal(decision.kind, "mission");
  assert.equal(decision.slug, LEVEL_META[2].slug);
  assert.equal(decision.meta.slug, LEVEL_META[2].slug);
  assert.deepEqual(decision.parked, parkRecord);
});

test("an expired park is not resumed", () => {
  const parkResult = { record: null, expired: true, corrupt: false };
  const decision = resolveLanding(LEVEL_META, EMPTY_PROGRESS, parkResult);
  assert.equal(decision.kind, "mission");
  assert.equal(decision.slug, LEVEL_META[0].slug);
  assert.equal(decision.meta.slug, LEVEL_META[0].slug);
  assert.equal(decision.clearPark, true);
  assert.equal(decision.parked, undefined);
});

test("a park for a now-sealed mission goes to the map", () => {
  const parkRecord = makeParkRecord(LEVEL_META[7].slug);
  const parkResult = { record: parkRecord, expired: false, corrupt: false };
  const decision = resolveLanding(LEVEL_META, EMPTY_PROGRESS, parkResult);
  assert.equal(decision.kind, "map");
  assert.equal(decision.reason, "parked-sealed");
  assert.equal(decision.parkSlug, LEVEL_META[7].slug);
});

test("a complete campaign goes to the map", () => {
  const allSlugs = LEVEL_META.map((m) => m.slug);
  const progress = solvedProgress(allSlugs);
  assert.equal(campaignComplete(LEVEL_META, progress), true);
  const decision = resolveLanding(LEVEL_META, progress, null);
  assert.equal(decision.kind, "map");
  assert.equal(decision.reason, "complete");
});

test("a partial registry is not campaign-complete", () => {
  const partialMetas = LEVEL_META.slice(0, 2);
  const progress = solvedProgress(partialMetas.map((m) => m.slug));
  assert.equal(campaignComplete(partialMetas, progress), false);
  const decision = resolveLanding(partialMetas, progress, null);
  assert.notEqual(decision.kind === "map" && decision.reason, "complete");
  assert.equal(decision.kind, "mission");
  assert.equal(decision.slug, partialMetas[0].slug);
});

test("corrupt/unknown park data is ignored", () => {
  const corruptResult = { record: null, expired: false, corrupt: true };
  const decision1 = resolveLanding(LEVEL_META, EMPTY_PROGRESS, corruptResult);
  assert.equal(decision1.kind, "mission");
  assert.equal(decision1.slug, LEVEL_META[0].slug);
  assert.equal(decision1.parked, undefined);

  const unknownSlugRecord = makeParkRecord("non-existent-mission-slug");
  const unknownSlugResult = { record: unknownSlugRecord, expired: false, corrupt: false };
  const decision2 = resolveLanding(LEVEL_META, EMPTY_PROGRESS, unknownSlugResult);
  assert.equal(decision2.kind, "mission");
  assert.equal(decision2.slug, LEVEL_META[0].slug);
  assert.equal(decision2.parked, undefined);
});
