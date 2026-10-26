import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPTY_PROGRESS,
  RESUME_KEY_PREFIX,
  clearResume,
  loadResume,
  makeResumeEnvelope,
  parseResumeEnvelope,
  resumeKey,
  saveResume,
  saveSolved,
} from "./progress.ts";
import { missionAccess, winOutcome } from "./progression.ts";
import { LEVEL_META } from "./levels/meta/index.ts";

function progressFor(slugs) {
  const levels = {};
  for (const slug of slugs) {
    levels[slug] = { stars: 3, moves: 5, at: "2026-10-26T10:00:00.000Z" };
  }
  return { version: 1, levels };
}

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function snapshot(overrides = {}) {
  return {
    version: 1,
    slug: "union-find",
    state: { parent: { A: "B" } },
    history: [
      {
        state: { parent: { A: "A" } },
        logLength: 0,
        status: "playing",
        log: [],
      },
    ],
    log: [],
    status: "playing",
    moves: 1,
    hints: 0,
    ...overrides,
  };
}

test("winOutcome reserves CLEAN RUN for three marks", () => {
  assert.deepEqual(winOutcome(3), { label: "CLEAN RUN", clean: true });
  assert.deepEqual(winOutcome(2), { label: "SOLVED", clean: false });
  assert.deepEqual(winOutcome(1), { label: "REPAIRED", clean: false });
  assert.equal(winOutcome(0).label, "REPAIRED");
  assert.equal(winOutcome(9).label, "CLEAN RUN");
});

test("NaN stars and moves never escape the honest bands", () => {
  assert.deepEqual(winOutcome(Number.NaN), { label: "REPAIRED", clean: false });
  assert.deepEqual(winOutcome(Number.POSITIVE_INFINITY), { label: "REPAIRED", clean: false });

  const result = saveSolved("union-find", Number.NaN, Number.NaN);
  const record = result.progress.levels["union-find"];
  assert.equal(record.stars, 1, "NaN stars become one mark, never zero or three");
  assert.equal(record.moves, 0, "NaN moves become a zero-write record");
});

test("missionAccess fails closed for an unknown slug", () => {
  const access = missionAccess(LEVEL_META, EMPTY_PROGRESS, "not-a-mission");
  assert.equal(access.open, false);
  assert.equal(access.node, null);
  assert.equal(access.required, null);
  assert.equal(access.index, -1);
  assert.equal(access.next?.meta.slug, LEVEL_META[0].slug);
});

test("missionAccess opens the first system and gates N on N-1", () => {
  const first = missionAccess(LEVEL_META, EMPTY_PROGRESS, LEVEL_META[0].slug);
  assert.equal(first.open, true);
  assert.equal(first.required, null);
  assert.equal(first.next?.meta.slug, LEVEL_META[0].slug);

  const second = missionAccess(LEVEL_META, EMPTY_PROGRESS, LEVEL_META[1].slug);
  assert.equal(second.open, false);
  assert.equal(second.required?.slug, LEVEL_META[0].slug);

  const oneSolved = progressFor([LEVEL_META[0].slug]);
  assert.equal(missionAccess(LEVEL_META, oneSolved, LEVEL_META[1].slug).open, true);
  assert.equal(missionAccess(LEVEL_META, oneSolved, LEVEL_META[2].slug).open, false);

  const twoSolved = progressFor([LEVEL_META[0].slug, LEVEL_META[1].slug]);
  assert.equal(missionAccess(LEVEL_META, twoSolved, LEVEL_META[2].slug).open, true);
  assert.equal(
    missionAccess(LEVEL_META, twoSolved, LEVEL_META[3].slug).required?.slug,
    LEVEL_META[2].slug,
  );

  const repaired = missionAccess(LEVEL_META, oneSolved, LEVEL_META[0].slug);
  assert.equal(repaired.open, true, "a repaired mission stays replayable");
});

test("a deep sealed link never points at another sealed mission", () => {
  const deep = missionAccess(LEVEL_META, EMPTY_PROGRESS, LEVEL_META[3].slug);
  assert.equal(deep.open, false);
  assert.equal(deep.required?.slug, LEVEL_META[2].slug);

  const precedent = missionAccess(LEVEL_META, EMPTY_PROGRESS, deep.required.slug);
  assert.equal(precedent.open, false, "the immediate precedent is sealed too");

  const next = deep.next?.meta;
  assert.ok(next);
  assert.equal(next.slug, LEVEL_META[0].slug, "the earliest unsolved mission is the safe CTA");
  assert.equal(missionAccess(LEVEL_META, EMPTY_PROGRESS, next.slug).open, true);
});

test("resume envelopes round-trip only a started, playing board", () => {
  const store = fakeStorage();
  assert.equal(saveResume("union-find", snapshot(), store), true);
  assert.equal(store.data.has(resumeKey("union-find")), true);
  assert.equal(resumeKey("union-find").startsWith(RESUME_KEY_PREFIX), true);

  const loaded = loadResume("union-find", store);
  assert.equal(loaded?.slug, "union-find");
  assert.equal(loaded?.snapshot.moves, 1);

  clearResume("union-find", store);
  assert.equal(loadResume("union-find", store), null);

  assert.equal(saveResume("union-find", snapshot({ moves: 0, history: [] }), store), false);
  assert.equal(
    saveResume("union-find", snapshot({ status: "won" }), store),
    false,
    "a won board is not resumable",
  );
});

test("resume parsing fails closed on corrupt, stale, terminal, and cross-level data", () => {
  assert.equal(parseResumeEnvelope(null, "union-find"), null);
  assert.equal(parseResumeEnvelope("{not json", "union-find"), null);
  assert.equal(parseResumeEnvelope("[]", "union-find"), null);

  const ok = JSON.stringify(makeResumeEnvelope("union-find", snapshot()));
  assert.ok(parseResumeEnvelope(ok, "union-find"));
  assert.equal(parseResumeEnvelope(ok, "binary-search"), null);

  const stale = JSON.parse(ok);
  stale.version = 2;
  assert.equal(parseResumeEnvelope(JSON.stringify(stale), "union-find"), null);

  const staleSnapshot = JSON.parse(ok);
  staleSnapshot.snapshot.version = 2;
  assert.equal(
    parseResumeEnvelope(JSON.stringify(staleSnapshot), "union-find"),
    null,
    "the snapshot schema version must match the engine",
  );

  const wrongEnvelopeSlug = JSON.parse(ok);
  wrongEnvelopeSlug.slug = "binary-search";
  assert.equal(parseResumeEnvelope(JSON.stringify(wrongEnvelopeSlug), "union-find"), null);

  const brokenHistory = JSON.parse(ok);
  brokenHistory.snapshot.history = [];
  assert.equal(
    parseResumeEnvelope(JSON.stringify(brokenHistory), "union-find"),
    null,
    "history must account for every move",
  );

  for (const status of ["won", "lost"]) {
    const terminal = JSON.parse(ok);
    terminal.snapshot.status = status;
    assert.equal(
      parseResumeEnvelope(JSON.stringify(terminal), "union-find"),
      null,
      `${status} must not resume`,
    );
  }

  const fresh = JSON.parse(ok);
  fresh.snapshot.moves = 0;
  assert.equal(parseResumeEnvelope(JSON.stringify(fresh), "union-find"), null);

  const other = JSON.parse(ok);
  other.snapshot.slug = "binary-search";
  assert.equal(parseResumeEnvelope(JSON.stringify(other), "union-find"), null);
});
