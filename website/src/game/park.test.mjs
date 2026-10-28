import test from "node:test";
import assert from "node:assert/strict";

import {
  PARK_KEY,
  PARK_TTL_MS,
  PARK_MAX_BYTES,
  loadPark,
  savePark,
  clearPark,
  parkSummary,
} from "./park.ts";
import { LEVEL_META } from "./levels/meta/index.ts";

class FakeStorage {
  constructor(initial = {}) {
    this.map = new Map(Object.entries(initial));
    this.failure = null;
  }

  getItem(key) {
    if (this.failure === "get") throw new Error("storage denied");
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    if (this.failure === "set") throw new Error("QuotaExceededError");
    if (this.failure === "disabled") throw new Error("SecurityError: storage disabled");
    this.map.set(key, String(value));
  }

  removeItem(key) {
    if (this.failure === "remove") throw new Error("storage denied");
    this.map.delete(key);
  }
}

function snapshot(slug = "union-find", overrides = {}) {
  return {
    version: 1,
    slug,
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

test("playing snapshot round-trips with its last move", () => {
  const storage = new FakeStorage();
  const snap = snapshot("union-find");
  const lastMove = { id: "merge:A:B", label: "Merge A into B" };
  const now = Date.parse("2026-10-27T12:00:00.000Z");

  const saveRes = savePark("union-find", snap, lastMove, storage, now);
  assert.equal(saveRes.ok, true);
  assert.equal(saveRes.record.version, 1);
  assert.equal(saveRes.record.slug, "union-find");
  assert.equal(saveRes.record.at, new Date(now).toISOString());
  assert.deepEqual(saveRes.record.lastMove, lastMove);
  assert.deepEqual(saveRes.record.snapshot, snap);

  const loadRes = loadPark(storage, now);
  assert.equal(loadRes.expired, false);
  assert.equal(loadRes.corrupt, false);
  assert.deepEqual(loadRes.record, saveRes.record);
});

test("park older than 14 days reads as expired", () => {
  const storage = new FakeStorage();
  const snap = snapshot("union-find");
  const now = Date.parse("2026-10-01T00:00:00.000Z");

  const saveRes = savePark("union-find", snap, null, storage, now);
  assert.equal(saveRes.ok, true);

  // Exactly at 14 days + 1ms
  const later = now + PARK_TTL_MS + 1;
  const loadRes = loadPark(storage, later);
  assert.equal(loadRes.record, null);
  assert.equal(loadRes.expired, true);
  assert.equal(loadRes.corrupt, false);

  // Within 14 days is not expired
  const within = now + PARK_TTL_MS - 1000;
  const loadWithin = loadPark(storage, within);
  assert.equal(loadWithin.expired, false);
  assert.ok(loadWithin.record);
});

test("corrupt/old-version record fails closed and is not restored", () => {
  const badCases = [
    "{ bad json",
    "null",
    "42",
    "[]",
    JSON.stringify({ version: 2, slug: "union-find", at: new Date().toISOString(), snapshot: snapshot(), lastMove: null }),
    JSON.stringify({ version: 1, slug: "", at: new Date().toISOString(), snapshot: snapshot(), lastMove: null }),
    JSON.stringify({ version: 1, slug: "union-find", at: "not-a-date", snapshot: snapshot(), lastMove: null }),
    JSON.stringify({ version: 1, slug: "union-find", at: new Date().toISOString(), snapshot: null, lastMove: null }),
    JSON.stringify({ version: 1, slug: "union-find", at: new Date().toISOString(), snapshot: { ...snapshot(), moves: 0 }, lastMove: null }),
    JSON.stringify({ version: 1, slug: "union-find", at: new Date().toISOString(), snapshot: snapshot(), lastMove: "invalid" }),
  ];

  for (const raw of badCases) {
    const storage = new FakeStorage({ [PARK_KEY]: raw });
    const res = loadPark(storage);
    assert.equal(res.record, null, `expected null for raw=${raw}`);
    assert.equal(res.expired, false, `expected not expired for raw=${raw}`);
    assert.equal(res.corrupt, true, `expected corrupt for raw=${raw}`);
  }
});

test("cross-level snapshot is rejected", () => {
  const storage = new FakeStorage();
  const crossSnap = snapshot("binary-search");

  // savePark checks slug consistency
  const saveRes = savePark("union-find", crossSnap, null, storage);
  assert.equal(saveRes.ok, false);
  assert.equal(saveRes.reason, "invalid");
  assert.equal(storage.getItem(PARK_KEY), null);

  // loadPark fails closed as corrupt if snapshot.slug !== record.slug
  const storedCross = {
    version: 1,
    slug: "union-find",
    at: new Date().toISOString(),
    snapshot: crossSnap,
    lastMove: null,
  };
  storage.setItem(PARK_KEY, JSON.stringify(storedCross));
  const loadRes = loadPark(storage);
  assert.equal(loadRes.record, null);
  assert.equal(loadRes.corrupt, true);
});

test("different unexpired park is not overwritten", () => {
  const storage = new FakeStorage();
  const snap1 = snapshot("union-find");
  const save1 = savePark("union-find", snap1, null, storage);
  assert.equal(save1.ok, true);

  const snap2 = snapshot("binary-search");
  const save2 = savePark("binary-search", snap2, null, storage);
  assert.equal(save2.ok, false);
  assert.equal(save2.reason, "exists");
  assert.deepEqual(save2.existing, save1.record);

  // Original remains untouched
  const loadRes = loadPark(storage);
  assert.equal(loadRes.record?.slug, "union-find");
});

test("the same slug can be replaced", () => {
  const storage = new FakeStorage();
  const snap1 = snapshot("union-find", { moves: 1 });
  const save1 = savePark("union-find", snap1, { id: "move1", label: "Move 1" }, storage);
  assert.equal(save1.ok, true);

  const snap2 = snapshot("union-find", {
    moves: 2,
    history: [
      { state: { parent: { A: "A" } }, logLength: 0, status: "playing", log: [] },
      { state: { parent: { A: "B" } }, logLength: 0, status: "playing", log: [] },
    ],
  });
  const save2 = savePark("union-find", snap2, { id: "move2", label: "Move 2" }, storage);
  assert.equal(save2.ok, true);
  assert.equal(save2.record.snapshot.moves, 2);
  assert.equal(save2.record.lastMove?.id, "move2");

  const loadRes = loadPark(storage);
  assert.equal(loadRes.record?.snapshot.moves, 2);
  assert.equal(loadRes.record?.lastMove?.id, "move2");
});

test("quota/disabled storage write returns a reason and leaves old park intact", () => {
  const storage = new FakeStorage();
  const snap = snapshot("union-find");
  const initial = savePark("union-find", snap, null, storage);
  assert.equal(initial.ok, true);

  // Quota exceeded
  storage.failure = "set";
  const snap2 = snapshot("union-find", {
    moves: 2,
    history: [
      { state: { parent: { A: "A" } }, logLength: 0, status: "playing", log: [] },
      { state: { parent: { A: "B" } }, logLength: 0, status: "playing", log: [] },
    ],
  });
  const quotaRes = savePark("union-find", snap2, null, storage);
  assert.equal(quotaRes.ok, false);
  assert.equal(quotaRes.reason, "quota");

  // Old record intact
  storage.failure = null;
  const loadRes = loadPark(storage);
  assert.deepEqual(loadRes.record, initial.record);

  // Disabled storage
  const disabledRes = savePark("union-find", snap, null, null);
  assert.equal(disabledRes.ok, false);
  assert.equal(disabledRes.reason, "disabled");

  storage.failure = "disabled";
  const secRes = savePark("union-find", snap2, null, storage);
  assert.equal(secRes.ok, false);
  assert.equal(secRes.reason, "disabled");
});

test("oversized record is rejected before writing", () => {
  const storage = new FakeStorage();
  // Construct a snapshot exceeding PARK_MAX_BYTES (256 KB)
  const hugeState = { big: "x".repeat(300 * 1024) };
  const hugeSnap = snapshot("union-find", { state: hugeState });

  const saveRes = savePark("union-find", hugeSnap, null, storage);
  assert.equal(saveRes.ok, false);
  assert.equal(saveRes.reason, "invalid");
  assert.equal(storage.getItem(PARK_KEY), null);
});

test("clearing removes the key and is safe when storage is unavailable", () => {
  const storage = new FakeStorage();
  savePark("union-find", snapshot("union-find"), null, storage);
  assert.ok(storage.getItem(PARK_KEY));

  clearPark(storage);
  assert.equal(storage.getItem(PARK_KEY), null);

  // Safe when storage is null
  assert.doesNotThrow(() => clearPark(null));

  // Safe when storage throws
  storage.failure = "remove";
  assert.doesNotThrow(() => clearPark(storage));
});

test("parkSummary names the mission, last move, and invariant without inventing a next move", () => {
  const snap = snapshot("union-find");
  const record = {
    version: 1,
    slug: "union-find",
    at: new Date().toISOString(),
    snapshot: snap,
    lastMove: { id: "merge:A:B", label: "Merge A into B" },
  };

  const summary = parkSummary(record, LEVEL_META);
  assert.ok(summary);
  assert.equal(summary.title, "Seal the Decks");
  assert.equal(summary.missionLabel, "REPAIR 01");
  assert.equal(summary.lastMoveLabel, "Merge A into B");
  assert.ok(summary.invariant.startsWith("Union by size"));
  assert.equal("nextMove" in summary, false);
  assert.equal("nextMoveLabel" in summary, false);

  // Without lastMove
  const noMoveRecord = { ...record, lastMove: null };
  const summaryNoMove = parkSummary(noMoveRecord, LEVEL_META);
  assert.ok(summaryNoMove);
  assert.equal(summaryNoMove.lastMoveLabel, null);

  // Null record
  assert.equal(parkSummary(null, LEVEL_META), null);

  // Unknown slug
  const unknownRecord = { ...record, slug: "not-a-real-slug" };
  assert.equal(parkSummary(unknownRecord, LEVEL_META), null);
});
