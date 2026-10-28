import test from "node:test";
import assert from "node:assert/strict";

import { scenarioHash } from "./hash.ts";
import { arrayRunner } from "./runners/array.ts";

const ODD_VALUES = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

function arrayScenario(strategy, values, { target, ...modelRest } = {}, overrides = {}) {
  const model = {
    kind: "array",
    values,
    sorted: strategy === "binary-search",
    ...(target !== undefined ? { target } : {}),
    ...modelRest,
  };
  return {
    schema: 1,
    id: "array-test",
    title: "Array Test",
    substrate: "array",
    strategy,
    model,
    params: {},
    ...overrides,
  };
}

/** Every frame: sequential index, unique item ids, resolvable highlights, in-bounds pointers/segments. */
function checkFrameContract(result) {
  assert.ok(result.frames.length <= 300, "trace never exceeds 300 frames");
  result.frames.forEach((frame, expectedIndex) => {
    assert.equal(frame.index, expectedIndex, `frame index sequence at ${expectedIndex}`);
    assert.equal(frame.view.kind, "array");
    assert.ok(Array.isArray(frame.metrics) && Array.isArray(frame.highlights));
    assert.ok(Array.isArray(frame.events) && Array.isArray(frame.invariants));
    assert.match(frame.stateHash, /^[0-9a-f]{8}$/);
    const items = frame.view.items;
    const ids = items.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, "item ids unique");
    ids.forEach((id) => assert.match(id, /^item:\d+$/));
    for (const highlight of frame.highlights) {
      assert.ok(
        ids.includes(highlight.id),
        `highlight ${highlight.id} resolves in frame ${frame.index}`,
      );
    }
    for (const pointer of frame.view.pointers ?? []) {
      assert.ok(
        Number.isInteger(pointer.index) && pointer.index >= 0 && pointer.index < items.length,
        `pointer ${pointer.label} in bounds in frame ${frame.index}`,
      );
    }
    for (const segment of frame.view.segments ?? []) {
      assert.ok(
        segment.from >= 0 && segment.to >= segment.from && segment.to < items.length,
        `segment in bounds in frame ${frame.index}`,
      );
    }
  });
}

const metricValue = (frame, label) => {
  const metric = frame.metrics.find((m) => m.label === label);
  assert.ok(metric, `metric ${label} present`);
  return metric.value;
};

test("runner contract exposes the array substrate and the three array strategies", () => {
  assert.equal(arrayRunner.substrate, "array");
  assert.deepEqual([...arrayRunner.strategies], ["binary-search", "merge-sort", "quick-sort"]);
});

test("binary search finds the target with probe frames and a found final frame", () => {
  const scenario = arrayScenario("binary-search", ODD_VALUES, { target: 19 });
  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "done");
  assert.equal(result.hash, scenarioHash(scenario));
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.frames.length, 5); // initial + 3 probes + found final
  checkFrameContract(result);

  const initial = result.frames[0];
  assert.equal(metricValue(initial, "Comparisons"), "0");
  assert.ok(initial.view.items.every((item) => (item.state ?? "idle") === "idle"));

  const final = result.frames.at(-1);
  assert.deepEqual(final.highlights, [{ id: "item:9", role: "done" }]);
  assert.equal(final.view.items[9].value, 19);
  assert.ok(final.events.some((event) => /found/i.test(event.text)));
  assert.equal(metricValue(final, "Probes"), "3");
  for (const frame of result.frames) {
    assert.ok(frame.invariants.every((inv) => inv.holds === true));
    assert.ok(frame.invariants.some((inv) => /eliminated/i.test(inv.label)));
  }
});

test("binary search reports a missing target with a not-found final frame", () => {
  const scenario = arrayScenario("binary-search", ODD_VALUES, { target: 6 });
  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "done");
  assert.equal(result.frames.length, 5);
  checkFrameContract(result);
  const final = result.frames.at(-1);
  assert.ok(final.events.some((event) => /not present/i.test(event.text)));
  assert.ok(final.highlights.every((highlight) => highlight.role !== "done"));
  assert.equal(metricValue(final, "Probes"), "3");
  for (const frame of result.frames) {
    assert.ok(frame.invariants.every((inv) => inv.holds === true));
  }
});

