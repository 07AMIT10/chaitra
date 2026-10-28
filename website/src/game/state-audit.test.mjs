/**
 * Final state/logic audit for The Long Repair.
 *
 * This file is intentionally read-only with respect to the game: it imports
 * the public engine and the level modules, but it never mutates a module or a
 * published meta. Each mission is explored breadth-first from its initial
 * state through every enabled move returned by `moves()`. Levels whose state
 * space is unbounded (counters, relaxed rounds, route retries) are sampled
 * with a per-level state/time/transition cap; the coverage line printed for
 * each mission says whether the walk was complete or capped and why.
 *
 * The audit checks, for every reachable state it visits:
 *   - no "playing" state is a dead end (no enabled move, or no move accepted),
 *   - every non-tray move is bound to a matching `moveId` in the view,
 *   - move ids are unique in `moves()` and in the rendered view,
 *   - rejected moves return the same session and do not mutate the state,
 *   - accepted moves are immutable and undo restores state, moves and log length,
 *   - stars stay in 1..3 and state/view/score contain no NaN or Infinity,
 *   - `level.meta` deep-equals the central `LEVEL_META` entry,
 *   - the published solution wins and the view kind is one of the seven.
 *
 * A real finding should name the slug, the exact state (or the closest
 * reproducible path printed in the assertion) and the move id.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { start, play, undo } from "./engine.ts";
import { LEVEL_META, loadLevel, metaBySlug } from "./levels/index.ts";

const VIEW_KINDS = new Set([
  "graph",
  "array",
  "grid",
  "tree",
  "pairing",
  "number",
  "formula",
]);

/** Stop the whole file well inside the sprint budget even on a slow host. */
const GLOBAL_BUDGET_MS = 45_000;
const GLOBAL_DEADLINE = Date.now() + GLOBAL_BUDGET_MS;

const DEFAULT_CAP = { states: 20_000, transitions: 250_000, ms: 2_000 };

/**
 * Levels with a fast-growing history/view or an unbounded counter get a
 * tighter wall-clock cap. The state cap still applies to every level.
 */
const TIGHT_SLUGS = new Set([
  "union-find",
  "huffman-coding",
  "quicksort",
  "stable-matching",
  "bellman-ford",
  "floyd-warshall",
  "bipartite-matching",
  "karatsuba-multiplication",
  "strassen-matrix-multiplication",
]);

const CAPS = new Map([
  // The cobweb history is part of every state and grows linearly with n.
  ["fixed-point-iteration", { states: 3_000, transitions: 30_000, ms: 1_200 }],
]);

for (const slug of TIGHT_SLUGS) {
  CAPS.set(slug, { states: 20_000, transitions: 250_000, ms: 1_600 });
}

function capFor(slug) {
  return CAPS.get(slug) ?? DEFAULT_CAP;
}

/** Stable, key-sorted serialization used only for state de-duplication. */
function stableKey(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "#NaN";
    if (value === Infinity) return "#Infinity";
    if (value === -Infinity) return "#-Infinity";
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`)
      .join(",")}}`;
  }
  return String(value);
}

/** Short, exact-enough state rendering for assertion messages. */
function stateText(state) {
  let text;
  try {
    text = JSON.stringify(state);
  } catch {
    text = stableKey(state);
  }
  return text.length > 1_600 ? `${text.slice(0, 1_600)}…` : text;
}

