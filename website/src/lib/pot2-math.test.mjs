import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expectedMaxLoadRandom,
  expectedMaxLoadPowerOfTwo,
} from "./pot2-math.ts";

describe("expectedMaxLoadRandom", () => {
  it("grows with number of bins", () => {
    const small = expectedMaxLoadRandom(100);
    const large = expectedMaxLoadRandom(10000);
    assert.ok(large > small);
  });

  it("returns 1 for n≤1", () => {
    assert.equal(expectedMaxLoadRandom(1), 1);
  });
});

describe("expectedMaxLoadPowerOfTwo", () => {
  it("is lower than random for very large n", () => {
    const random = expectedMaxLoadRandom(1_000_000);
    const pot2 = expectedMaxLoadPowerOfTwo(1_000_000);
    assert.ok(pot2 < random);
  });

  it("increases slowly with n", () => {
    const n100 = expectedMaxLoadPowerOfTwo(100);
    const n10000 = expectedMaxLoadPowerOfTwo(10000);
    assert.ok(n10000 > n100);
    assert.ok(n10000 - n100 < 5);
  });
});
