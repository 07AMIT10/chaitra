import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyPass } from "./drishti-pass.ts";
import {
  daysSince,
  migratePassFields,
  computeRelatedStudy,
  getRecentPasses,
  getEchoEligiblePass,
  passInsightSnippet,
  studyBridgeMatch,
  findStudyBridgePass,
  finalizePassState,
} from "./drishti-return.ts";

test("daysSince returns whole days between ISO dates", () => {
  assert.equal(
    daysSince("2026-06-18T12:00:00.000Z", new Date("2026-06-21T12:00:00.000Z")),
    3
  );
});

test("migratePassFields backfills completedAt from updatedAt", () => {
  const pass = createEmptyPass({});
  pass.status = "complete";
  pass.updatedAt = "2026-06-01T00:00:00.000Z";
  const next = migratePassFields(pass);
  assert.equal(next.completedAt, "2026-06-01T00:00:00.000Z");
});

test("computeRelatedStudy picks strongest non-gap lens study", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Standup";
  pass.lenses["what-flows"].light = "queue bottleneck wait throughput";
  assert.equal(computeRelatedStudy(pass), "sleep");
});

test("getRecentPasses pins drafts then last 5 complete", () => {
  const draft = createEmptyPass({});
  draft.status = "draft";
  draft.phenomenon = "Draft";
  const completes = Array.from({ length: 6 }, (_, i) => {
    const p = createEmptyPass({});
    p.status = "complete";
    p.phenomenon = `C${i}`;
    p.completedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    return p;
  });
  const recent = getRecentPasses([...completes, draft]);
  assert.equal(recent[0].phenomenon, "Draft");
  assert.equal(recent.length, 6);
  assert.equal(recent[1].phenomenon, "C5");
});

test("getEchoEligiblePass returns most recent pass >= 3 days, not dismissed", () => {
  const old = createEmptyPass({});
  old.status = "complete";
  old.completedAt = "2026-06-01T00:00:00.000Z";
  old.phenomenon = "Old";
  const recent = createEmptyPass({});
  recent.status = "complete";
  recent.completedAt = "2026-06-20T00:00:00.000Z";
  recent.phenomenon = "Recent";
  const eligible = getEchoEligiblePass(
    [old, recent],
    new Date("2026-06-21T12:00:00.000Z")
  );
  assert.equal(eligible?.phenomenon, "Old");
});

test("getEchoEligiblePass skips dismissed passes", () => {
  const pass = createEmptyPass({});
  pass.status = "complete";
  pass.completedAt = "2026-06-01T00:00:00.000Z";
  pass.echoDismissed = true;
  assert.equal(
    getEchoEligiblePass([pass], new Date("2026-06-21T12:00:00.000Z")),
    undefined
  );
});

test("passInsightSnippet prefers insight then nowSentence then date", () => {
  const pass = createEmptyPass({});
  pass.insight = "First insight\nsecond line";
  assert.equal(passInsightSnippet(pass), "First insight");
  delete pass.insight;
  pass.nowSentence = "Now I see queues";
  assert.equal(passInsightSnippet(pass), "Now I see queues");
});

test("studyBridgeMatch prefers preferredStudy", () => {
  const pass = createEmptyPass({ preferredStudy: "sleep" });
  pass.status = "complete";
  assert.ok(studyBridgeMatch(pass, "sleep"));
});

test("studyBridgeMatch matches keyword overlap for lens", () => {
  const pass = createEmptyPass({});
  pass.status = "complete";
  pass.phenomenon = "Team standup";
  pass.lenses["what-flows"].light = "Airtime queues up at the bottleneck";
  const match = studyBridgeMatch(pass, "sleep");
  assert.equal(match?.lens, "what-flows");
});

test("findStudyBridgePass returns most recent matching complete pass", () => {
  const older = createEmptyPass({ preferredStudy: "sleep" });
  older.status = "complete";
  older.completedAt = "2026-06-01T00:00:00.000Z";
  older.phenomenon = "Older";
  const newer = createEmptyPass({ preferredStudy: "sleep" });
  newer.status = "complete";
  newer.completedAt = "2026-06-10T00:00:00.000Z";
  newer.phenomenon = "Newer";
  const found = findStudyBridgePass([older, newer], "sleep");
  assert.equal(found?.pass.phenomenon, "Newer");
});

test("finalizePassState sets completedAt and relatedStudySlug", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep debt";
  pass.lenses["what-flows"].light = "queue bottleneck wait";
  const done = finalizePassState(pass, "light");
  assert.equal(done.status, "complete");
  assert.ok(done.completedAt);
  assert.equal(done.relatedStudySlug, "sleep");
  assert.ok(done.letter);
});
