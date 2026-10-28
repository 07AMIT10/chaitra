import test from "node:test";
import assert from "node:assert/strict";

import { SCAMPER_CARDS, proposeMutation } from "./mutations.ts";
import { runScenario, validateScenario } from "./runners/index.ts";
import { SCAMPER_IDS } from "./types.ts";

/* ------------------------------------------------------- scenario builders */

const graphScenario = () => ({
  schema: 1,
  id: "mut-map-1",
  title: "Crossroads",
  substrate: "graph",
  strategy: "dijkstra",
  params: {},
  model: {
    kind: "graph",
    nodes: [
      { id: "s", label: "Source", x: 0, y: 0 },
      { id: "m", label: "Market", x: 40, y: 10 },
      { id: "t", label: "Temple", x: 80, y: 0 },
    ],
    edges: [
      { id: "e1", from: "s", to: "m", weight: 2 },
      { id: "e2", from: "m", to: "t", weight: 3 },
      { id: "e3", from: "s", to: "t", weight: 9 },
    ],
    start: "s",
    target: "t",
    directed: true,
  },
});

const undirectedGraph = () => {
  const scenario = graphScenario();
  scenario.id = "mut-map-2";
  scenario.strategy = "bfs";
  scenario.model.directed = false;
  return scenario;
};

const loneGraph = () => ({
  schema: 1,
  id: "mut-map-0",
  title: "Single Stop",
  substrate: "graph",
  strategy: "bfs",
  params: {},
  model: {
    kind: "graph",
    nodes: [{ id: "s", label: "Source", x: 0, y: 0 }],
    edges: [],
    start: "s",
    directed: true,
  },
});

const unsortedArray = () => ({
  schema: 1,
  id: "mut-shelf-1",
  title: "Shelf",
  substrate: "array",
  strategy: "merge-sort",
  params: {},
  model: { kind: "array", values: [3, 1, 2], sorted: false },
});

const sortedArray = () => ({
  schema: 1,
  id: "mut-shelf-2",
  title: "Sorted Shelf",
  substrate: "array",
  strategy: "binary-search",
  params: {},
  model: { kind: "array", values: [1, 2, 3, 4], target: 3, sorted: true },
});

const loneArray = () => ({
  schema: 1,
  id: "mut-shelf-0",
  title: "Single Value",
  substrate: "array",
  strategy: "merge-sort",
  params: {},
  model: { kind: "array", values: [5], sorted: true },
});

const gridScenario = () => ({
  schema: 1,
  id: "mut-loom-1",
  title: "Word Loom",
  substrate: "grid",
  strategy: "lcs",
  params: {},
  model: { kind: "table", a: "abc", b: "cbd" },
});

const emptyPairGrid = () => {
  const scenario = gridScenario();
  scenario.id = "mut-loom-0";
  scenario.model.a = "";
  scenario.model.b = "";
  return scenario;
};

const BUILDERS = {
  graph: graphScenario,
  array: unsortedArray,
  grid: gridScenario,
};

/* ----------------------------------------------------------------- helpers */

/** Propose against a freshly built scenario and assert success. */
const propose = (builder, card, payload) => {
  const result = proposeMutation(builder(), card, payload);
  assert.equal(
    result.ok,
    true,
    `${card} should propose: ${result.ok ? "" : JSON.stringify(result.diagnostics)}`,
  );
  return result;
};

/** Propose against an existing scenario and assert success. */
const proposeOn = (scenario, card, payload) => {
  const result = proposeMutation(scenario, card, payload);
  assert.equal(
    result.ok,
    true,
    `${card} should propose: ${result.ok ? "" : JSON.stringify(result.diagnostics)}`,
  );
  return result;
};

/* ------------------------------------------------------------------- cards */

test("SCAMPER_CARDS mirror the contract ids in order", () => {
  assert.deepEqual(
    SCAMPER_CARDS.map((card) => card.id),
    [...SCAMPER_IDS],
  );
  for (const card of SCAMPER_CARDS) {
    assert.ok(card.title.length > 0);
    assert.ok(card.prompt.length > 0);
    assert.ok(card.glyph.length > 0);
  }
});

