import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyPass, upsertPass } from "./drishti-pass.ts";

test("light notes carry forward to deep pass object", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.lenses["what-flows"].light = "Airtime bottleneck";
  const saved = upsertPass([], pass)[0];
  assert.equal(saved.lenses["what-flows"].light, "Airtime bottleneck");
  assert.equal(saved.lenses["what-flows"].deep, "");
});
