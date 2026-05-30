import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { logClassScore, posteriorSpamFromLogScores } from "./spam-math.ts";

const wordLn = (word, label) => (label === "spam" && word === "viagra" ? -1 : -2);

describe("logClassScore", () => {
  it("includes log prior plus word likelihoods", () => {
    const score = logClassScore(["viagra"], 0.5, "spam", wordLn);
    assert.ok(score < 0);
  });

  it("spam score higher than ham when spam words dominate", () => {
    const spam = logClassScore(["viagra"], 0.5, "spam", wordLn);
    const ham = logClassScore(["viagra"], 0.5, "ham", wordLn);
    assert.ok(spam > ham);
  });
});

describe("posteriorSpamFromLogScores", () => {
  it("returns 0.5 for equal log scores", () => {
    assert.equal(posteriorSpamFromLogScores(-1, -1), 0.5);
  });

  it("returns value in (0, 1)", () => {
    const p = posteriorSpamFromLogScores(-0.5, -2);
    assert.ok(p > 0 && p < 1);
  });

  it("approaches 1 when spam score dominates", () => {
    const p = posteriorSpamFromLogScores(0, -100);
    assert.ok(p > 0.99);
  });
});
