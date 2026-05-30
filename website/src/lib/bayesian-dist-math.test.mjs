import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NETWORK,
  minisimBelief,
  posteriorSwitchJoint,
  posteriorSwitchNaiveSequential,
  readmeSwitchCongestionGroundTruth,
} from "./bayesian-dist-math.ts";

test("both servers slow → high P(switch), low P(reboot A)", () => {
  const obs = {
    serverA: "slow",
    serverB: "slow",
    dbTimeout: "unknown",
    userFail: "unknown",
  };
  const pSwitch = posteriorSwitchJoint(DEFAULT_NETWORK, obs);
  assert.ok(pSwitch > 0.85, `expected P(switch) > 85%, got ${pSwitch}`);
  const naive = posteriorSwitchNaiveSequential(DEFAULT_NETWORK, obs);
  assert.ok(naive > pSwitch * 0.5, "naive should also rise but joint uses correlation");
});

test("symptom pair ground truth matches README (~98% switch fault)", () => {
  const gt = readmeSwitchCongestionGroundTruth();
  assert.ok(gt.jointPosterior > 0.9, `expected ≈98%, got ${gt.jointPosterior}`);
  assert.equal(gt.wouldRebootA, true);
});

test("minisimBelief matches legacy minisim recipe", () => {
  const prior = 0.1;
  const evidence = 0.7;
  const post = minisimBelief(prior, evidence);
  const num = prior * evidence;
  const den = num + (1 - prior) * (1 - evidence);
  assert.equal(post, num / den);
});

test("single server alarm keeps switch posterior moderate", () => {
  const obs = {
    serverA: "slow",
    serverB: "unknown",
    dbTimeout: "unknown",
    userFail: "unknown",
  };
  const pSwitch = posteriorSwitchJoint(DEFAULT_NETWORK, obs);
  assert.ok(pSwitch < 0.5, `single alarm should not imply switch fault, got ${pSwitch}`);
  assert.ok(pSwitch > DEFAULT_NETWORK.priorSwitchFault);
});
