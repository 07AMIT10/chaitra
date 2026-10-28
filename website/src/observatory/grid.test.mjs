import test from "node:test";
import assert from "node:assert/strict";

import { GRID_MAX_FRAMES, gridRunner, runGridTable } from "./runners/grid.ts";
import { scenarioHash } from "./hash.ts";
import { gridCellId, viewIds } from "./scenario.ts";

const table = (strategy, a, b) => ({
  schema: 1,
  id: `prefix-loom-${strategy}`,
  title: "Prefix Loom",
  substrate: "grid",
  strategy,
  model: { kind: "table", a, b },
  params: {},
});

const activeId = (frame) => frame.highlights.find((highlight) => highlight.role === "active")?.id;
const cellAt = (frame, r, c) => frame.view.cells.find((cell) => cell.r === r && cell.c === c);

function assertFrameIntegrity(run) {
  for (const frame of run.frames) {
    const ids = new Set();
    assert.equal(frame.view.cells.length, frame.view.rows * frame.view.cols);
    for (const cell of frame.view.cells) {
      const id = gridCellId(cell.r, cell.c);
      assert.equal(id, `${cell.r}:${cell.c}`);
      assert.ok(!ids.has(id), `duplicate cell id ${id}`);
      ids.add(id);
    }
    for (let r = 0; r < frame.view.rows; r += 1) {
      for (let c = 0; c < frame.view.cols; c += 1) {
        assert.ok(ids.has(`${r}:${c}`), `missing cell ${r}:${c}`);
      }
    }
    const known = viewIds(frame.view);
    assert.equal(known.size, ids.size);
    for (const highlight of frame.highlights) {
      assert.ok(known.has(highlight.id), `unresolved highlight ${highlight.id}`);
    }
    assert.match(frame.stateHash, /^[0-9a-f]{8}$/);
  }
}

test("grid runner declares the grid contract", () => {
  assert.equal(gridRunner.substrate, "grid");
  assert.deepEqual([...gridRunner.strategies], ["edit-distance", "lcs"]);
  assert.equal(GRID_MAX_FRAMES, 300);
});

test("validate accepts a bounded table and rejects bad shapes without throwing", () => {
  assert.deepEqual(gridRunner.validate(table("edit-distance", "kitten", "sitting")), []);
  assert.deepEqual(gridRunner.validate(table("lcs", "", "")), []);

  const wrongSubstrate = { ...table("edit-distance", "a", "b"), substrate: "array" };
  assert.ok(gridRunner.validate(wrongSubstrate).some((item) => item.code === "substrate-mismatch"));

  const wrongStrategy = { ...table("edit-distance", "a", "b"), strategy: "dijkstra" };
  assert.ok(gridRunner.validate(wrongStrategy).some((item) => item.code === "strategy-mismatch"));

  const wrongModel = { ...table("edit-distance", "a", "b"), model: { kind: "array", values: [1] } };
  assert.ok(gridRunner.validate(wrongModel).some((item) => item.code === "model-kind"));

  const wrongTypes = { ...table("edit-distance", "a", "b"), model: { kind: "table", a: 1, b: null } };
  let wrongTypeDiagnostics = [];
  assert.doesNotThrow(() => {
    wrongTypeDiagnostics = gridRunner.validate(wrongTypes);
  });
  assert.deepEqual(
    wrongTypeDiagnostics.map((item) => item.path),
    ["model.a", "model.b"],
  );

  assert.ok(
    gridRunner.validate(table("edit-distance", "a".repeat(12), "b")).some((item) => item.code === "table-rows"),
  );
  assert.ok(
    gridRunner.validate(table("edit-distance", "a", "b".repeat(14))).some((item) => item.code === "table-cols"),
  );
  assert.doesNotThrow(() => gridRunner.validate({}));
  assert.doesNotThrow(() => gridRunner.validate(null));
});

test("edit distance fills kitten/sitting row-major and ends at 3", () => {
  const scenario = table("edit-distance", "kitten", "sitting");
  const run = gridRunner.run(scenario);

  assert.equal(run.outcome, "done");
  assert.deepEqual(run.diagnostics, []);
  assert.equal(run.frames.length, 6 * 7 + 1);
  assert.equal(run.frames[0].index, 0);
  assert.equal(run.frames.at(-1).index, run.frames.length - 1);
  assert.equal(run.hash, scenarioHash(scenario));

  const initial = run.frames[0];
  assert.equal(initial.view.kind, "grid");
  assert.equal(initial.view.rows, 7);
  assert.equal(initial.view.cols, 8);
  assert.equal(initial.view.cells.length, 56);
  assert.equal(cellAt(initial, 0, 0).value, 0);
  assert.equal(cellAt(initial, 0, 7).value, 7);
  assert.equal(cellAt(initial, 6, 0).value, 6);
  assert.equal(cellAt(initial, 1, 1).value, "");

  const order = run.frames.slice(1).map(activeId);
  assert.equal(order.length, 42);
  assert.equal(order[0], "1:1");
  assert.equal(order[1], "1:2");
  assert.equal(order[7], "2:1");
  assert.equal(order.at(-1), "6:7");

  const last = run.frames.at(-1);
  assert.equal(cellAt(last, 6, 7).value, 3);
  assert.equal(last.metrics.find((metric) => metric.label === "Distance").value, "3");
  assert.equal(last.metrics.find((metric) => metric.label === "Cell").value, "(6, 7)");
  assert.ok(last.invariants.every((invariant) => invariant.holds));
  assert.ok(run.frames[0].invariants.find((item) => item.label === "Final cell").holds === false);

  assertFrameIntegrity(run);
});

