import test from "node:test";
import assert from "node:assert/strict";

import { LENS_IDS, projectLens } from "./lenses.ts";
import { runScenario } from "./runners/index.ts";
import { viewIds } from "./scenario.ts";
import { LENS_BY_SLUG } from "../lib/drishti-lenses.ts";

const NOTE_PROMPTS = {
  "what-exists": "What did you treat as a thing before you looked?",
  "what-changes": "What did you assume was stationary?",
  "what-flows": "What was waiting, and what set the rate?",
  "what-learns": "What updated, and where is it stored?",
  "what-persists": "What survived a change you expected to break it?",
  "what-emerges": "What appeared that no single part contains?",
  "what-will-happen": "What do you expect next, and what evidence would move it?",
};

const ABSENCE = "This specimen visits or reorders state but does not adapt a model or optimize a parameter.";

const graphModel = {
  kind: "graph",
  nodes: [
    { id: "A", label: "A", x: 0, y: 0 },
    { id: "B", label: "B", x: 1, y: 1 },
    { id: "C", label: "C", x: 2, y: 0 },
    { id: "D", label: "D", x: 3, y: 1 },
  ],
  edges: [
    { id: "e-ab", from: "A", to: "B", weight: 1 },
    { id: "e-bc", from: "B", to: "C", weight: 2 },
    { id: "e-ca", from: "C", to: "A", weight: 1 },
    { id: "e-cd", from: "C", to: "D", weight: 4 },
  ],
  start: "A",
  target: "D",
  directed: false,
};

const directedModel = {
  kind: "graph",
  nodes: [
    { id: "A", label: "A", x: 0, y: 0 },
    { id: "B", label: "B", x: 1, y: 0 },
    { id: "C", label: "C", x: 2, y: 0 },
    { id: "D", label: "D", x: 3, y: 0 },
  ],
  edges: [
    { id: "e-ab", from: "A", to: "B", weight: 1 },
    { id: "e-bc", from: "B", to: "C", weight: 2 },
    { id: "e-ad", from: "A", to: "D", weight: 5 },
    { id: "e-cd", from: "C", to: "D", weight: 1 },
  ],
  start: "A",
  target: "D",
  directed: true,
};

function graphScenario(strategy, model = graphModel) {
  return {
    schema: 1,
    id: `graph-${strategy}`,
    title: `Graph ${strategy}`,
    substrate: "graph",
    strategy,
    model,
    params: {},
  };
}

function arrayScenario(strategy, values, target) {
  return {
    schema: 1,
    id: `array-${strategy}`,
    title: `Array ${strategy}`,
    substrate: "array",
    strategy,
    model: {
      kind: "array",
      values,
      sorted: strategy === "binary-search",
      ...(target === undefined ? {} : { target }),
    },
    params: {},
  };
}

function gridScenario(strategy, a, b) {
  return {
    schema: 1,
    id: `grid-${strategy}`,
    title: `Grid ${strategy}`,
    substrate: "grid",
    strategy,
    model: { kind: "table", a, b },
    params: {},
  };
}

const SCENARIOS = {
  bfs: graphScenario("bfs"),
  dfs: graphScenario("dfs"),
  topological: graphScenario("topological", directedModel),
  dijkstra: graphScenario("dijkstra", directedModel),
  binary: arrayScenario("binary-search", [1, 3, 5, 7, 9, 11, 13], 7),
  merge: arrayScenario("merge-sort", [5, 2, 8, 1, 9, 3]),
  quick: arrayScenario("quick-sort", [5, 2, 8, 1, 9, 3, 4]),
  edit: gridScenario("edit-distance", "kitten", "sitting"),
  lcs: gridScenario("lcs", "AGGTAB", "GXTXAYB"),
};

const NON_ADAPTIVE = ["bfs", "dfs", "topological", "merge", "quick", "edit", "lcs"];
const ADAPTIVE = ["binary", "dijkstra"];

function context(scenario, frameIndex) {
  const run = runScenario(scenario);
  assert.ok(run.frames.length > 0, `${scenario.id} produced frames`);
  const index = Math.min(Math.max(frameIndex, 0), run.frames.length - 1);
  return {
    scenario,
    run,
    frame: run.frames[index],
    frameIndex: index,
    mutations: [],
  };
}

function metric(projection, label) {
  const found = projection.metrics.find((item) => item.label === label);
  assert.ok(found, `metric ${label} present in ${JSON.stringify(projection.metrics)}`);
  return found.value;
}

test("LENS_IDS is the canonical seven-lens order", () => {
  assert.deepEqual(LENS_IDS, [
    "what-exists",
    "what-changes",
    "what-flows",
    "what-learns",
    "what-persists",
    "what-emerges",
    "what-will-happen",
  ]);
  assert.deepEqual(
    LENS_IDS.map((id) => LENS_BY_SLUG[id].slug),
    [...LENS_IDS],
  );
});

