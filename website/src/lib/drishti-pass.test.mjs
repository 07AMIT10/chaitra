import test from "node:test";
import assert from "node:assert/strict";
import hints from "../data/drishti/pass-hints.json" with { type: "json" };
import {
  STORAGE_KEY,
  MAX_PASSES,
  createEmptyPass,
  loadPasses,
  savePasses,
  upsertPass,
  getPassById,
  getActiveDraft,
  capPasses,
  formatPassSummary,
  isGapNote,
  detectGaps,
  ensurePassMirrorFields,
} from "./drishti-pass.ts";

test("STORAGE_KEY is chaitra_drishti_pass", () => {
  assert.equal(STORAGE_KEY, "chaitra_drishti_pass");
});

test("createEmptyPass returns draft at step 0 with empty lens notes", () => {
  const pass = createEmptyPass({ sourceUrl: "/drishti" });
  assert.match(pass.passId, /^[0-9a-f-]{36}$/);
  assert.equal(pass.phenomenon, "");
  assert.equal(pass.status, "draft");
  assert.equal(pass.depth, "light");
  assert.equal(pass.currentStep, 0);
  assert.equal(pass.lenses["what-exists"].light, "");
  assert.equal(pass.sourceUrl, "/drishti");
});

test("createEmptyPass accepts optional mirror fields when spread", () => {
  const pass = createEmptyPass({});
  const withMirror = {
    ...pass,
    nowSentence: "I see it as a queue now",
    letter: "You looked at sleep through seven lenses.",
    mirrorConfirmed: true,
    gapRetries: {
      "what-flows": { note: "retry note", retriedAt: "2026-06-21T12:00:00.000Z" },
    },
  };
  assert.equal(withMirror.nowSentence, "I see it as a queue now");
  assert.equal(withMirror.mirrorConfirmed, true);
  assert.ok(withMirror.gapRetries["what-flows"]);
});

test("loadPasses returns [] for missing or invalid JSON", () => {
  assert.deepEqual(loadPasses(null), []);
  assert.deepEqual(loadPasses("not json"), []);
  assert.deepEqual(loadPasses("[]"), []);
});

test("upsertPass inserts new pass at front", () => {
  const a = createEmptyPass({});
  a.phenomenon = "My team";
  const b = createEmptyPass({});
  b.phenomenon = "Sleep debt";
  const next = upsertPass([a], b);
  assert.equal(next[0].passId, b.passId);
  assert.equal(next[1].passId, a.passId);
});

test("capPasses keeps newest MAX_PASSES entries", () => {
  const passes = Array.from({ length: 25 }, (_, i) => {
    const p = createEmptyPass({});
    p.phenomenon = `p${i}`;
    p.createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    return p;
  }).reverse();
  const capped = capPasses(passes);
  assert.equal(capped.length, MAX_PASSES);
  assert.equal(capped[0].phenomenon, "p24");
});

test("getActiveDraft returns most recent draft", () => {
  const done = createEmptyPass({});
  done.status = "complete";
  const draft = createEmptyPass({});
  draft.phenomenon = "active";
  const found = getActiveDraft([done, draft]);
  assert.equal(found?.phenomenon, "active");
});

test("getPassById finds pass or returns undefined", () => {
  const p = createEmptyPass({});
  assert.equal(getPassById([p], p.passId)?.passId, p.passId);
  assert.equal(getPassById([p], "missing"), undefined);
});

test("savePasses serializes array", () => {
  const p = createEmptyPass({});
  const json = savePasses([p]);
  const parsed = JSON.parse(json);
  assert.equal(parsed.length, 1);
});

test("isGapNote treats empty and idk patterns as gaps", () => {
  assert.equal(isGapNote(undefined), true);
  assert.equal(isGapNote(""), true);
  assert.equal(isGapNote("   "), true);
  assert.equal(isGapNote("idk"), true);
  assert.equal(isGapNote("IDK"), true);
  assert.equal(isGapNote("not sure"), true);
  assert.equal(isGapNote("?"), true);
  assert.equal(isGapNote("—"), true);
  assert.equal(isGapNote("n/a"), true);
  assert.equal(isGapNote("skip"), true);
  assert.equal(isGapNote("A real observation"), false);
});

test("detectGaps returns lens slugs in site order, max 2 for UI is caller slice", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Standup";
  pass.lenses["what-exists"].light = "Three people talk";
  pass.lenses["what-changes"].light = "idk";
  pass.lenses["what-flows"].light = "";
  pass.lenses["what-learns"].light = "not sure";
  const gaps = detectGaps(pass);
  assert.deepEqual(gaps, ["what-changes", "what-flows", "what-learns", "what-persists", "what-emerges", "what-will-happen"]);
  assert.deepEqual(gaps.slice(0, 2), ["what-changes", "what-flows"]);
});

test("ensurePassMirrorFields backfills letter on complete pass when missing", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep";
  pass.status = "complete";
  pass.lenses["what-exists"].light = "Pressure accumulates";
  assert.equal(pass.letter, undefined);
  const next = ensurePassMirrorFields(pass);
  assert.ok(next.letter);
  assert.match(next.letter, /Sleep/);
});

test("completed pass gets letter via ensurePassMirrorFields", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep";
  pass.status = "complete";
  pass.lenses["what-exists"].light = "Pressure builds";
  const finalized = ensurePassMirrorFields({
    ...pass,
    status: "complete",
  });
  assert.ok(finalized.letter);
});

test("formatPassSummary leads with before/after, letter, mirror, appendix notes", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.context = "Feels stale lately";
  pass.nowSentence = "It's a broadcast, not a sync";
  pass.lenses["what-exists"].light = "Same three people talk";
  pass.lenses["what-flows"].light = "Airtime queues up";
  pass.insight = "We need a round-robin";
  pass.status = "complete";
  pass.letter = "You looked at **Team standup** through seven lenses.\n\nSame three people talk Airtime queues up\n\nNow you see it differently: It's a broadcast, not a sync";

  const text = formatPassSummary(pass);
  assert.match(text, /^# Drishti Pass: Team standup/);
  assert.match(text, /## Before → After/);
  assert.match(text, /Before: Team standup — Feels stale lately/);
  assert.match(text, /After: It's a broadcast, not a sync/);
  assert.match(text, /## Letter/);
  assert.match(text, /You looked at \*\*Team standup\*\*/);
  assert.match(text, /## Mirror/);
  assert.match(text, /---/);
  assert.match(text, /## Full notes/);
  assert.match(text, /What shifted: We need a round-robin/);
});

test("pass-hints includes gapNudge and letterAudience for all seven lenses", () => {
  const slugs = [
    "what-exists",
    "what-changes",
    "what-flows",
    "what-learns",
    "what-persists",
    "what-emerges",
    "what-will-happen",
  ];
  for (const slug of slugs) {
    assert.ok(hints[slug]?.gapNudge, `${slug} missing gapNudge`);
    assert.equal(hints[slug]?.letterAudience, "friend");
  }
});
