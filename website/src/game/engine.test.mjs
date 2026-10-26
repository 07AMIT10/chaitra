import test from "node:test";
import assert from "node:assert/strict";

import {
  captureSession,
  play,
  restart,
  restoreSession,
  start,
  undo,
} from "./engine.ts";
import { loadLevel } from "./levels/index.ts";

test("play is deterministic, immutable, and undo restores the snapshot", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);

  const opening = play(level, start(level), "select:A");
  assert.equal(opening.error, undefined);
  const base = opening.session;
  const before = structuredClone(base.state);

  const first = play(level, base, "merge:A:B");
  const second = play(level, base, "merge:A:B");
  assert.equal(first.error, undefined);
  assert.deepEqual(first.session, second.session, "the same move from the same state must replay identically");
  assert.deepEqual(base.state, before, "play must not mutate the input session");

  const back = undo(level, first.session);
  assert.deepEqual(back.state, base.state);
  assert.equal(back.moves, base.moves);
  assert.equal(back.history.length, base.history.length);
  assert.equal(back.log.length, base.log.length);
  assert.equal(back.status, base.status);
});

test("undo restores an apply-level status override", () => {
  const fake = {
    meta: { slug: "override-fixture" },
    initial: { n: 0 },
    moves(state) {
      if (state.n === 0) return [{ id: "open", label: "Open" }];
      if (state.n === 1) return [{ id: "advance", label: "Advance" }];
      return [];
    },
    apply(state, moveId) {
      if (moveId === "open") {
        // The fixture's status() would call n=1 lost; the override keeps the
        // session alive so a second move can be played and then undone.
        return { state: { n: 1 }, events: [], status: "playing" };
      }
      if (moveId === "advance") {
        return { state: { n: 2 }, events: [] };
      }
      return { state, events: [], error: "Unknown move." };
    },
    view() {
      return { kind: "number", value: 0, target: 0, history: [] };
    },
    status(state) {
      if (state.n === 1) return "lost";
      if (state.n === 2) return "won";
      return "playing";
    },
    score() {
      return { stars: 1, detail: "fixture" };
    },
    solution: [],
  };

  let session = start(fake);
  assert.equal(session.status, "playing");
  session = play(fake, session, "open").session;
  assert.equal(session.status, "playing", "the apply override wins over status()");
  session = play(fake, session, "advance").session;
  assert.equal(session.status, "won");

  const back = undo(fake, session);
  assert.deepEqual(back.state, { n: 1 });
  assert.equal(back.status, "playing", "undo must restore the status the player saw, not recompute it");
});

test("a captured session survives JSON and resumes at the same point", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);

  let session = start(level);
  for (const moveId of level.solution.slice(0, 3)) {
    const result = play(level, session, moveId);
    assert.equal(result.error, undefined);
    session = result.session;
  }

  const snapshot = captureSession(level, session);
  assert.equal(snapshot.slug, "union-find");
  assert.equal(snapshot.version, 1);
  const roundTripped = JSON.parse(JSON.stringify(snapshot));
  const resumed = restoreSession(level, roundTripped);
  assert.ok(resumed, "a valid snapshot must restore");
  assert.deepEqual(resumed, session);
  assert.notEqual(resumed.state, session.state, "restore must not share live state objects");
  assert.notEqual(resumed.history, session.history, "restore must not share live history objects");

  resumed.state.parent.A = "F";
  assert.equal(session.state.parent.A, "B", "mutating the restored state must not touch the live session");

  const fresh = restoreSession(level, roundTripped);
  assert.ok(fresh);
  assert.equal(fresh.state.parent.A, "B");
  let continued = fresh;
  for (const moveId of level.solution.slice(3)) {
    const result = play(level, continued, moveId);
    assert.equal(result.error, undefined, `${moveId}: ${result.error}`);
    continued = result.session;
  }
  assert.equal(continued.status, "won");
});