test("every card proposes a valid, runnable candidate on every substrate", (t) => {
  for (const [substrate, build] of Object.entries(BUILDERS)) {
    for (const card of SCAMPER_CARDS) {
      t.test(`${card.id} on ${substrate}`, () => {
        const result = propose(build, card.id);
        assert.equal(result.mutation.card, card.id);
        assert.deepEqual(
          Object.keys(result.mutation).sort(),
          ["card", "id", "label", "op", "payload"],
        );
        assert.equal(result.summary.length > 0, true);
        assert.equal(result.summary, result.mutation.label);
        assert.equal(result.diff.summary.length > 0, true);
        assert.ok(result.diff.changes.length >= 1, "the diff must list changes");
        assert.match(result.mutation.id, new RegExp(`^${card.id}:[0-9a-f]{8}$`));
        assert.deepEqual(validateScenario(result.scenario), []);
        assert.equal(runScenario(result.scenario).outcome, "done");
      });
    }
  }
});

test("mutation ids are stable for identical proposals and distinct across cards", () => {
  const first = propose(graphScenario, "modify");
  const second = propose(graphScenario, "modify");
  assert.equal(first.mutation.id, second.mutation.id);
  assert.match(first.mutation.id, /^modify:[0-9a-f]{8}$/);

  const combine = propose(graphScenario, "combine");
  assert.notEqual(combine.mutation.id, first.mutation.id);
});

test("payload defaults are resolved into the proposal", () => {
  const modify = propose(unsortedArray, "modify");
  assert.deepEqual(modify.mutation.payload, { factor: 2 });
  assert.deepEqual(modify.scenario.model.values, [6, 2, 4]);
  assert.equal(modify.scenario.model.target, undefined);

  const substitute = propose(sortedArray, "substitute");
  assert.equal(substitute.mutation.payload.strategy, "merge-sort");

  assert.equal(propose(graphScenario, "put-to-another-use").mutation.payload.framing, "traffic");
  assert.equal(propose(unsortedArray, "put-to-another-use").mutation.payload.framing, "shelf");
  assert.equal(propose(gridScenario, "put-to-another-use").mutation.payload.framing, "texts");

  const combine = propose(graphScenario, "combine");
  assert.deepEqual(combine.mutation.payload, { from: "s", to: "m" });
  assert.equal(combine.mutation.op, "merge-nodes");
});

test("proposals never mutate the caller's scenario", () => {
  for (const [substrate, build] of Object.entries(BUILDERS)) {
    const scenario = build();
    const snapshot = structuredClone(scenario);

    const success = proposeMutation(scenario, "adapt");
    assert.equal(success.ok, true, `${substrate} adapt should succeed`);
    assert.deepEqual(scenario, snapshot, `${substrate}: success must leave input untouched`);

    const rejection = proposeMutation(scenario, "substitute", { strategy: "not-a-strategy" });
    assert.equal(rejection.ok, false);
    assert.ok(rejection.diagnostics.length >= 1);
    assert.deepEqual(scenario, snapshot, `${substrate}: rejection must leave input untouched`);
  }
});

test("rejections return diagnostics only — no candidate, no scenario", () => {
  const result = proposeMutation(graphScenario(), "combine", { from: "s", to: "s" });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.length >= 1);
  assert.equal(result.diagnostics[0].code, "mutation/combine");
  assert.equal("scenario" in result, false);
  assert.equal("mutation" in result, false);
});

/* --------------------------------------------------------------- rejections */

test("binary-search reject: combine and reverse break ascending order", () => {
  for (const card of ["combine", "reverse"]) {
    const result = proposeMutation(sortedArray(), card);
    assert.equal(result.ok, false, `${card} on a sorted binary-search array must be rejected`);
    assert.ok(result.diagnostics.some((d) => d.code === "values-not-ascending"));
  }
});

test("binary-search reject: explicit substitute onto an unsorted array without a target", () => {
  const result = proposeMutation(unsortedArray(), "substitute", { strategy: "binary-search" });
  assert.equal(result.ok, false);
  assert.ok(
    result.diagnostics.some((d) => d.code === "target-required" || d.code === "values-not-ascending"),
  );
});

