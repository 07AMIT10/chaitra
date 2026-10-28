import test from "node:test";
import assert from "node:assert/strict";

import algorithmsCatalog from "../data/algorithms.json" with { type: "json" };
import drishtiCatalog from "../data/drishti.json" with { type: "json" };
import {
  FIELD_SPECIMENS,
  LIVE_BENCHES,
  blankScenario,
  getLiveBench,
} from "./registry.ts";
import { isScenario } from "./scenario.ts";
import { runScenario, validateScenario } from "./runners/index.ts";
import {
  ARRAY_STRATEGIES,
  GRAPH_STRATEGIES,
  GRID_STRATEGIES,
} from "./types.ts";

const SUBSTRATE_STRATEGIES = {
  graph: GRAPH_STRATEGIES,
  array: ARRAY_STRATEGIES,
  grid: GRID_STRATEGIES,
};

const LIVE_SLUGS = new Set([
  "dijkstra",
  "breadth-first-search",
  "depth-first-search",
  "topological-sort",
  "binary-search",
  "merge-sort",
  "quicksort",
  "edit-distance",
  "longest-common-subsequence",
]);

const EXPECTED = [
  {
    id: "least-label",
    title: "Least Label",
    substrate: "graph",
    strategies: ["dijkstra"],
    articleHref: "/algorithms/programming/dijkstra",
    gameHref: "/algorithms/game/dijkstra",
  },
  {
    id: "arrival-order",
    title: "Arrival Order",
    substrate: "graph",
    strategies: ["bfs", "dfs", "topological"],
    articleHref: "/algorithms/programming/breadth-first-search",
    gameHref: "/algorithms/game/breadth-first-search",
  },
  {
    id: "halving-horizon",
    title: "Halving Horizon",
    substrate: "array",
    strategies: ["binary-search"],
    articleHref: "/algorithms/programming/binary-search",
    gameHref: "/algorithms/game/binary-search",
  },
  {
    id: "order-rack",
    title: "Order Rack",
    substrate: "array",
    strategies: ["merge-sort", "quick-sort"],
    articleHref: "/algorithms/programming/merge-sort",
    gameHref: "/algorithms/game/merge-sort",
  },
  {
    id: "prefix-loom",
    title: "Prefix Loom",
    substrate: "grid",
    strategies: ["edit-distance", "lcs"],
    articleHref: "/algorithms/programming/edit-distance",
    gameHref: "/algorithms/game/edit-distance",
  },
];

test("the shelf exposes five live benches with unique ids", () => {
  assert.equal(LIVE_BENCHES.length, 5);
  assert.equal(new Set(LIVE_BENCHES.map((bench) => bench.id)).size, 5);
  assert.deepEqual(
    LIVE_BENCHES.map((bench) => bench.id),
    EXPECTED.map((bench) => bench.id),
  );
});

test("each live bench declares its display metadata, substrate, and strategies", () => {
  EXPECTED.forEach((expected, index) => {
    const bench = LIVE_BENCHES[index];
    assert.equal(bench.id, expected.id);
    assert.equal(bench.title, expected.title);
    assert.equal(bench.substrate, expected.substrate);
    assert.deepEqual([...bench.strategies], expected.strategies);
    assert.equal(bench.articleHref, expected.articleHref);
    assert.equal(bench.gameHref, expected.gameHref);
    assert.ok(bench.framing.length > 0, `${bench.id} has framing`);
    assert.ok(bench.what.length > 0, `${bench.id} has a what`);
    assert.ok(bench.articleHref.startsWith("/"));
    assert.ok(bench.gameHref.startsWith("/"));
  });
});

test("every live default scenario validates and runs with frames", () => {
  for (const bench of LIVE_BENCHES) {
    const scenario = bench.defaultScenario;
    assert.equal(isScenario(scenario), true, `${bench.id} is a scenario`);
    assert.equal(scenario.schema, 1);
    assert.equal(scenario.id, bench.id);
    assert.equal(scenario.title, bench.title);
    assert.equal(scenario.substrate, bench.substrate);
    assert.ok(bench.strategies.includes(scenario.strategy));
    assert.equal(typeof scenario.params.framing, "string");
    assert.ok(scenario.params.framing.length > 0);

    assert.deepEqual(validateScenario(scenario), [], `${bench.id} validates`);
    const run = runScenario(scenario);
    assert.ok(run.frames.length > 0, `${bench.id} emits frames`);
    assert.equal(run.outcome, "done", `${bench.id} terminates`);
    for (const frame of run.frames) {
      assert.equal(frame.view.kind, bench.substrate);
      assert.match(frame.stateHash, /^[0-9a-f]{8}$/);
    }
  }
});

test("every declared live strategy runs on the bench scenario", () => {
  for (const bench of LIVE_BENCHES) {
    for (const strategy of bench.strategies) {
      const scenario = structuredClone(bench.defaultScenario);
      scenario.strategy = strategy;
      assert.deepEqual(
        validateScenario(scenario),
        [],
        `${bench.id}:${strategy} validates`,
      );
      const run = runScenario(scenario);
      assert.ok(run.frames.length > 0, `${bench.id}:${strategy} emits frames`);
    }
  }
});

test("getLiveBench resolves known ids and rejects unknown ids", () => {
  for (const bench of LIVE_BENCHES) {
    assert.equal(getLiveBench(bench.id), bench);
  }
  assert.equal(getLiveBench("no-such-bench"), undefined);
  assert.equal(getLiveBench(""), undefined);
});

