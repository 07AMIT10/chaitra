/**
 * Generic state-space checks for every mission.
 *
 * The walk is breadth-first from `start`, applies every enabled move returned
 * by `moves` (including moves the level deliberately rejects), and follows
 * only accepted transitions. Levels with unbounded or very large state spaces
 * are sampled; the coverage line printed for each mission says whether the
 * walk was complete or capped and why.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { play, start, undo } from "./engine.ts";
import { LEVEL_META, loadLevel } from "./levels/index.ts";

const VIEW_KINDS = new Set(["graph", "array", "grid", "tree", "pairing", "number", "formula"]);

/** Large or intentionally unbounded-counter levels get a tighter budget. */
const EXPENSIVE = new Set([
  "binary-search",
  "union-find",
  "huffman-coding",
  "quicksort",
  "stable-matching",
  "bellman-ford",
  "floyd-warshall",
  "bipartite-matching",
  "karatsuba-multiplication",
  "strassen-matrix-multiplication",
  "fixed-point-iteration",
]);

const FULL_CAP = { states: 180, transitions: 3200, timeMs: 1500 };
const TIGHT_CAP = { states: 120, transitions: 2400, timeMs: 1200 };

function capFor(slug) {
  return EXPENSIVE.has(slug) ? TIGHT_CAP : FULL_CAP;
}

function stableKey(value) {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "number" && !Number.isFinite(entry)) return `<<${entry}>>`;
    if (entry === undefined) return "<<undefined>>";
    return entry;
  });
}