test("eliminate rejects emptying the array and the graph", () => {
  const arrayResult = proposeMutation(loneArray(), "eliminate");
  assert.equal(arrayResult.ok, false);
  assert.equal(arrayResult.diagnostics[0].code, "mutation/eliminate");
  assert.equal(arrayResult.diagnostics[0].path, "model.values");

  const graphResult = proposeMutation(loneGraph(), "eliminate");
  assert.equal(graphResult.ok, false);
  assert.equal(graphResult.diagnostics[0].code, "mutation/eliminate");
});

test("grid modify and eliminate reject empty strings", () => {
  const halve = proposeMutation(emptyPairGrid(), "modify");
  assert.equal(halve.ok, false);
  assert.equal(halve.diagnostics[0].code, "mutation/modify");

  const trim = proposeMutation(emptyPairGrid(), "eliminate");
  assert.equal(trim.ok, false);
  assert.equal(trim.diagnostics[0].code, "mutation/eliminate");
});

test("grid combine rejects an empty column string", () => {
  const result = proposeMutation(emptyPairGrid(), "combine");
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "mutation/combine");
});

test("modify rejects non-positive and non-finite factors", () => {
  for (const factor of [0, -2, Number.POSITIVE_INFINITY, "two"]) {
    const result = proposeMutation(unsortedArray(), "modify", { factor });
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics[0].code, "mutation/factor");
  }
  const graph = proposeMutation(graphScenario(), "modify", { factor: -1 });
  assert.equal(graph.ok, false);
  assert.equal(graph.diagnostics[0].code, "mutation/factor");
});

test("put-to-another-use rejects framings outside the allowed list", () => {
  const result = proposeMutation(gridScenario(), "put-to-another-use", { framing: "poetry" });
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "mutation/framing");
});

test("graph combine rejects unknown or identical nodes", () => {
  const unknown = proposeMutation(graphScenario(), "combine", { from: "zz" });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.diagnostics[0].code, "mutation/combine");

  const identical = proposeMutation(graphScenario(), "combine", { from: "m", to: "m" });
  assert.equal(identical.ok, false);
  assert.equal(identical.diagnostics[0].code, "mutation/combine");
});

test("graph eliminate rejects unknown entities", () => {
  const result = proposeMutation(graphScenario(), "eliminate", { entity: "nowhere" });
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "mutation/eliminate");
});

/* ------------------------------------------------------------------- graph */

test("graph combine merges nodes and updates references", () => {
  const result = propose(graphScenario, "combine");
  const model = result.scenario.model;
  assert.deepEqual(model.nodes.map((node) => node.id), ["s", "t"]);
  assert.deepEqual(model.edges, [{ id: "e2", from: "s", to: "t", weight: 3 }]);
  assert.equal(model.start, "s");
  assert.equal(model.target, "t");

  const headless = proposeOn(graphScenario(), "combine", { from: "s", to: "t" });
  assert.deepEqual(headless.scenario.model.nodes.map((node) => node.id), ["s", "m"]);
  assert.deepEqual(headless.scenario.model.edges, [
    { id: "e1", from: "s", to: "m", weight: 2 },
    { id: "e2", from: "m", to: "s", weight: 3 },
  ]);
  assert.equal(headless.scenario.model.start, "s");
  assert.equal(headless.scenario.model.target, "s");
});

test("graph combine folds the target reference when the target is absorbed", () => {
  const absorbed = proposeOn(graphScenario(), "combine", { from: "m", to: "t" });
  const model = absorbed.scenario.model;
  assert.deepEqual(model.nodes.map((node) => node.id), ["s", "m"]);
  assert.deepEqual(model.edges, [{ id: "e1", from: "s", to: "m", weight: 2 }]);
  assert.equal(model.start, "s");
  assert.equal(model.target, "m");

  const fromStart = proposeOn(undirectedGraph(), "combine", { from: "s", to: "m" });
  assert.deepEqual(fromStart.scenario.model.nodes.map((node) => node.id), ["s", "t"]);
  assert.equal(fromStart.scenario.model.start, "s");
});

