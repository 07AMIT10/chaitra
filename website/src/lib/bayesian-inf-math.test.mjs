import test from "node:test";
import assert from "node:assert/strict";
import { marginalEvidence, posterior } from "./bayesian-inf-math.ts";

/** README rare disease: 1 in 1M prior, 99% sensitive, 1% false positive. */
test("rare disease positive test posterior matches README order of magnitude", () => {
  const prior = 1e-6;
  const post = posterior(prior, 0.99, 0.01);
  assert.ok(post < 0.0002, `expected ≪0.02%, got ${post}`);
  assert.ok(post > 1e-6, `expected > prior, got ${post}`);
  const marg = marginalEvidence(prior, 0.99, 0.01);
  assert.ok(Math.abs(post - (0.99 * prior) / marg) < 1e-12);
});

test("posteriorSymmetric matches minisim recipe", () => {
  const prior = 0.2;
  const leH = 0.8;
  const post = posterior(prior, leH, 1 - leH);
  const num = prior * leH;
  const den = num + (1 - prior) * (1 - leH);
  assert.equal(post, num / den);
});