function nonFinite(value, path = "$", out = []) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => nonFinite(entry, `${path}[${index}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      nonFinite(entry, `${path}.${key}`, out);
    }
  }
  return out;
}

function viewMoveIds(view) {
  const ids = [];
  const add = (entry) => {
    if (entry && typeof entry.moveId === "string") ids.push(entry.moveId);
  };
  for (const collection of [
    view.nodes,
    view.edges,
    view.items,
    view.cells,
    view.left,
    view.right,
    view.rows,
    view.outputs,
  ]) {
    if (Array.isArray(collection)) collection.forEach(add);
  }
  return ids;
}

function assertFinite(label, value, where) {
  const bad = nonFinite(value);
  assert.deepEqual(bad, [], `${where}: non-finite values in ${label}: ${bad.slice(0, 5).join(", ")}`);
}

function checkState(level, session, where) {
  assert.ok(
    session.status === "playing" || session.status === "won" || session.status === "lost",
    `${where}: invalid status ${String(session.status)}`,
  );
  assertFinite("state", session.state, where);

  const allMoves = level.moves(session.state);
  const moveIds = allMoves.map((move) => move.id);
  // Ids may recur in a later state (a repeatable button), but never twice in
  // the same state's candidate list or view.
  assert.deepEqual(
    moveIds,
    [...new Set(moveIds)],
    `${where}: duplicate move ids in moves()`,
  );
  // An enabled move is the only kind the engine will play.
  const moves = allMoves.filter((move) => !move.disabled);
  if (session.status === "playing") {
    assert.ok(moves.length > 0, `${where}: status is playing but no enabled move is offered`);
  } else {
    assert.equal(moves.length, 0, `${where}: terminal status ${session.status} still offers moves`);
  }

  const view = level.view(session.state);
  assert.ok(VIEW_KINDS.has(view.kind), `${where}: view kind ${String(view.kind)} is not one of the seven`);
  assertFinite("view", view, where);

  const bound = viewMoveIds(view);
  assert.deepEqual(
    bound,
    [...new Set(bound)],
    `${where}: duplicate move ids bound in the view`,
  );
  const enabled = new Set(moves.map((move) => move.id));
  for (const id of bound) {
    assert.ok(enabled.has(id), `${where}: view binds ${id}, which moves() does not offer`);
  }
  for (const move of moves) {
    if (move.placement !== "tray") {
      assert.ok(bound.includes(move.id), `${where}: board move ${move.id} is not bound in the view`);
    }
  }

  if (level.score) {
    const score = level.score(session.state);
    assert.ok(Number.isInteger(score.stars), `${where}: stars is not an integer`);
    assert.ok(score.stars >= 1 && score.stars <= 3, `${where}: stars ${score.stars} outside 1-3`);
    assert.equal(typeof score.detail, "string", `${where}: score detail is not a string`);
  }
}

for (const meta of LEVEL_META) {
  test(`state exploration: ${meta.slug}`, async (t) => {
    const level = await loadLevel(meta.slug);
    assert.ok(level, `${meta.slug}: level failed to load`);
    assert.deepEqual(level.meta, meta, `${meta.slug}: module meta differs from LEVEL_META`);

    const cap = capFor(meta.slug);
    const deadline = Date.now() + cap.timeMs;
    let session = start(level);
    assert.equal(session.status, "playing", `${meta.slug}: initial status`);
    checkState(level, session, "start");

    const queue = [{ session, path: [] }];
    const seen = new Set([stableKey(session.state)]);
    let states = 0;
    let transitions = 0;
    let accepted = 0;
    let rejected = 0;
    let sampled = false;
    let stopReason = "full";

    while (queue.length > 0) {
      if (Date.now() > deadline) {
        sampled = true;
        stopReason = `time cap ${cap.timeMs}ms`;
        break;
      }
      if (states >= cap.states) {
        sampled = true;
        stopReason = `state cap ${cap.states}`;
        break;
      }

      const current = queue.shift();
      const where = current.path.length > 0 ? current.path.join(" > ") : "start";
      session = current.session;
      states += 1;
      checkState(level, session, where);

      const moves = level.moves(session.state).filter((move) => !move.disabled);
      for (const move of moves) {
        if (Date.now() > deadline) {
          sampled = true;
          stopReason = `time cap ${cap.timeMs}ms`;
          break;
        }
        if (transitions >= cap.transitions) {
          sampled = true;
          stopReason = `transition cap ${cap.transitions}`;
          break;
        }
        transitions += 1;

        const before = structuredClone(session.state);
        const result = play(level, session, move.id);

        if (result.error) {
          rejected += 1;
          assert.equal(
            result.session,
            session,
            `${where} > ${move.id}: rejected move returned a different session`,
          );
          assert.deepEqual(
            session.state,
            before,
            `${where} > ${move.id}: rejected move mutated the state`,
          );
          continue;
        }

        accepted += 1;
        assert.notEqual(
          result.session.state,
          session.state,
          `${where} > ${move.id}: accepted move reused the old state object`,
        );
        assert.deepEqual(
          session.state,
          before,
          `${where} > ${move.id}: accepted move mutated the previous state`,
        );
        assert.notDeepEqual(
          result.session.state,
          before,
          `${where} > ${move.id}: accepted move did not change the state`,
        );
        assert.equal(
          result.session.moves,
          session.moves + 1,
          `${where} > ${move.id}: move count did not advance`,
        );
        assert.equal(
          result.session.hints,
          session.hints,
          `${where} > ${move.id}: hints changed during a move`,
        );
        assert.equal(
          result.session.history.length,
          session.history.length + 1,
          `${where} > ${move.id}: history snapshot missing`,
        );
        assert.ok(result.session.log.length <= 8, `${where} > ${move.id}: log grew past its cap`);

        const back = undo(level, result.session);
        assert.deepEqual(
          back.state,
          session.state,
          `${where} > ${move.id}: undo did not restore the state`,
        );
        assert.equal(back.moves, session.moves, `${where} > ${move.id}: undo move count`);
        assert.equal(back.log.length, session.log.length, `${where} > ${move.id}: undo log length`);
        assert.deepEqual(back.log, session.log, `${where} > ${move.id}: undo log contents`);
        assert.equal(
          back.history.length,
          session.history.length,
          `${where} > ${move.id}: undo history length`,
        );
        assert.equal(back.status, session.status, `${where} > ${move.id}: undo status`);
        assert.equal(back.hints, session.hints, `${where} > ${move.id}: undo hints`);

        const key = stableKey(result.session.state);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ session: result.session, path: [...current.path, move.id] });
        }
      }

      if (sampled) break;
    }

    console.log(
      `coverage ${meta.slug}: ${states} states, ${transitions} transitions ` +
        `(${accepted} accepted / ${rejected} rejected) - ${sampled ? `sampled (${stopReason})` : "full"}`,
    );

    // The published solution must win through the same public engine path.
    let solution = start(level);
    for (const [index, moveId] of level.solution.entries()) {
      const before = structuredClone(solution.state);
      const result = play(level, solution, moveId);
      assert.equal(
        result.error,
        undefined,
        `${meta.slug}: solution move "${moveId}" rejected: ${result.error}`,
      );
      assert.deepEqual(solution.state, before, `${meta.slug}: solution move "${moveId}" mutated the state`);
      assert.notEqual(
        result.session.state,
        solution.state,
        `${meta.slug}: solution move "${moveId}" reused the old state object`,
      );
      solution = result.session;
      checkState(level, solution, `solution step ${index + 1} (${moveId})`);
    }
    assert.equal(solution.status, "won", `${meta.slug}: solution did not win`);
    assert.equal(solution.moves, level.solution.length, `${meta.slug}: solution move count`);
    const finalView = level.view(solution.state);
    assert.ok(VIEW_KINDS.has(finalView.kind), `${meta.slug}: solution view kind`);
    assertFinite("solution view", finalView, `${meta.slug} solution`);
    assert.equal(
      level.moves(solution.state).filter((move) => !move.disabled).length,
      0,
      `${meta.slug}: won state still offers moves`,
    );
    if (level.score) {
      const score = level.score(solution.state);
      assert.ok(
        Number.isInteger(score.stars) && score.stars >= 1 && score.stars <= 3,
        `${meta.slug}: solution stars`,
      );
    }

    t.diagnostic(
      `${meta.slug}: ${states} states / ${transitions} transitions, ${seen.size} distinct states discovered`,
    );
  });
}