test("graph adapt adds a hub node with a unique id and weight-1 links", () => {
  const result = propose(graphScenario, "adapt");
  const model = result.scenario.model;
  assert.equal(model.nodes.length, 4);
  const hub = model.nodes[3];
  assert.equal(hub.id, "H");
  const links = model.edges.filter((edge) => edge.from === "H" || edge.to === "H");
  assert.equal(links.length, 2);
  assert.deepEqual(links.map((edge) => edge.weight), [1, 1]);
  const start = model.nodes[0];
  const target = model.nodes.find((node) => node.id === model.target);
  assert.equal(Math.abs(hub.x - (start.x + target.x) / 2) <= 60, true);

  const again = proposeOn(result.scenario, "adapt", {});
  assert.equal(again.scenario.model.nodes[4].id, "H2");
  assert.deepEqual(validateScenario(again.scenario), []);
});

test("graph adapt rejects at the 30-node cap", () => {
  const scenario = graphScenario();
  for (let index = 0; index < 27; index += 1) {
    scenario.model.nodes.push({
      id: `n${index}`,
      label: `Extra ${index}`,
      x: index,
      y: index,
    });
  }
  const result = proposeMutation(scenario, "adapt");
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "mutation/cap");
});

test("graph eliminate removes the last non-start node and clears the target", () => {
  const result = propose(graphScenario, "eliminate");
  const model = result.scenario.model;
  assert.deepEqual(model.nodes.map((node) => node.id), ["s", "m"]);
  assert.deepEqual(model.edges, [{ id: "e1", from: "s", to: "m", weight: 2 }]);
  assert.equal(model.start, "s");
  assert.equal("target" in model, false);
  assert.deepEqual(result.mutation.payload, { entity: "t" });

  const edgeOnly = proposeOn(graphScenario(), "eliminate", { entity: "e3" });
  const trimmed = edgeOnly.scenario.model;
  assert.deepEqual(trimmed.nodes.map((node) => node.id), ["s", "m", "t"]);
  assert.deepEqual(
    trimmed.edges.map((edge) => edge.id),
    ["e1", "e2"],
  );
});

test("graph reverse flips edges and swaps start/target", () => {
  const result = propose(graphScenario, "reverse");
  const model = result.scenario.model;
  assert.deepEqual(
    model.edges.map((edge) => [edge.from, edge.to]),
    [
      ["m", "s"],
      ["t", "m"],
      ["t", "s"],
    ],
  );
  assert.equal(model.start, "t");
  assert.equal(model.target, "s");

  const undirected = propose(undirectedGraph, "reverse");
  assert.deepEqual(undirected.scenario.model.edges, graphScenario().model.edges);
  assert.equal(undirected.scenario.model.start, "t");
  assert.equal(undirected.scenario.model.target, "s");
});

test("graph substitute honours an explicit compatible strategy", () => {
  const result = proposeOn(graphScenario(), "substitute", { strategy: "topological" });
  assert.equal(result.scenario.strategy, "topological");
  assert.deepEqual(result.mutation.payload, { strategy: "topological" });
  assert.deepEqual(result.diff.changes, [
    { path: "strategy", before: '"dijkstra"', after: '"topological"' },
  ]);

  const undirectedTopological = proposeMutation(undirectedGraph(), "substitute", {
    strategy: "topological",
  });
  assert.equal(undirectedTopological.ok, false);
  assert.ok(undirectedTopological.diagnostics.some((d) => d.code === "graph/topological"));
});

test("put-to-another-use changes the question, not the data or the strategy", () => {
  for (const [substrate, build] of Object.entries(BUILDERS)) {
    const scenario = build();
    const result = proposeOn(scenario, "put-to-another-use", {});
    assert.equal(result.scenario.strategy, scenario.strategy);
    assert.deepEqual(result.scenario.model, scenario.model);
    assert.ok(result.diff.summary.includes("question"));
    assert.deepEqual(result.diff.changes, [
      {
        path: "params.framing",
        before: "(none)",
        after: JSON.stringify(result.mutation.payload.framing),
      },
    ]);
  }
});

/* ------------------------------------------------------------------- array */

test("array adapt appends the sentinel and preserves a sorted order", () => {
  const result = propose(sortedArray, "adapt");
  assert.deepEqual(result.scenario.model.values, [1, 2, 3, 4, 5]);
  assert.equal(result.scenario.model.sorted, true);
  assert.deepEqual(result.mutation.payload, {});
  assert.deepEqual(validateScenario(result.scenario), []);
  assert.equal(runScenario(result.scenario).outcome, "done");
});

