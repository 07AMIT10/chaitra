import assert from "node:assert/strict";
import test from "node:test";
import {
  axiomCheck,
  bernoulliMean,
  bernoulliVariance,
  expectedCountPerFace,
  fairDieMean,
  llnAbsoluteError,
  sampleMeanFromHistogram,
} from "./probability-theory-math.ts";
import {
  BIASED_COIN_PRESET,
  LLN_FAIR_COIN_PRESET,
  simulateCoinFlips,
  simulateDiceRolls,
  empiricalProbsFromHist,
} from "./probability-theory-sim.ts";

test("bernoulli mean and variance", () => {
  assert.equal(bernoulliMean(0.5), 0.5);
  assert.ok(Math.abs(bernoulliVariance(0.5) - 0.25) < 1e-9);
});

test("fair die mean is 3.5 for d6", () => {
  assert.ok(Math.abs(fairDieMean(6) - 3.5) < 1e-9);
});

test("LLN: large fair coin sample near 0.5", () => {
  const { headsFrac } = simulateCoinFlips(LLN_FAIR_COIN_PRESET.trials, 0.5, LLN_FAIR_COIN_PRESET.seed);
  assert.ok(llnAbsoluteError(headsFrac, bernoulliMean(0.5)) < 0.02);
});

test("biased coin converges toward 0.72", () => {
  const p = BIASED_COIN_PRESET.pHeadsPct / 100;
  const { headsFrac } = simulateCoinFlips(BIASED_COIN_PRESET.trials, p, BIASED_COIN_PRESET.seed);
  assert.ok(llnAbsoluteError(headsFrac, p) < 0.02);
});

test("dice histogram empirical probs satisfy axioms", () => {
  const { hist } = simulateDiceRolls(600, 6, 42);
  const probs = empiricalProbsFromHist(hist);
  const { inUnitInterval, sumsToOne } = axiomCheck(probs);
  assert.ok(inUnitInterval);
  assert.ok(sumsToOne);
});

test("expected count per face", () => {
  assert.equal(expectedCountPerFace(600, 6), 100);
});

test("sample mean from histogram matches simulateDiceRolls", () => {
  const { hist, sampleMean } = simulateDiceRolls(500, 6, 42);
  const fromHist = sampleMeanFromHistogram(hist, 6);
  assert.ok(Math.abs(fromHist - sampleMean) < 1e-9);
});
