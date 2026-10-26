import test from "node:test";
import assert from "node:assert/strict";

import {
  cloneScenario,
  gridCellId,
  isBranch,
  isLensId,
  isMutation,
  isReaderBench,
  isScamperId,
  isScenario,
  isStrategy,
  scenarioBytes,
  viewIds,
} from "./scenario.ts";

const graph = {
  schema: 1,
  id: "least-label",
  title: "Least Label",
  substrate: "graph",
  strategy: "dijkstra",
  model: {
    kind: "graph",
    nodes: [
      { id: "A", label: "A", x: 10, y: 10 },
      { id: "B", label: "B", x: 20, y: 20 },
    ],
    edges: [{ id: "e1", from: "A", to: "B", weight: 4 }],
    start: "A",
    target: "B",
    directed: true,
  },
  params: { framing: "traffic" },
};

const array = {
  schema: 1,
  id: "halving-horizon",
  title: "Halving Horizon",
  substrate: "array",
  strategy: "binary-search",
  model: { kind: "array", values: [1, 3, 5, 7], target: 5, sorted: true },
  params: {},
};

const table = {
  schema: 1,
  id: "prefix-loom",
  title: "Prefix Loom",
  substrate: "grid",
  strategy: "edit-distance",
  model: { kind: "table", a: "kitten", b: "sitting" },
  params: {},
};

const branch = {
  version: 1,
  id: "branch-1",
  title: "A branch",
  scenario: graph,
  mutations: [],
  lens: "what-exists",
  frameIndex: 0,
  note: "I looked.",
  createdAt: 1,
  updatedAt: 2,
};

const readerBench = {
  version: 1,
  id: "reader-1",
  title: "My bench",
  framing: "A small network",
  substrate: "graph",
  strategy: "bfs",
  scenario: { ...graph, strategy: "bfs" },
  createdAt: 1,
};

test("scenario guards accept the three substrate shapes", () => {
  assert.equal(isScenario(graph), true);
  assert.equal(isScenario(array), true);
  assert.equal(isScenario(table), true);
  assert.equal(isScenario({ ...graph, substrate: "array" }), false);
  assert.equal(isScenario({ ...graph, strategy: "not-a-strategy" }), false);
  assert.equal(isScenario({ ...graph, model: { ...graph.model, start: "Z" } }), false);
  assert.equal(isScenario({ ...array, model: { ...array.model, values: [] } }), false);
  assert.equal(isScenario({ ...table, model: { kind: "table", a: 1, b: "x" } }), false);
});

test("strategy, lens, scamper, branch, and reader-bench guards are strict", () => {
  for (const value of ["dijkstra", "bfs", "binary-search", "quick-sort", "edit-distance", "lcs"]) {
    assert.equal(isStrategy(value), true);
  }
  assert.equal(isStrategy("bellman-ford"), false);
  assert.equal(isLensId("what-exists"), true);
  assert.equal(isLensId("what-learns"), true);
  assert.equal(isLensId("what-else"), false);
  assert.equal(isScamperId("reverse"), true);
  assert.equal(isScamperId("campers"), false);
  assert.equal(isBranch(branch), true);
  assert.equal(isBranch({ ...branch, version: 2 }), false);
  assert.equal(isBranch({ ...branch, scene: graph }), false);
  assert.equal(isReaderBench(readerBench), true);
  assert.equal(isReaderBench({ ...readerBench, note: "no" }), false);
});

test("scenario and mutation guards reject non-finite numbers", () => {
  // `1e999` in JSON parses to Infinity.
  const infiniteFromJson = JSON.parse('{"framing": 1e999}');
  const negativeInfiniteFromJson = JSON.parse('{"framing": -1e999}');
  assert.equal(isScenario({ ...graph, params: { framing: Infinity } }), false);
  assert.equal(isScenario({ ...graph, params: { framing: -Infinity } }), false);
  assert.equal(isScenario({ ...graph, params: { framing: NaN } }), false);
  assert.equal(isScenario({ ...graph, params: infiniteFromJson }), false);
  assert.equal(isScenario({ ...graph, params: negativeInfiniteFromJson }), false);
  assert.equal(isScenario({ ...array, params: { target: Infinity } }), false);
  assert.equal(isScenario({ ...graph, params: { framing: 1, depth: 2 } }), true);

  const mutation = {
    id: "m1",
    card: "modify",
    op: "set-weight",
    label: "Heavier",
    payload: { weight: 2 },
  };
  assert.equal(isMutation(mutation), true);
  assert.equal(isMutation({ ...mutation, payload: { weight: Infinity } }), false);
  assert.equal(isMutation({ ...mutation, payload: { weight: -Infinity } }), false);
  assert.equal(isMutation({ ...mutation, payload: JSON.parse('{"weight": 1e999}') }), false);
  assert.equal(isBranch({ ...branch, mutations: [{ ...mutation, payload: { weight: Infinity } }] }), false);
});

test("cloneScenario is a deep clone and scenarioBytes is positive", () => {
  const copy = cloneScenario(graph);
  assert.deepEqual(copy, graph);
  assert.notEqual(copy, graph);
  assert.notEqual(copy.model.nodes, graph.model.nodes);
  assert.ok(scenarioBytes(graph) > 10);
  assert.equal(scenarioBytes(graph), scenarioBytes({ ...graph }));
});

test("viewIds resolves graph, array, and grid entity ids", () => {
  assert.deepEqual([...viewIds({ kind: "graph", nodes: graph.model.nodes, edges: graph.model.edges })], ["A", "B", "e1"]);
  assert.deepEqual(
    [...viewIds({ kind: "array", items: [{ id: "item:0", value: 1 }, { id: "item:1", value: 3 }] })],
    ["item:0", "item:1"],
  );
  assert.deepEqual(
    [...viewIds({ kind: "grid", rows: 2, cols: 2, cells: [{ r: 0, c: 0, value: "" }, { r: 1, c: 1, value: 3 }] })],
    ["0:0", "1:1"],
  );
  assert.equal(gridCellId(3, 4), "3:4");
});
