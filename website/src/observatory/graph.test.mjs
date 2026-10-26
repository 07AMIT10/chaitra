import test from "node:test";
import assert from "node:assert/strict";

import { scenarioHash } from "./hash.ts";
import { graphRunner } from "./runners/graph.ts";

const node = (id, index) => ({ id, label: id, x: index * 40, y: (index % 2) * 40 });
const nodes = (ids) => ids.map(node);
const edge = (id, from, to, weight = 1) => ({ id, from, to, weight });

function graphScenario({ id, strategy = "bfs", nodeList, edgeList, start = "A", target, directed = true }) {
  return {
    schema: 1,
    id,
    title: id,
    substrate: "graph",
    strategy,
    model: {
      kind: "graph",
      nodes: nodeList,
      edges: edgeList,
      start,
      ...(target === undefined ? {} : { target }),
      directed,
    },
    params: {},
  };
}

const bfsScenario = graphScenario({
  id: "bfs-five",
  strategy: "bfs",
  nodeList: nodes(["A", "B", "C", "D", "E"]),
  edgeList: [
    edge("e1", "A", "B"),
    edge("e2", "A", "C"),
    edge("e3", "B", "D"),
    edge("e4", "C", "D"),
    edge("e5", "D", "E"),
  ],
  directed: false,
});

const dfsScenario = graphScenario({
  id: "dfs-cycle",
  strategy: "dfs",
  nodeList: nodes(["A", "B", "C", "D", "E"]),
  edgeList: [
    edge("e1", "A", "B"),
    edge("e2", "A", "C"),
    edge("e3", "B", "D"),
    edge("e4", "C", "D"),
    edge("e5", "D", "E"),
    edge("e6", "E", "A"),
  ],
});

const topoScenario = graphScenario({
  id: "topo-acyclic",
  strategy: "topological",
  nodeList: nodes(["A", "B", "C", "D", "E"]),
  edgeList: [
    edge("e1", "A", "B"),
    edge("e2", "A", "C"),
    edge("e3", "B", "D"),
    edge("e4", "C", "D"),
    edge("e5", "D", "E"),
  ],
});

const topoCycleScenario = graphScenario({
  id: "topo-cycle",
  strategy: "topological",
  nodeList: nodes(["A", "B", "C", "D"]),
  edgeList: [
    edge("e1", "A", "B"),
    edge("e2", "B", "C"),
    edge("e3", "C", "A"),
    edge("e4", "D", "B"),
  ],
});

const sevenTownsScenario = graphScenario({
  id: "seven-towns",
  strategy: "dijkstra",
  nodeList: nodes(["A", "B", "C", "D", "E", "F", "G"]),
  edgeList: [
    edge("A>C", "A", "C", 1),
    edge("A>F", "A", "F", 6),
    edge("A>B", "A", "B", 9),
    edge("C>D", "C", "D", 1),
    edge("D>E", "D", "E", 1),
    edge("D>B", "D", "B", 2),
    edge("F>E", "F", "E", 1),
    edge("F>B", "F", "B", 4),
    edge("E>G", "E", "G", 4),
    edge("B>G", "B", "G", 1),
  ],
  start: "A",
  target: "G",
});

function eventOrder(result, verb) {
  return result.frames
    .slice(1)
    .map((frame) => frame.events[0]?.text ?? "")
    .map((text) => new RegExp(`^${verb} ([^;.]+)`).exec(text)?.[1]?.trim())
    .filter((id) => id !== undefined);
}

function distancesOf(frame) {
  return Object.fromEntries(
    frame.view.nodes.map((item) => [item.id, item.sub.split(" · ")[0]]),
  );
}

function deepFreeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

test("graphRunner advertises the graph substrate and all four strategies", () => {
  assert.equal(graphRunner.substrate, "graph");
  assert.deepEqual([...graphRunner.strategies], ["dijkstra", "bfs", "dfs", "topological"]);
});

test("BFS visits in queue order, once, with discovery edges recorded", () => {
  const result = graphRunner.run(bfsScenario);

  assert.equal(result.outcome, "done");
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(eventOrder(result, "Visit"), ["A", "B", "C", "D", "E"]);

  const final = result.frames.at(-1);
  const states = Object.fromEntries(final.view.edges.map((item) => [item.id, item.state]));
  assert.equal(states.e1, "done");
  assert.equal(states.e2, "done");
  assert.equal(states.e3, "done");
  assert.equal(states.e4, "idle");
  assert.equal(states.e5, "done");

  const first = result.frames[0];
  assert.equal(first.index, 0);
  assert.equal(first.view.nodes.find((item) => item.id === "A").state, "active");
  assert.match(first.events[0].text, /^Queue A;/);
});

test("DFS uses a deterministic explicit stack and survives a back edge", () => {
  const result = graphRunner.run(dfsScenario);

  assert.equal(result.outcome, "done");
  assert.deepEqual(eventOrder(result, "Visit"), ["A", "B", "D", "E", "C"]);

  const final = result.frames.at(-1);
  const states = Object.fromEntries(final.view.edges.map((item) => [item.id, item.state]));
  assert.equal(states.e6, "bad");
  assert.equal(states.e4, "bad");
  assert.equal(states.e1, "done");
});

test("topological sort emits Kahn order and reports acyclic completion", () => {
  const result = graphRunner.run(topoScenario);

  assert.equal(result.outcome, "done");
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(eventOrder(result, "Emit"), ["A", "B", "C", "D", "E"]);

  const final = result.frames.at(-1);
  assert.deepEqual(
    final.view.nodes
      .filter((item) => item.state === "done" || item.state === "active")
      .map((item) => item.id),
    ["A", "B", "C", "D", "E"],
  );
  assert.ok(final.view.nodes.every((item) => item.sub.includes("emitted")));
});

