import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_EXPLORATION, uctScore, winRate } from "./mcts-math.ts";
import {
  GROUND_TRUTH_BEST_MOVE,
  mctsRecommendation,
  runMctsBatch,
  trueWinProb,
} from "./mcts-sim.ts";

test("uctScore: unvisited child is infinite", () => {
  assert.equal(uctScore(0, 0, 10, 1.4), Infinity);
});

test("uctScore: exploitation dominates when c is small", () => {
  const high = uctScore(8, 10, 20, 0.1);
  const low = uctScore(2, 10, 20, 0.1);
  assert.ok(high > low);
});

test("winRate matches README win/visit ratio", () => {
  assert.equal(winRate(55, 80), 55 / 80);
});

test("many rollouts prefer Move A (highest leaf win prob)", () => {
  const { state } = runMctsBatch(300, DEFAULT_EXPLORATION, 99);
  assert.equal(mctsRecommendation(state), GROUND_TRUTH_BEST_MOVE);
  assert.ok(trueWinProb("A") > trueWinProb("C1"));
});