function walkNumbers(value, path, out, seen) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(`${path}=${String(value)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkNumbers(entry, `${path}[${index}]`, out, seen));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    walkNumbers(entry, `${path}.${key}`, out, seen);
  }
}

function nonFinitePaths(value, path = "$") {
  const out = [];
  walkNumbers(value, path, out, new WeakSet());
  return out;
}

function assertFinite(label, value, where) {
  const bad = nonFinitePaths(value);
  assert.deepEqual(
    bad,
    [],
    `${where}: ${label} contains NaN/Infinity at ${bad.slice(0, 6).join(", ")}`,
  );
}

/** Collect every `moveId` the rendered view exposes, whatever its view kind. */
function collectViewMoveIds(view) {
  const ids = [];
  const seen = new WeakSet();

  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key === "moveId" && typeof entry === "string") ids.push(entry);
      else walk(entry);
    }
  }

  walk(view);
  return ids;
}

function duplicates(ids) {
  const seen = new Set();
  const repeated = new Set();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

/**
 * A lightweight but engine-shaped session for a reached state. The synthetic
 * log lets undo's log-length restoration be checked without keeping the full
 * history of every queued state; the real solution rewind below also checks
 * undo on a fully accumulated history.
 */
function sessionFor(level, state, status, depth) {
  const log = Array.from({ length: Math.min(depth, 8) }, (_, index) => ({
    text: `audit log ${index}`,
    kind: "info",
  }));
  return {
    state,
    history: [],
    log,
    status,
    moves: depth,
    hints: 0,
  };
}

function checkScore(level, state, where) {
  if (typeof level.score !== "function") return 0;
  let score;
  try {
    score = level.score(state);
  } catch (error) {
    assert.fail(`${where}: score() threw: ${error?.stack ?? error}`);
  }
  assert.ok(score && typeof score === "object", `${where}: score() returned no result`);
  assert.ok(
    Number.isInteger(score.stars) && score.stars >= 1 && score.stars <= 3,
    `${where}: stars ${String(score.stars)} outside 1-3 (state ${stateText(state)})`,
  );
  assert.equal(typeof score.detail, "string", `${where}: score detail is not a string`);
  assertFinite("score", score, where);
  return 1;
}

function checkView(level, state, where) {
  let view;
  try {
    view = level.view(state);
  } catch (error) {
    assert.fail(`${where}: view() threw: ${error?.stack ?? error}`);
  }
  assert.ok(view && typeof view === "object", `${where}: view() returned no view`);
  assert.ok(
    VIEW_KINDS.has(view.kind),
    `${where}: view kind ${String(view.kind)} is not one of the seven`,
  );
  assertFinite("view", view, where);

  const bound = collectViewMoveIds(view);
  assert.deepEqual(
    duplicates(bound),
    [],
    `${where}: duplicate move ids bound in the view: ${duplicates(bound).join(", ")}`,
  );
  return bound;
}

for (const meta of LEVEL_META) {
  test(`state audit: ${meta.slug}`, async (t) => {
    const level = await loadLevel(meta.slug);
    assert.ok(level, `${meta.slug}: level failed to load`);

    const central = metaBySlug(meta.slug);
    assert.ok(central, `${meta.slug}: central LEVEL_META entry missing`);
    assert.deepEqual(level.meta, central, `${meta.slug}: module meta differs from LEVEL_META`);

    const cap = capFor(meta.slug);
    const startedAt = Date.now();
    const deadline = Math.min(startedAt + cap.ms, GLOBAL_DEADLINE);

    const initial = start(level);
    assert.deepEqual(initial.state, level.initial, `${meta.slug}: start did not clone initial`);
    assert.notEqual(initial.state, level.initial, `${meta.slug}: start shares the initial object`);
    assert.equal(initial.status, "playing", `${meta.slug}: initial status is ${initial.status}`);

    const initialSnapshot = structuredClone(level.initial);
    const seen = new Set([stableKey(initial.state)]);
    const queue = [
      { state: initial.state, status: initial.status, depth: 0, path: [] },
    ];

    let head = 0;
    let states = 0;
    let transitions = 0;
    let accepted = 0;
    let rejected = 0;
    let playingStates = 0;
    let undoChecks = 0;
    let scoreChecks = 0;
    let boundChecks = 0;
    let sampled = false;
    let stopReason = "complete";

    while (head < queue.length) {
      // Always inspect the initial state of every mission, even if a slow
      // earlier mission has consumed the global budget.
      if (states > 0) {
        if (Date.now() > deadline) {
          sampled = true;
          stopReason = `time cap ${cap.ms}ms`;
          break;
        }
        if (states >= cap.states) {
          sampled = true;
          stopReason = `state cap ${cap.states}`;
          break;
        }
      }

      const node = queue[head];
      head += 1;
      states += 1;
      const where =
        node.depth === 0
          ? "start"
          : `depth ${node.depth} ${node.path.join(" > ")}`;
      const state = node.state;
      const stateSnapshot = structuredClone(state);
      const base = sessionFor(level, state, node.status, node.depth);

      assertFinite("state", state, where);
      if (node.status === "playing") playingStates += 1;

      let moves;
      try {
        moves = level.moves(state);
      } catch (error) {
        assert.fail(`${where}: moves() threw: ${error?.stack ?? error}`);
      }
      assert.ok(Array.isArray(moves), `${where}: moves() did not return an array`);

      const moveIds = moves.map((move) => move.id);
      assert.deepEqual(
        duplicates(moveIds),
        [],
        `${where}: duplicate move ids in moves(): ${duplicates(moveIds).join(", ")}`,
      );
      for (const move of moves) {
        assert.equal(typeof move.id, "string", `${where}: move id is not a string`);
        assert.ok(move.id.length > 0, `${where}: empty move id`);
        assert.equal(typeof move.label, "string", `${where}: move ${move.id} has no label`);
        if (move.placement !== undefined) {
          assert.ok(
            move.placement === "board" || move.placement === "tray",
            `${where}: move ${move.id} has placement ${String(move.placement)}`,
          );
        }
      }

      const enabled = moves.filter((move) => !move.disabled);
      if (node.status === "playing") {
        assert.ok(
          enabled.length > 0,
          `${where}: softlock, status is playing but no enabled move is offered (state ${stateText(state)})`,
        );
      }

      const bound = checkView(level, state, where);
      const boundSet = new Set(bound);
      const offered = new Set(moveIds);

      for (const move of moves) {
        if (move.placement === "tray") continue;
        boundChecks += 1;
        assert.ok(
          boundSet.has(move.id),
          `${where}: board move ${move.id} is not bound to a moveId in the view (state ${stateText(state)})`,
        );
      }
      for (const id of bound) {
        assert.ok(
          offered.has(id),
          `${where}: view binds ${id}, which moves() does not offer (state ${stateText(state)})`,
        );
      }

      scoreChecks += checkScore(level, state, where);

      // Rejected moves must be inert: same session object, unchanged state.
      const bogus = play(level, base, "__audit_missing_move__");
      assert.ok(
        typeof bogus.error === "string" && bogus.error.length > 0,
        `${where}: bogus move was not rejected`,
      );
      assert.equal(bogus.session, base, `${where}: bogus rejection returned a new session`);
      assert.deepEqual(
        base.state,
        stateSnapshot,
        `${where}: bogus rejection mutated the state`,
      );
      rejected += 1;

      let acceptedHere = 0;
      let stateFullyTried = true;

      for (const move of enabled) {
        if (Date.now() > deadline) {
          sampled = true;
          stopReason = `time cap ${cap.ms}ms`;
          stateFullyTried = false;
          break;
        }
        if (transitions >= cap.transitions) {
          sampled = true;
          stopReason = `transition cap ${cap.transitions}`;
          stateFullyTried = false;
          break;
        }
        transitions += 1;

        const result = play(level, base, move.id);
        if (result.error) {
          rejected += 1;
          assert.equal(
            result.session,
            base,
            `${where} > ${move.id}: rejected move returned a different session`,
          );
          assert.deepEqual(
            base.state,
            stateSnapshot,
            `${where} > ${move.id}: rejected move mutated the state (state ${stateText(state)})`,
          );
          assert.ok(
            result.error.trim().length > 0,
            `${where} > ${move.id}: rejected move has an empty error`,
          );
          continue;
        }

        accepted += 1;
        acceptedHere += 1;
        assert.deepEqual(
          base.state,
          stateSnapshot,
          `${where} > ${move.id}: accepted move mutated the previous state`,
        );
        assert.equal(
          result.session.moves,
          base.moves + 1,
          `${where} > ${move.id}: move count did not advance`,
        );
        assert.equal(
          result.session.hints,
          base.hints,
          `${where} > ${move.id}: hints changed during a move`,
        );
        assert.equal(
          result.session.history.length,
          base.history.length + 1,
          `${where} > ${move.id}: history snapshot missing`,
        );
        assert.ok(
          result.session.log.length <= 8,
          `${where} > ${move.id}: log grew past its eight-entry cap`,
        );
        assertFinite("next state", result.session.state, `${where} > ${move.id}`);

        const back = undo(level, result.session);
        undoChecks += 1;
        assert.deepEqual(
          back.state,
          stateSnapshot,
          `${where} > ${move.id}: undo did not restore the previous state (state ${stateText(state)})`,
        );
        assert.equal(
          back.moves,
          base.moves,
          `${where} > ${move.id}: undo restored the wrong move count`,
        );
        assert.equal(
          back.log.length,
          base.log.length,
          `${where} > ${move.id}: undo restored the wrong log length`,
        );
        assert.equal(
          back.status,
          base.status,
          `${where} > ${move.id}: undo restored the wrong status`,
        );
        assert.equal(
          back.hints,
          base.hints,
          `${where} > ${move.id}: undo changed the hint count`,
        );
        assert.equal(
          back.history.length,
          base.history.length,
          `${where} > ${move.id}: undo restored the wrong history length`,
        );

        const nextKey = stableKey(result.session.state);
        if (!seen.has(nextKey)) {
          seen.add(nextKey);
          queue.push({
            state: result.session.state,
            status: result.session.status,
            depth: node.depth + 1,
            path: [...node.path, move.id].slice(-8),
          });
        }
      }

      if (
        stateFullyTried &&
        node.status === "playing" &&
        enabled.length > 0 &&
        acceptedHere === 0
      ) {
        assert.fail(
          `${where}: softlock, status is playing and all ${enabled.length} enabled moves are rejected (state ${stateText(state)})`,
        );
      }

      if (!stateFullyTried) break;
    }

    assert.deepEqual(
      level.initial,
      initialSnapshot,
      `${meta.slug}: exploration mutated the module's initial state`,
    );

    // The published solution must win through the public engine.
    let solution = start(level);
    const solutionStates = [structuredClone(solution.state)];
    const solutionLogLengths = [solution.log.length];
    const solutionMoves = [solution.moves];

    for (const moveId of level.solution) {
      const before = structuredClone(solution.state);
      const result = play(level, solution, moveId);
      assert.equal(
        result.error,
        undefined,
        `${meta.slug}: published solution move "${moveId}" rejected: ${result.error}`,
      );
      assert.deepEqual(
        solution.state,
        before,
        `${meta.slug}: published solution move "${moveId}" mutated the previous state`,
      );
      solution = result.session;
      solutionStates.push(structuredClone(solution.state));
      solutionLogLengths.push(solution.log.length);
      solutionMoves.push(solution.moves);

      assertFinite(
        "solution state",
        solution.state,
        `${meta.slug}: solution after ${moveId}`,
      );
      checkView(level, solution.state, `${meta.slug}: solution after ${moveId}`);
      checkScore(level, solution.state, `${meta.slug}: solution after ${moveId}`);
    }

    assert.equal(solution.status, "won", `${meta.slug}: published solution did not win`);
    assert.equal(
      solution.moves,
      level.solution.length,
      `${meta.slug}: published solution move count`,
    );

    const finalView = checkView(level, solution.state, `${meta.slug}: solution`);
    assert.deepEqual(
      duplicates(finalView),
      [],
      `${meta.slug}: duplicate move ids in the solution view`,
    );
    checkScore(level, solution.state, `${meta.slug}: solution`);

    // Rewind the real solution session: accumulated history/log lengths must
    // come back exactly, one move at a time, all the way to the start.
    let rewound = solution;
    for (let index = solutionStates.length - 1; index > 0; index -= 1) {
      const back = undo(level, rewound);
      assert.deepEqual(
        back.state,
        solutionStates[index - 1],
        `${meta.slug}: solution undo ${index} did not restore the state`,
      );
      assert.equal(
        back.moves,
        solutionMoves[index - 1],
        `${meta.slug}: solution undo ${index} restored the wrong move count`,
      );
      assert.equal(
        back.log.length,
        solutionLogLengths[index - 1],
        `${meta.slug}: solution undo ${index} restored the wrong log length`,
      );
      rewound = back;
    }
    assert.deepEqual(rewound.state, initial.state, `${meta.slug}: full rewind did not reach start`);
    assert.equal(rewound.moves, 0, `${meta.slug}: full rewind left moves`);
    assert.equal(rewound.log.length, 0, `${meta.slug}: full rewind left log entries`);
    assert.equal(rewound.history.length, 0, `${meta.slug}: full rewind left history`);
    assert.equal(rewound.status, "playing", `${meta.slug}: full rewind status is not playing`);

    const elapsed = Date.now() - startedAt;
    t.diagnostic(
      `${meta.slug}: ${states} states / ${transitions} transitions ` +
        `(${accepted} accepted / ${rejected} rejected), ${seen.size} distinct states, ` +
        `${playingStates} playing, ${undoChecks} undo, ${boundChecks} board bindings, ` +
        `${scoreChecks} score - ${sampled ? `SAMPLED (${stopReason})` : "complete"} ` +
        `[cap ${cap.states} states / ${cap.transitions} transitions / ${cap.ms}ms] ${elapsed}ms`,
    );
  });
}