test("row and column labels are the epsilon-prefixed strings", () => {
  const run = gridRunner.run(table("edit-distance", "kitten", "sitting"));
  const { rowLabels, colLabels } = run.frames[0].view;
  assert.deepEqual(rowLabels, ["ε", "k", "i", "t", "t", "e", "n"]);
  assert.deepEqual(colLabels, ["ε", "s", "i", "t", "t", "i", "n", "g"]);
});

test("LCS fixture AGGTAB/GXTXAYB ends at 4 and marks the alignment path", () => {
  const run = gridRunner.run(table("lcs", "AGGTAB", "GXTXAYB"));
  assert.equal(run.outcome, "done");
  assert.equal(run.frames.length, 6 * 7 + 1);

  const last = run.frames.at(-1);
  assert.equal(cellAt(last, 6, 7).value, 4);
  assert.equal(last.metrics.find((metric) => metric.label === "LCS length").value, "4");
  assert.ok(last.invariants.every((invariant) => invariant.holds));

  const pathIds = last.highlights
    .filter((highlight) => highlight.role === "emerge")
    .map((highlight) => highlight.id);
  assert.ok(pathIds.length >= 4);
  assert.ok(last.highlights.some((highlight) => highlight.id === "6:7"));

  assertFrameIntegrity(run);
});

test("runs are deterministic and do not mutate the scenario", () => {
  const scenario = table("edit-distance", "kitten", "sitting");
  const snapshot = structuredClone(scenario);
  const first = gridRunner.run(scenario);
  const second = gridRunner.run(structuredClone(scenario));

  assert.deepEqual(first, second);
  assert.deepEqual(scenario, snapshot);
  assert.equal(first.hash, second.hash);
  assert.notEqual(first.hash, gridRunner.run(table("edit-distance", "sitting", "kitten")).hash);

  assert.notEqual(runGridTable({ kind: "table", a: "ab", b: "ba" }, "lcs").frames[0].stateHash, first.frames[0].stateHash);
});

test("empty strings produce one seeded frame and no interior work", () => {
  const empty = gridRunner.run(table("edit-distance", "", ""));
  assert.equal(empty.outcome, "done");
  assert.equal(empty.frames.length, 1);
  assert.equal(empty.frames[0].view.rows, 1);
  assert.equal(empty.frames[0].view.cols, 1);
  assert.equal(empty.frames[0].view.cells.length, 1);
  assert.equal(empty.frames[0].view.cells[0].value, 0);
  assert.deepEqual(empty.frames[0].view.rowLabels, ["ε"]);
  assert.deepEqual(empty.frames[0].view.colLabels, ["ε"]);
  assert.equal(empty.frames[0].metrics.find((metric) => metric.label === "Distance").value, "0");
  assert.ok(empty.frames[0].highlights.some((highlight) => highlight.id === "0:0"));
  assert.ok(empty.frames[0].invariants.every((invariant) => invariant.holds));

  const oneAxis = gridRunner.run(table("edit-distance", "kitten", ""));
  assert.equal(oneAxis.frames.length, 1);
  assert.equal(cellAt(oneAxis.frames[0], 6, 0).value, 6);
  assert.equal(oneAxis.frames[0].metrics.find((metric) => metric.label === "Distance").value, "6");
  const path = oneAxis.frames[0].highlights.map((highlight) => highlight.id);
  assert.deepEqual(path, ["6:0", "5:0", "4:0", "3:0", "2:0", "1:0", "0:0"]);

  const emptyLcs = gridRunner.run(table("lcs", "", "abc"));
  assert.equal(emptyLcs.outcome, "done");
  assert.equal(emptyLcs.frames.length, 1);
  assert.equal(emptyLcs.frames[0].metrics.find((metric) => metric.label === "LCS length").value, "0");
});

test("the 300-frame cap stops a trace and reports max-steps", () => {
  const capped = runGridTable({ kind: "table", a: "abc", b: "abc" }, "lcs", 5);
  assert.equal(capped.outcome, "max-steps");
  assert.equal(capped.frames.length, 5);
  assert.deepEqual(
    capped.frames.map((frame) => frame.index),
    [0, 1, 2, 3, 4],
  );
  for (const frame of capped.frames) {
    const known = viewIds(frame.view);
    for (const highlight of frame.highlights) assert.ok(known.has(highlight.id));
  }

  const widest = gridRunner.run(table("edit-distance", "a".repeat(11), "b".repeat(13)));
  assert.equal(widest.outcome, "done");
  assert.equal(widest.frames.length, 11 * 13 + 1);
  assert.ok(widest.frames.length < GRID_MAX_FRAMES);
  assertFrameIntegrity(widest);
});

test("an invalid scenario yields zero frames, diagnostics, and the scenario hash", () => {
  const oversized = table("edit-distance", "a".repeat(12), "b");
  const run = gridRunner.run(oversized);
  assert.equal(run.outcome, "invalid");
  assert.equal(run.frames.length, 0);
  assert.ok(run.diagnostics.length > 0);
  assert.equal(run.hash, scenarioHash(oversized));

  const wrongSubstrate = { ...table("edit-distance", "a", "b"), substrate: "graph" };
  const invalid = gridRunner.run(wrongSubstrate);
  assert.equal(invalid.outcome, "invalid");
  assert.equal(invalid.frames.length, 0);
  assert.ok(invalid.diagnostics.some((item) => item.code === "substrate-mismatch"));
});