test("binary search handles a single-value array", () => {
  const result = arrayRunner.run(arrayScenario("binary-search", [7], { target: 7 }));
  assert.equal(result.outcome, "done");
  checkFrameContract(result);
  assert.deepEqual(result.frames.at(-1).highlights, [{ id: "item:0", role: "done" }]);
});

test("binary search rejects unsorted values with zero frames", () => {
  const scenario = arrayScenario("binary-search", [3, 1, 2], { target: 2 });
  const diagnostics = arrayRunner.validate(scenario);
  assert.ok(diagnostics.some((d) => d.code === "values-not-ascending"));

  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "invalid");
  assert.equal(result.frames.length, 0);
  assert.ok(result.diagnostics.length > 0);
  assert.equal(result.hash, scenarioHash(scenario));
});

test("binary search requires a target", () => {
  const scenario = arrayScenario("binary-search", ODD_VALUES);
  const diagnostics = arrayRunner.validate(scenario);
  assert.ok(diagnostics.some((d) => d.code === "target-required"));
  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "invalid");
  assert.equal(result.frames.length, 0);
});

test("binary search requires ascending values (duplicates allowed)", () => {
  assert.equal(arrayRunner.validate(arrayScenario("binary-search", [1, 2, 2, 3], { target: 2 })).length, 0);
  const bad = arrayRunner.validate(arrayScenario("binary-search", [1, 3, 2], { target: 2 }));
  assert.ok(bad.some((d) => d.code === "values-not-ascending"));
});

test("malformed scenarios produce zero frames, diagnostics, and a scenario hash", () => {
  const cases = [
    arrayScenario("quick-sort", Array.from({ length: 33 }, (_, i) => i)),
    arrayScenario("quick-sort", [1, Number.NaN, 2]),
    arrayScenario("quick-sort", [1, "two", 3]),
    arrayScenario("quick-sort", ODD_VALUES, {}, { substrate: "graph" }),
    arrayScenario("dijkstra", ODD_VALUES),
    arrayScenario("quick-sort", ODD_VALUES, { kind: "graph" }),
    arrayScenario("quick-sort", "not-an-array"),
    arrayScenario("quick-sort", ODD_VALUES, { target: "high" }),
  ];
  for (const scenario of cases) {
    const result = arrayRunner.run(scenario);
    assert.equal(result.outcome, "invalid", `invalid outcome for ${JSON.stringify(scenario.model)}`);
    assert.equal(result.frames.length, 0);
    assert.ok(result.diagnostics.length > 0);
    assert.equal(result.hash, scenarioHash(scenario));
    assert.doesNotThrow(() => arrayRunner.validate(scenario));
  }
});

test("merge sort handles duplicates and preserves stable item ids", () => {
  const scenario = arrayScenario("merge-sort", [2, 1, 2, 1]);
  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "done");
  checkFrameContract(result);

  assert.deepEqual(
    result.frames[0].view.items.map((item) => item.id),
    ["item:0", "item:1", "item:2", "item:3"],
  );
  for (const frame of result.frames) {
    assert.deepEqual(
      [...frame.view.items.map((item) => item.id)].sort(),
      ["item:0", "item:1", "item:2", "item:3"],
      "the same four item ids appear in every frame",
    );
  }
  const final = result.frames.at(-1);
  assert.deepEqual(final.view.items.map((item) => item.value), [1, 1, 2, 2]);
  // The two 1s (item:1, item:3) and the two 2s (item:0, item:2) keep original order.
  assert.deepEqual(
    final.view.items.map((item) => item.id),
    ["item:1", "item:3", "item:0", "item:2"],
  );
  assert.ok(Number(metricValue(final, "Comparisons")) > 0);
  assert.ok(Number(metricValue(final, "Merges")) > 0);
  assert.ok(final.invariants.some((inv) => /Array is sorted/.test(inv.label) && inv.holds));
  assert.ok(
    result.frames.some((frame) =>
      frame.invariants.some((inv) => /Segment \[\d+\.\.\d+\] is sorted/.test(inv.label)),
    ),
  );
  for (const frame of result.frames) {
    assert.ok(frame.invariants.every((inv) => inv.holds === true));
  }
});

