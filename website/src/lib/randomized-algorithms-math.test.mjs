import assert from "node:assert/strict";
import test from "node:test";
import {
  deterministicWorstComparisons,
  lasVegasExpectedComparisons,
  monteCarloAnyHitSuccess,
  monteCarloSingleProbeSuccess,
} from "./randomized-algorithms-math.ts";
import {
  deterministicQuickselect,
  groundTruthKth,
  lasVegasQuickselect,
  monteCarloKthGuess,
  SORTED_PRESET,
} from "./randomized-algorithms-sim.ts";

test("monteCarloSingleProbeSuccess", () => {
  assert.equal(monteCarloSingleProbeSuccess(12), 1 / 12);
});

test("monteCarloAnyHitSuccess", () => {
  const p = monteCarloAnyHitSuccess(12, 8);
  assert.ok(p > 0.45 && p < 0.55);
});

test("lasVegas quickselect always correct on sorted", () => {
  const r = lasVegasQuickselect(SORTED_PRESET.values, 3, 42);
  assert.equal(r.value, groundTruthKth(SORTED_PRESET.values, 3));
  assert.ok(r.comparisons > 0);
});

test("deterministic first pivot blows up on sorted", () => {
  const lv = lasVegasQuickselect(SORTED_PRESET.values, 3, 7);
  const det = deterministicQuickselect(SORTED_PRESET.values, 3);
  assert.equal(det.value, 3);
  assert.ok(det.comparisons > lasVegasExpectedComparisons(12));
  assert.ok(det.comparisons >= lv.comparisons);
});

test("monteCarlo can be wrong with one probe", () => {
  let wrong = 0;
  for (let s = 1; s <= 50; s++) {
    const mc = monteCarloKthGuess(SORTED_PRESET.values, 3, 1, s);
    if (!mc.correct) wrong++;
  }
  assert.ok(wrong > 0);
});
