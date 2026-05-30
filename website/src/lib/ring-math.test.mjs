import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  idealRemapFractionOnRemove,
  moduloRemapFractionOnShrink,
} from "./ring-math.ts";

describe("idealRemapFractionOnRemove", () => {
  it("returns 1/N for consistent hashing", () => {
    assert.equal(idealRemapFractionOnRemove(4), 0.25);
  });

  it("decreases as cluster grows", () => {
    const small = idealRemapFractionOnRemove(4);
    const large = idealRemapFractionOnRemove(100);
    assert.ok(large < small);
  });
});

describe("moduloRemapFractionOnShrink", () => {
  it("returns (N-1)/N for shrink N→N-1", () => {
    assert.equal(moduloRemapFractionOnShrink(10, 9), 0.9);
  });

  it("exceeds ideal consistent hashing remap", () => {
    const n = 10;
    const modulo = moduloRemapFractionOnShrink(n, n - 1);
    const ideal = idealRemapFractionOnRemove(n);
    assert.ok(modulo > ideal);
  });
});
