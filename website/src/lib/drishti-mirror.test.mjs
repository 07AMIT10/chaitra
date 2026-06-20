import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyPass } from "./drishti-pass.ts";
import { generateLetter, generateMirror } from "./drishti-mirror.ts";

test("generateMirror returns fallback when no substantive notes", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep";
  pass.lenses["what-exists"].light = "idk";
  const result = generateMirror(pass);
  assert.match(
    result.mirrorText,
    /named the phenomenon and sat with the questions/i
  );
  assert.deepEqual(result.highlightedLenses, []);
});

test("generateMirror picks top two lenses by keyword hits, tie by lens order", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.lenses["what-exists"].light = "Same three people — structure";
  pass.lenses["what-flows"].light = "Airtime is the bottleneck queue";
  pass.lenses["what-learns"].light = "No feedback loop updates the format";
  const { mirrorText, highlightedLenses } = generateMirror(pass);
  assert.match(mirrorText, /what moves and queues/);
  assert.match(mirrorText, /what updates from feedback/);
  assert.deepEqual(highlightedLenses, ["what-flows", "what-learns"]);
});

test("generateLetter weaves non-gap notes and bridges nowSentence", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep debt";
  pass.context = "After three short nights";
  pass.lenses["what-exists"].light = "Pressure builds all day";
  pass.lenses["what-changes"].light = "idk";
  pass.lenses["what-flows"].light = "Energy flows out faster than it returns";
  pass.nowSentence = "It's a balance sheet, not a switch";
  const letter = generateLetter(pass);
  assert.match(letter, /You looked at \*\*Sleep debt\*\* through seven lenses\./);
  assert.match(letter, /Pressure builds all day/);
  assert.match(letter, /Energy flows out faster/);
  assert.doesNotMatch(letter, /idk/i);
  assert.match(letter, /balance sheet, not a switch/);
});

test("generateLetter uses invitation when nowSentence missing", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Standup";
  pass.lenses["what-exists"].light = "Three voices dominate";
  const letter = generateLetter(pass);
  assert.match(letter, /Something may still be forming\./);
});
