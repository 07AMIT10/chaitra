import test from "node:test";
import assert from "node:assert/strict";

import { start, play, undo } from "./engine.ts";
import { LEVEL_META, hasLoader, loadLevel } from "./levels/index.ts";

test("campaign metadata is coherent", () => {
  assert.ok(LEVEL_META.length >= 1);
  const slugs = new Set();
  for (const [i, meta] of LEVEL_META.entries()) {
    assert.equal(meta.number, i + 1, `${meta.slug}: number must match order`);
    assert.ok(!slugs.has(meta.slug), `duplicate slug ${meta.slug}`);
    slugs.add(meta.slug);
    assert.ok([1, 2, 3].includes(meta.act), `${meta.slug}: act`);
    assert.ok(meta.minutes >= 2 && meta.minutes <= 7, `${meta.slug}: minutes`);
    assert.ok(meta.page.startsWith("/algorithms/programming/"), `${meta.slug}: page`);
    assert.ok(meta.hints.length >= 1, `${meta.slug}: at least one hint`);
    assert.ok(hasLoader(meta.slug), `${meta.slug}: no loader`);
  }
});

for (const meta of LEVEL_META) {
  test(`solution wins: ${meta.slug}`, async () => {
    const level = await loadLevel(meta.slug);
    assert.ok(level, `${meta.slug}: level failed to load`);
    assert.equal(level.meta.slug, meta.slug);

    let session = start(level);
    assert.equal(session.status, "playing", `${meta.slug}: initial status`);
    assert.ok(level.moves(session.state).length > 0, `${meta.slug}: no opening moves`);

    for (const move of level.solution) {
      const result = play(level, session, move);
      assert.equal(result.error, undefined, `${meta.slug}: "${move}" rejected: ${result.error}`);
      session = result.session;
    }

    assert.equal(session.status, "won", `${meta.slug}: solution did not win`);
    assert.equal(session.moves, level.solution.length, `${meta.slug}: move count`);
    assert.ok(level.view(session.state).kind, `${meta.slug}: empty view`);
    const score = level.score(session.state);
    assert.ok(score.stars >= 1 && score.stars <= 3, `${meta.slug}: stars`);
  });
}

test("undo restores the previous state", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  let session = start(level);
  const first = level.solution[0];
  const played = play(level, session, first);
  assert.equal(played.error, undefined);
  assert.equal(played.session.moves, 1);
  const back = undo(level, played.session);
  assert.equal(back.moves, 0);
  assert.equal(back.history.length, 0);
  assert.equal(back.log.length, 0);
  assert.equal(back.state.selected, "A");
});

test("union-find stops offering moves after the write budget is lost", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);

  const path = [
    "merge:A:B",
    "select:B",
    "merge:B:C",
    "select:C",
    "merge:C:D",
    "select:D",
    "merge:D:E",
  ];
  let session = start(level);
  for (const moveId of path) {
    const result = play(level, session, moveId);
    assert.equal(result.error, undefined, `${moveId}: ${result.error}`);
    session = result.session;
  }

  assert.equal(session.status, "lost");
  assert.equal(session.moves, path.length);
  assert.deepEqual(level.moves(session.state), [], "a lost mission must not advertise further moves");
  const view = level.view(session.state);
  assert.equal(
    view.nodes.some((node) => node.moveId !== undefined),
    false,
    "a lost mission must not leave board elements clickable",
  );
});

test("stable matching rejects re-selecting the already selected applicant", async () => {
  const level = await loadLevel("stable-matching");
  assert.ok(level);

  const selected = play(level, start(level), "select:A");
  assert.equal(selected.error, undefined);
  assert.equal(selected.session.moves, 1);

  const again = play(level, selected.session, "select:A");
  assert.ok(again.error, "re-selecting the same applicant should be a rejected no-op");
  assert.equal(again.session, selected.session);
  assert.equal(again.session.moves, 1, "a rejected move must not advance the move count");
});