test("all seven lenses project on graph, array, and grid", () => {
  for (const scenario of Object.values(SCENARIOS)) {
    const run = runScenario(scenario);
    const probes = new Set([0, Math.floor(run.frames.length / 2), run.frames.length - 1]);
    for (const frameIndex of probes) {
      const ctx = context(scenario, frameIndex);
      for (const lens of LENS_IDS) {
        const projection = projectLens(lens, ctx);
        assert.equal(typeof projection.available, "boolean", `${scenario.id}/${lens} available`);
        assert.equal(typeof projection.readout, "string", `${scenario.id}/${lens} readout`);
        assert.ok(projection.readout.length > 0, `${scenario.id}/${lens} readout non-empty`);
        assert.ok(Array.isArray(projection.metrics), `${scenario.id}/${lens} metrics`);
        assert.ok(Array.isArray(projection.highlights), `${scenario.id}/${lens} highlights`);
        assert.equal(projection.notePrompt, NOTE_PROMPTS[lens], `${scenario.id}/${lens} prompt`);
        assert.ok(
          projection.readout.includes(LENS_BY_SLUG[lens].title),
          `${scenario.id}/${lens} uses the canonical title`,
        );
      }
    }
  }
});

test("highlight matrix: every id resolves in the current frame for every lens", () => {
  for (const scenario of Object.values(SCENARIOS)) {
    const run = runScenario(scenario);
    for (let frameIndex = 0; frameIndex < run.frames.length; frameIndex += 1) {
      const ctx = context(scenario, frameIndex);
      const ids = viewIds(ctx.frame.view);
      for (const lens of LENS_IDS) {
        const projection = projectLens(lens, ctx);
        assert.equal(
          new Set(projection.highlights).size,
          projection.highlights.length,
          `${scenario.id}/${lens} frame ${frameIndex} highlights unique`,
        );
        for (const id of projection.highlights) {
          assert.ok(
            ids.has(id),
            `${scenario.id}/${lens} frame ${frameIndex} highlight ${id} resolves`,
          );
        }
      }
    }
  }
});

test("readouts are frame-indexed for every lens", () => {
  for (const scenario of Object.values(SCENARIOS)) {
    const run = runScenario(scenario);
    if (run.frames.length < 2) continue;
    const start = context(scenario, 0);
    const end = context(scenario, run.frames.length - 1);
    for (const lens of LENS_IDS) {
      assert.notEqual(
        projectLens(lens, start).readout,
        projectLens(lens, end).readout,
        `${scenario.id}/${lens} readout changes with the frame`,
      );
    }
  }
});

test("what-learns is honestly absent where nothing adapts", () => {
  for (const key of NON_ADAPTIVE) {
    const ctx = context(SCENARIOS[key], 0);
    const projection = projectLens("what-learns", ctx);
    assert.equal(projection.available, false, `${key} learns is absent`);
    assert.equal(projection.absenceReason, ABSENCE, `${key} absence reason`);
    assert.ok(projection.readout.includes("No adaptive mechanism"), `${key} absent readout`);
    assert.equal(projection.notePrompt, NOTE_PROMPTS["what-learns"]);
    assert.ok(Array.isArray(projection.metrics));
    assert.ok(Array.isArray(projection.highlights));
  }
});

test("what-learns names the update rule for binary search and Dijkstra", () => {
  const binary = projectLens("what-learns", context(SCENARIOS.binary, 1));
  assert.equal(binary.available, true);
  assert.match(binary.readout, /bounds/i);
  assert.match(binary.readout, /eliminat/i);
  assert.ok(binary.highlights.length > 0);

  const dijkstra = projectLens("what-learns", context(SCENARIOS.dijkstra, 1));
  assert.equal(dijkstra.available, true);
  assert.match(dijkstra.readout, /relax/i);
  assert.match(dijkstra.readout, /label/i);
  assert.ok(dijkstra.highlights.length > 0);
});

test("what-exists marks every exposed part and counts the view", () => {
  const ctx = context(SCENARIOS.bfs, 0);
  const projection = projectLens("what-exists", ctx);
  const expected = new Set(ctx.frame.view.nodes.map((node) => node.id));
  for (const edge of ctx.frame.view.edges) expected.add(edge.id);
  assert.equal(projection.highlights.length, expected.size);
  assert.equal(metric(projection, "Nodes"), "4");
  assert.equal(metric(projection, "Edges"), "4");
  assert.equal(metric(projection, "Parts"), "8");
});