test("array adapt rejects at the 32-value cap", () => {
  const scenario = sortedArray();
  scenario.model.values = Array.from({ length: 32 }, (_, index) => index + 1);
  const result = proposeMutation(scenario, "adapt");
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "mutation/cap");
});

test("array combine appends a reversed copy under the cap", () => {
  const result = propose(unsortedArray, "combine");
  assert.deepEqual(result.scenario.model.values, [3, 1, 2, 2, 1, 3]);
  assert.equal(result.scenario.model.sorted, false);
  assert.deepEqual(result.diff.changes, [
    { path: "model.values.length", before: "3", after: "6" },
    { path: "model.values[3]", before: "(none)", after: "2" },
    { path: "model.values[4]", before: "(none)", after: "1" },
    { path: "model.values[5]", before: "(none)", after: "3" },
  ]);
});

test("array combine rejects past the 32-value cap", () => {
  const scenario = unsortedArray();
  scenario.model.values = Array.from({ length: 17 }, () => 1);
  const result = proposeMutation(scenario, "combine");
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "mutation/cap");
});

test("array eliminate pops the last value", () => {
  const result = propose(unsortedArray, "eliminate");
  assert.deepEqual(result.scenario.model.values, [3, 1]);
  assert.deepEqual(result.mutation.payload, {});
  assert.equal(result.diff.changes.length >= 1, true);
});

/* -------------------------------------------------------------------- grid */

test("grid combine fuses the first character of b onto a and still runs lcs", () => {
  const result = propose(gridScenario, "combine");
  assert.equal(result.scenario.model.a, "cabc");
  assert.equal(result.scenario.model.b, "cbd");
  assert.deepEqual(validateScenario(result.scenario), []);
  assert.equal(runScenario(result.scenario).outcome, "done");
});

test("grid combine rejects when growth would breach the row cap", () => {
  const scenario = gridScenario();
  scenario.model.a = "abcdefghijk"; // 11 characters — one short of the cap.
  const result = proposeMutation(scenario, "combine");
  assert.equal(result.ok, false);
  // isScenario gates the 11-character cap before the runner's table-rows check.
  assert.ok(result.diagnostics.some((d) => d.code === "scenario/invalid" || d.path === "model.a"));
});

test("grid modify halves both strings with a floor of one", () => {
  const result = propose(gridScenario, "modify");
  assert.deepEqual(result.scenario.model, { kind: "table", a: "a", b: "c" });

  const even = gridScenario();
  even.model.a = "abcd";
  even.model.b = "ef";
  const halved = proposeOn(even, "modify", {});
  assert.deepEqual(halved.scenario.model, { kind: "table", a: "ab", b: "e" });
});

test("grid eliminate trims the last character of each non-empty string", () => {
  const result = propose(gridScenario, "eliminate");
  assert.deepEqual(result.scenario.model, { kind: "table", a: "ab", b: "cb" });

  const oneSided = gridScenario();
  oneSided.model.b = "";
  const trimmed = proposeOn(oneSided, "eliminate", {});
  assert.deepEqual(trimmed.scenario.model, { kind: "table", a: "ab", b: "" });
});

test("grid reverse swaps the two strings", () => {
  const result = propose(gridScenario, "reverse");
  assert.deepEqual(result.scenario.model, { kind: "table", a: "cbd", b: "abc" });
  assert.equal(result.diff.changes[0].path, "model.a");
  assert.equal(result.diff.summary.length > 0, true);
});

test("grid adapt prepends x to both strings", () => {
  const result = propose(gridScenario, "adapt");
  assert.deepEqual(result.scenario.model, { kind: "table", a: "xabc", b: "xcbd" });
});

test("grid substitute cycles to the other recurrence by default", () => {
  const result = propose(gridScenario, "substitute");
  assert.equal(result.scenario.strategy, "edit-distance");
  assert.deepEqual(result.mutation.payload, { strategy: "edit-distance" });
  assert.deepEqual(result.diff.changes, [
    { path: "strategy", before: '"lcs"', after: '"edit-distance"' },
  ]);
});