test("corrupt or cross-level snapshots fail closed", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  const snapshot = captureSession(level, start(level));

  const mutate = (fn) => {
    const copy = structuredClone(snapshot);
    fn(copy);
    return restoreSession(level, copy);
  };

  assert.equal(restoreSession(level, null), null);
  assert.equal(restoreSession(level, {}), null);
  assert.equal(mutate((copy) => { copy.version = 2; }), null);
  assert.equal(mutate((copy) => { copy.slug = "binary-search"; }), null);
  assert.equal(mutate((copy) => { copy.status = "finished"; }), null);
  assert.equal(mutate((copy) => { copy.moves = 1; }), null);
  assert.equal(mutate((copy) => { copy.hints = -1; }), null);
  assert.equal(mutate((copy) => { copy.history = [{ state: null, logLength: 0, status: "playing" }]; copy.moves = 1; }), null);
  assert.equal(mutate((copy) => { copy.log = [{ text: 7 }]; }), null);
});

test("undo restores the capped rolling log, not just its length", async () => {
  const level = await loadLevel("quicksort");
  assert.ok(level);

  let session = start(level);
  const logs = [structuredClone(session.log)];
  for (const moveId of level.solution) {
    const result = play(level, session, moveId);
    assert.equal(result.error, undefined, `${moveId}: ${result.error}`);
    session = result.session;
    logs.push(structuredClone(session.log));
  }

  assert.equal(session.log.length, 8, "the fixture should fill the rolling log");
  assert.notDeepEqual(logs[logs.length - 1], logs[logs.length - 2]);

  let restored = session;
  for (let index = logs.length - 2; index >= 0; index -= 1) {
    restored = undo(level, restored);
    assert.deepEqual(restored.log, logs[index], `undo step ${index} log contents`);
  }
  assert.equal(restored.log.length, 0);
});

test("replaying after undo wins again, and undoing every move restores the start", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  const initial = structuredClone(level.initial);

  let session = start(level);
  for (const moveId of level.solution) {
    const result = play(level, session, moveId);
    assert.equal(result.error, undefined, `${moveId}: ${result.error}`);
    session = result.session;
  }
  assert.equal(session.status, "won");
  const winningState = structuredClone(session.state);

  const back = undo(level, session);
  assert.equal(back.status, "playing");
  assert.equal(back.moves, level.solution.length - 1);
  assert.equal(back.history.length, level.solution.length - 1);

  const replay = play(level, back, level.solution[level.solution.length - 1]);
  assert.equal(replay.error, undefined);
  assert.equal(replay.session.status, "won");
  assert.deepEqual(replay.session.state, winningState);

  let rewind = replay.session;
  while (rewind.history.length > 0) rewind = undo(level, rewind);
  assert.equal(rewind.moves, 0);
  assert.equal(rewind.history.length, 0);
  assert.equal(rewind.log.length, 0);
  assert.equal(rewind.status, "playing");
  assert.deepEqual(rewind.state, initial);
});

test("restart is clean and keeps the caller's hint count", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  let session = play(level, start(level), level.solution[0]).session;
  assert.equal(session.hints, 0);

  const restarted = restart(level, 2);
  assert.equal(restarted.moves, 0);
  assert.equal(restarted.history.length, 0);
  assert.equal(restarted.log.length, 0);
  assert.equal(restarted.hints, 2);
  assert.equal(restarted.status, "playing");
  assert.deepEqual(restarted.state, level.initial);
});

test("terminal sessions and empty undo are inert", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  let session = start(level);
  const emptyUndo = undo(level, session);
  assert.equal(emptyUndo, session);

  const invalid = play(level, session, "not-a-move");
  assert.ok(invalid.error);
  assert.equal(invalid.session, session);

  for (const moveId of level.solution) {
    session = play(level, session, moveId).session;
  }
  assert.equal(session.status, "won");
  const afterWin = play(level, session, level.solution[0]);
  assert.ok(afterWin.error);
  assert.equal(afterWin.session, session);
});

test("start clones the level's initial state", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  const first = start(level);
  const second = start(level);
  assert.deepEqual(first.state, level.initial);
  assert.notEqual(first.state, level.initial);
  assert.notEqual(first.state, second.state);
});