test("merge sort deterministically sorts 32 values within the frame cap", () => {
  const values = Array.from({ length: 32 }, (_, i) => (i * 37) % 32);
  const scenario = arrayScenario("merge-sort", values);
  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "done");
  assert.ok(result.frames.length <= 300);
  checkFrameContract(result);
  assert.deepEqual(
    result.frames.at(-1).view.items.map((item) => item.value),
    [...values].sort((a, b) => a - b),
  );
  const again = arrayRunner.run(scenario);
  assert.deepEqual(result.frames.map((f) => f.stateHash), again.frames.map((f) => f.stateHash));
});

test("quick sort is deterministic and sorts small input", () => {
  const scenario = arrayScenario("quick-sort", [8, 3, 5, 1, 9, 2]);
  const first = arrayRunner.run(scenario);
  const second = arrayRunner.run(scenario);
  assert.equal(first.outcome, "done");
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.frames)),
    JSON.parse(JSON.stringify(second.frames)),
  );
  assert.equal(first.hash, scenarioHash(scenario));
  checkFrameContract(first);

  assert.deepEqual(
    first.frames.at(-1).view.items.map((item) => item.value),
    [1, 2, 3, 5, 8, 9],
  );
  assert.ok(Number(metricValue(first.frames.at(-1), "Comparisons")) > 0);
  assert.ok(Number(metricValue(first.frames.at(-1), "Swaps")) > 0);
  assert.ok(first.frames.some((frame) => (frame.view.pointers ?? []).some((p) => p.label === "pivot")));
  assert.ok(
    first.frames.some((frame) => frame.view.segments?.some((s) => s.label === "pivot settled")),
  );
});

test("quick sort on ascending input settles every pivot without swaps", () => {
  const scenario = arrayScenario("quick-sort", [1, 2, 3, 4, 5]);
  const result = arrayRunner.run(scenario);
  assert.equal(result.outcome, "done");
  checkFrameContract(result);
  assert.deepEqual(
    result.frames.at(-1).view.items.map((item) => item.value),
    [1, 2, 3, 4, 5],
  );
  assert.equal(metricValue(result.frames.at(-1), "Swaps"), "0");
  for (const frame of result.frames) {
    assert.ok(frame.invariants.every((inv) => inv.holds === true));
  }
});

test("quick sort caps at 300 frames with a max-steps outcome", () => {
  const scenario = arrayScenario("quick-sort", Array.from({ length: 32 }, (_, i) => i + 1));
  const result = arrayRunner.run(scenario);
  assert.equal(result.frames.length, 300);
  assert.equal(result.outcome, "max-steps");
  checkFrameContract(result);
});

test("merge sort and binary search never hit the frame cap on 32 values", () => {
  const sorted = Array.from({ length: 32 }, (_, i) => i + 1);
  const merge = arrayRunner.run(arrayScenario("merge-sort", sorted));
  assert.equal(merge.outcome, "done");
  const search = arrayRunner.run(arrayScenario("binary-search", sorted, { target: 16.5 }));
  assert.equal(search.outcome, "done");
  checkFrameContract(merge);
  checkFrameContract(search);
});

test("run does not mutate the input scenario", () => {
  const scenario = arrayScenario("quick-sort", [3, 1, 2]);
  const snapshot = structuredClone(scenario);
  arrayRunner.run(scenario);
  assert.deepEqual(scenario, snapshot);
});

test("a max-steps trace is still inspectable with valid invariants", () => {
  const scenario = arrayScenario("quick-sort", [4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 2]);
  const result = arrayRunner.run(scenario);
  checkFrameContract(result);
  assert.ok(["done", "max-steps"].includes(result.outcome));
  for (const frame of result.frames) {
    assert.ok(frame.events.length >= 1);
    assert.ok(frame.invariants.every((inv) => typeof inv.holds === "boolean"));
  }
});
