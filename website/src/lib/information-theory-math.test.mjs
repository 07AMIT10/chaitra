import assert from "node:assert/strict";
import test from "node:test";
import {
  crossEntropy,
  entropyVsUniform,
  shannonEntropy,
  surprisal,
  uniformDistribution,
} from "./information-theory-math.ts";
import {
  BIASED_COIN,
  FAIR_COIN,
  resolveDistribution,
  twoSymbolProbs,
} from "./information-theory-sim.ts";

test("fair coin entropy is 1 bit", () => {
  const h = shannonEntropy(FAIR_COIN.probs);
  assert.ok(Math.abs(h - 1) < 1e-9);
});

test("biased coin matches README ~0.08 bits", () => {
  const { probs } = resolveDistribution(BIASED_COIN, 99);
  const h = shannonEntropy(probs);
  assert.ok(h > 0.07 && h < 0.09);
  assert.ok(surprisal(probs[1]) > 6.5);
});

test("surprisal at p=0.5 is 1 bit", () => {
  assert.ok(Math.abs(surprisal(0.5) - 1) < 1e-9);
});

test("uniform four-symbol entropy is 2 bits", () => {
  const u = uniformDistribution(4);
  assert.ok(Math.abs(shannonEntropy(u) - 2) < 1e-9);
});

test("entropyVsUniform gap on skewed two-symbol", () => {
  const probs = twoSymbolProbs(99);
  const { h, uniformH, gap } = entropyVsUniform(probs);
  assert.ok(h < uniformH);
  assert.ok(gap > 0.9);
});

test("crossEntropy equals H when Q is uniform and P is uniform", () => {
  const u = uniformDistribution(4);
  assert.ok(Math.abs(crossEntropy(u, u) - shannonEntropy(u)) < 1e-9);
});