test("topological sort reports a cycle with a diagnostic and keeps its frames", () => {
  assert.deepEqual(graphRunner.validate(topoCycleScenario), []);

  const result = graphRunner.run(topoCycleScenario);

  assert.equal(result.outcome, "cycle");
  assert.ok(result.diagnostics.some((item) => item.code === "graph/cycle"));
  assert.ok(result.frames.length > 0);
  assert.deepEqual(eventOrder(result, "Emit"), ["D"]);

  const final = result.frames.at(-1);
  assert.match(final.events[0].text, /^Cycle:/);
  const warned = final.highlights.filter((item) => item.role === "warn").map((item) => item.id);
  for (const id of ["A", "B", "C"]) assert.ok(warned.includes(id));
});

test("Dijkstra settles the seven-town distances and does not stop at the target", () => {
  const result = graphRunner.run(sevenTownsScenario);

  assert.equal(result.outcome, "done");
  assert.deepEqual(result.diagnostics, []);

  const final = result.frames.at(-1);
  assert.deepEqual(distancesOf(final), {
    A: "0",
    B: "4",
    C: "1",
    D: "2",
    E: "3",
    F: "6",
    G: "5",
  });
  assert.ok(
    final.view.nodes.every((item) => item.state === "done" || item.state === "active"),
  );
  assert.ok(final.view.nodes.every((item) => item.sub.includes("settled")));

  const settles = result.frames
    .slice(1)
    .map((frame) => /^Settle ([^ ]+) at /.exec(frame.events[0]?.text ?? "")?.[1])
    .filter((id) => id !== undefined);
  assert.ok(settles.indexOf("G") >= 0);
  assert.ok(settles.indexOf("F") > settles.indexOf("G"), `settle order was ${settles.join(" ")}`);

  const target = result.frames[0].view.nodes.find((item) => item.id === "G");
  assert.equal(target.state, "target");
});

test("Dijkstra rejects a negative edge before producing any frame", () => {
  const scenario = {
    ...sevenTownsScenario,
    id: "seven-towns-negative",
    model: {
      ...sevenTownsScenario.model,
      edges: sevenTownsScenario.model.edges.map((item) =>
        item.id === "C>D" ? { ...item, weight: -1 } : item,
      ),
    },
  };

  const diagnostics = graphRunner.validate(scenario);
  assert.ok(diagnostics.some((item) => item.code === "graph/negative-weight"));

  const result = graphRunner.run(scenario);
  assert.equal(result.outcome, "invalid");
  assert.deepEqual(result.frames, []);
  assert.equal(result.hash, scenarioHash(scenario));
});

test("validation catches shape, id, endpoint, weight, and directedness faults", () => {
  const badShape = graphScenario({
    id: "bad-shape",
    nodeList: [node("A", 0), node("A", 1), node("B", 2)],
    edgeList: [edge("e1", "A", "missing", Number.POSITIVE_INFINITY)],
  });
  const codes = graphRunner.validate(badShape).map((item) => item.code);
  assert.ok(codes.includes("graph/node-id"));
  assert.ok(codes.includes("graph/edge-endpoint"));
  assert.ok(codes.includes("graph/weight"));

  const undirectedTopo = { ...topoScenario, id: "topo-undirected", model: { ...topoScenario.model, directed: false } };
  assert.ok(
    graphRunner.validate(undirectedTopo).some((item) => item.code === "graph/topological"),
  );

  assert.ok(graphRunner.validate(null).length > 0);
});

test("an invalid scenario yields zero frames and a stable scenario hash", () => {
  const result = graphRunner.run(null);

  assert.equal(result.outcome, "invalid");
  assert.deepEqual(result.frames, []);
  assert.ok(result.diagnostics.length > 0);
  assert.equal(result.hash, scenarioHash(null));
});

test("runs are deterministic and never mutate the scenario", () => {
  const frozen = deepFreeze(structuredClone(sevenTownsScenario));
  const first = graphRunner.run(frozen);
  const second = graphRunner.run(frozen);

  assert.deepEqual(first, second);
  assert.equal(first.hash, scenarioHash(frozen));
  assert.deepEqual(frozen, sevenTownsScenario);
});

test("every frame keeps stable ids and every highlight resolves in that view", () => {
  const scenarios = [
    bfsScenario,
    dfsScenario,
    topoScenario,
    topoCycleScenario,
    sevenTownsScenario,
  ];

  for (const scenario of scenarios) {
    const result = graphRunner.run(scenario);
    const nodeIds = scenario.model.nodes.map((item) => item.id);
    const edgeIds = scenario.model.edges.map((item) => item.id);

    assert.ok(result.frames.length <= 300);
    result.frames.forEach((frame, index) => {
      assert.equal(frame.index, index);
      assert.equal(frame.events.length, 1);
      assert.match(frame.stateHash, /^[0-9a-f]{8}$/);
      assert.equal(frame.view.kind, "graph");
      assert.deepEqual(frame.view.nodes.map((item) => item.id), nodeIds);
      assert.deepEqual(frame.view.edges.map((item) => item.id), edgeIds);

      const viewIds = new Set([
        ...frame.view.nodes.map((item) => item.id),
        ...frame.view.edges.map((item) => item.id),
      ]);
      for (const highlight of frame.highlights) {
        assert.ok(viewIds.has(highlight.id), `${highlight.id} does not resolve in frame ${index}`);
      }
    });

    if (result.frames.length > 0) {
      assert.notEqual(result.frames[0].stateHash, result.frames.at(-1).stateHash);
    }
  }
});