test("field specimens are exactly the 15 non-live algorithms plus 9 studies", () => {
  const algorithms = FIELD_SPECIMENS.filter((item) => item.kind === "algorithm");
  const studies = FIELD_SPECIMENS.filter((item) => item.kind === "study");

  assert.equal(algorithms.length, 15);
  assert.equal(studies.length, 9);
  assert.equal(FIELD_SPECIMENS.length, 24);

  const expectedAlgorithms = algorithmsCatalog.algorithms
    .filter((algorithm) => !LIVE_SLUGS.has(algorithm.slug))
    .map((algorithm) => `algorithm:${algorithm.slug}`)
    .sort();
  const expectedStudies = drishtiCatalog.studies
    .map((study) => `study:${study.slug}`)
    .sort();

  assert.deepEqual(algorithms.map((item) => item.id).sort(), expectedAlgorithms);
  assert.deepEqual(studies.map((item) => item.id).sort(), expectedStudies);
  for (const algorithm of algorithmsCatalog.algorithms) {
    if (LIVE_SLUGS.has(algorithm.slug)) {
      assert.equal(
        FIELD_SPECIMENS.some((item) => item.id === `algorithm:${algorithm.slug}`),
        false,
        `${algorithm.slug} is live`,
      );
    }
  }
});

test("field specimens have unique ids, non-empty copy, and published hrefs", () => {
  assert.equal(new Set(FIELD_SPECIMENS.map((item) => item.id)).size, FIELD_SPECIMENS.length);

  const algorithmBySlug = new Map(
    algorithmsCatalog.algorithms.map((algorithm) => [algorithm.slug, algorithm]),
  );
  const studySlugs = new Set(drishtiCatalog.studies.map((study) => study.slug));

  for (const item of FIELD_SPECIMENS) {
    assert.ok(item.title.length > 0, `${item.id} title`);
    assert.ok(item.summary.length > 0, `${item.id} summary`);
    assert.ok(item.href.startsWith("/"), `${item.id} href starts with /`);
    assert.match(item.id, /^(algorithm|study):[a-z0-9-]+$/);

    if (item.kind === "algorithm") {
      const slug = item.id.slice("algorithm:".length);
      const algorithm = algorithmBySlug.get(slug);
      assert.ok(algorithm, `${slug} exists in algorithms.json`);
      assert.equal(algorithm.hasPage, true);
      assert.equal(item.href, `/algorithms/${algorithm.field}/${slug}`);
    } else {
      const slug = item.id.slice("study:".length);
      assert.equal(studySlugs.has(slug), true, `${slug} exists in drishti.json`);
      assert.equal(item.href, `/drishti/studies/${slug}`);
    }
  }
});

test("blank factories produce valid starter scenarios on every substrate", () => {
  const expected = {
    graph: { id: "blank-graph", strategy: "bfs", nodes: 4, edges: 3 },
    array: { id: "blank-array", strategy: "merge-sort", values: 5 },
    grid: { id: "blank-grid", strategy: "edit-distance" },
  };

  for (const substrate of ["graph", "array", "grid"]) {
    const scenario = blankScenario(substrate);
    assert.equal(scenario.id, expected[substrate].id);
    assert.equal(scenario.substrate, substrate);
    assert.equal(scenario.strategy, expected[substrate].strategy);
    assert.equal(isScenario(scenario), true);
    assert.deepEqual(validateScenario(scenario), []);
    assert.ok(runScenario(scenario).frames.length > 0);

    if (substrate === "graph") {
      assert.equal(scenario.model.nodes.length, expected.graph.nodes);
      assert.equal(scenario.model.edges.length, expected.graph.edges);
      assert.equal(scenario.model.start, "A");
    }
    if (substrate === "array") {
      assert.equal(scenario.model.values.length, expected.array.values);
    }
    if (substrate === "grid") {
      assert.deepEqual(scenario.model, { kind: "table", a: "cat", b: "cut" });
    }
  }
});

test("blank factories honour every compatible strategy", () => {
  for (const substrate of ["graph", "array", "grid"]) {
    for (const strategy of SUBSTRATE_STRATEGIES[substrate]) {
      const scenario = blankScenario(substrate, strategy);
      assert.equal(scenario.strategy, strategy);
      assert.equal(isScenario(scenario), true);
      assert.deepEqual(validateScenario(scenario), [], `${substrate}:${strategy}`);
      assert.ok(runScenario(scenario).frames.length > 0, `${substrate}:${strategy} frames`);
      if (substrate === "array" && strategy === "binary-search") {
        assert.equal(scenario.model.sorted, true);
        assert.equal(typeof scenario.model.target, "number");
      }
    }
  }
});

test("incompatible strategies fail with a clear error", () => {
  const cases = [
    ["graph", "merge-sort"],
    ["graph", "edit-distance"],
    ["array", "bfs"],
    ["array", "lcs"],
    ["grid", "dijkstra"],
    ["grid", "quick-sort"],
  ];
  for (const [substrate, strategy] of cases) {
    assert.throws(
      () => blankScenario(substrate, strategy),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /not compatible/);
        assert.match(error.message, new RegExp(strategy));
        assert.match(error.message, new RegExp(substrate));
        return true;
      },
      `${substrate} rejects ${strategy}`,
    );
  }
});