test("what-changes names the prior step and the update rule", () => {
  const ctx = context(SCENARIOS.binary, 1);
  const projection = projectLens("what-changes", ctx);
  assert.match(projection.readout, /Prior step:/);
  assert.match(projection.readout, /Update rule:/);
  assert.ok(Number(metric(projection, "Moved")) > 0);

  const start = projectLens("what-changes", context(SCENARIOS.binary, 0));
  assert.match(start.readout, /starting state/);
});

test("what-flows exposes active, waiting, and dependency counts", () => {
  const binary = projectLens("what-flows", context(SCENARIOS.binary, 1));
  assert.equal(metric(binary, "In motion"), "1");
  assert.equal(metric(binary, "Waiting"), "7");
  assert.ok(binary.highlights.length > 0);

  const grid = projectLens("what-flows", context(SCENARIOS.edit, 1));
  assert.equal(metric(grid, "Dependencies"), "3");
  assert.equal(metric(grid, "In motion"), "1");
  assert.ok(grid.highlights.length >= 4);
});

test("what-persists reports held and failing invariants for the frame", () => {
  const early = projectLens("what-persists", context(SCENARIOS.edit, 0));
  assert.equal(metric(early, "Held"), "1 / 2");
  assert.equal(metric(early, "Failing"), "1");
  assert.match(early.readout, /Final cell/);

  const last = projectLens("what-persists", context(SCENARIOS.edit, runScenario(SCENARIOS.edit).frames.length - 1));
  assert.equal(metric(last, "Held"), "2 / 2");
  assert.equal(metric(last, "Failing"), "0");
});

test("what-emerges reports graph components, cycles, degree, and levels", () => {
  const ctx = context(SCENARIOS.bfs, 0);
  // The fixture is one undirected component with a triangle A-B-C and tail C-D.
  const projection = projectLens("what-emerges", ctx);
  assert.equal(projection.available, true);
  assert.equal(metric(projection, "Components"), "1");
  assert.equal(metric(projection, "Cycles"), "1");
  assert.equal(metric(projection, "Max degree"), "3");
  assert.equal(metric(projection, "Levels"), "3");
  assert.ok(projection.highlights.length > 0);
  assert.match(projection.readout, /component/i);
});

test("what-emerges reports array runs, inversions, and duplicates", () => {
  const scenario = arrayScenario("merge-sort", [3, 1, 2, 2]);
  const projection = projectLens("what-emerges", context(scenario, 0));
  assert.equal(metric(projection, "Runs"), "2");
  assert.equal(metric(projection, "Longest run"), "3");
  assert.equal(metric(projection, "Inversions"), "3");
  assert.equal(metric(projection, "Duplicates"), "1");
  assert.ok(projection.highlights.length > 0);
});

test("what-emerges reports the grid alignment path", () => {
  const scenario = gridScenario("edit-distance", "ab", "ab");
  const run = runScenario(scenario);
  const projection = projectLens("what-emerges", context(scenario, run.frames.length - 1));
  assert.equal(metric(projection, "Path cells"), "3");
  assert.equal(metric(projection, "Matches"), "2");
  assert.equal(projection.highlights.length >= 3, true);
});

test("what-will-happen extrapolates from start, middle, and end", () => {
  const scenario = SCENARIOS.merge;
  const run = runScenario(scenario);
  const start = projectLens("what-will-happen", context(scenario, 0));
  assert.match(start.readout, /Extrapolation, not a probability/);
  assert.equal(metric(start, "Frames left"), String(run.frames.length - 1));
  assert.equal(metric(start, "Outcome"), "done");
  assert.ok(start.highlights.length > 0);

  const middle = projectLens(
    "what-will-happen",
    context(scenario, Math.floor(run.frames.length / 2)),
  );
  assert.equal(metric(middle, "Frames left"), String(run.frames.length - 1 - Math.floor(run.frames.length / 2)));
  assert.match(middle.readout, /next/i);

  const end = projectLens("what-will-happen", context(scenario, run.frames.length - 1));
  assert.equal(metric(end, "Frames left"), "0");
  assert.match(end.readout, /no future frames|complete|done/i);
});

test("note prompts match spec section 5 exactly", () => {
  for (const lens of LENS_IDS) {
    const projection = projectLens(lens, context(SCENARIOS.bfs, 0));
    assert.equal(projection.notePrompt, NOTE_PROMPTS[lens]);
  }
});

test("projection is pure and mutation-aware", () => {
  const ctx = context(SCENARIOS.binary, 2);
  const first = projectLens("what-exists", ctx);
  const second = projectLens("what-exists", ctx);
  assert.deepEqual(first, second);

  const mutated = {
    ...ctx,
    mutations: [
      {
        id: "m1",
        card: "modify",
        op: "set-target",
        label: "Move the target",
        payload: { target: 11 },
      },
    ],
  };
  const after = projectLens("what-exists", mutated);
  assert.notEqual(after.readout, first.readout);
  assert.match(after.readout, /mutation/i);
});
