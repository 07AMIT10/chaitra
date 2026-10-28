import test from "node:test";
import assert from "node:assert/strict";

import { RUNNERS, runScenario, runnerFor, validateScenario } from "./runners/index.ts";
import { scenarioHash } from "./hash.ts";

const graph = {
  schema: 1,
  id: "dispatch-graph",
  title: "Dispatch graph",
  substrate: "graph",
  strategy: "bfs",
  model: {
    kind: "graph",
    nodes: [
      { id: "A", label: "A", x: 0, y: 0 },
      { id: "B", label: "B", x: 1, y: 1 },
    ],
    edges: [{ id: "e1", from: "A", to: "B", weight: 1 }],
    start: "A",
    directed: true,
  },
  params: {},
};

const array = {
  schema: 1,
  id: "dispatch-array",
  title: "Dispatch array",
  substrate: "array",
  strategy: "binary-search",
  model: { kind: "array", values: [1, 2, 3], target: 2, sorted: true },
  params: {},
};

const grid = {
  schema: 1,
  id: "dispatch-grid",
  title: "Dispatch grid",
  substrate: "grid",
  strategy: "edit-distance",
  model: { kind: "table", a: "a", b: "b" },
  params: {},
};

test("runnerFor dispatches each substrate", () => {
  assert.equal(runnerFor(graph).substrate, "graph");
  assert.equal(runnerFor(array).substrate, "array");
  assert.equal(runnerFor(grid).substrate, "grid");
  assert.equal(RUNNERS.length, 3);
});

test("validateScenario delegates to the runner and rejects bad shapes", () => {
  assert.deepEqual(validateScenario(graph), []);
  assert.equal(validateScenario({ ...array, model: { ...array.model, values: [] } }).length > 0, true);
  assert.equal(validateScenario({ nope: true }).length > 0, true);
});

test("runScenario returns a trace for each valid substrate", () => {
  for (const scenario of [graph, array, grid]) {
    const result = runScenario(scenario);
    assert.ok(result.frames.length > 0);
    assert.equal(result.hash, scenarioHash(scenario));
    assert.equal(result.diagnostics.length, 0);
  }
});

test("runScenario returns a stable invalid result for a bad shape", () => {
  const bad = { ...graph, model: { ...graph.model, start: "missing" } };
  const result = runScenario(bad);
  assert.equal(result.outcome, "invalid");
  assert.equal(result.frames.length, 0);
  assert.ok(result.hash.match(/^[0-9a-f]{8}$/));
});
