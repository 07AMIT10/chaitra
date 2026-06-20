import test from "node:test";
import assert from "node:assert/strict";
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

test("formatPassSummary includes phenomenon, all lenses, and insight", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.context = "Feels stale lately";
  pass.lenses["what-exists"].light = "Same three people talk";
  pass.insight = "It's a broadcast, not a sync";
  const text = formatPassSummary(pass);
  assert.match(text, /^# Drishti Pass: Team standup/);
  assert.match(text, /Context: Feels stale lately/);
  assert.match(text, /what-exists|What Exists/i);
  assert.match(text, /Same three people talk/);
  assert.match(text, /What shifted: It's a broadcast, not a sync/);
  const lensLines = text.split("\n").filter((line) => line.includes(":") && !line.startsWith("#") && !line.startsWith("Context") && !line.startsWith("What shifted"));
  assert.equal(lensLines.length, 7);
  assert.match(lensLines[1], /—/);
});
