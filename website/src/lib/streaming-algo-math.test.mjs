import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CHAIN_CONFIG,
  sketchChainMemoryBytes,
  naiveExactMemoryBytes,
  bloomFpEstimate,
} from "./streaming-algo-math.ts";

describe("sketchChainMemoryBytes", () => {
  it("returns positive fixed RAM for default config", () => {
    const bytes = sketchChainMemoryBytes(DEFAULT_CHAIN_CONFIG);
    assert.ok(bytes > 0);
  });

  it("increases with larger bloom filter", () => {
    const small = sketchChainMemoryBytes({ ...DEFAULT_CHAIN_CONFIG, bloomM: 128 });
    const large = sketchChainMemoryBytes({ ...DEFAULT_CHAIN_CONFIG, bloomM: 1024 });
    assert.ok(large > small);
  });
});

describe("naiveExactMemoryBytes", () => {
  it("grows with distinct keys and stream length", () => {
    const small = naiveExactMemoryBytes(10, 100);
    const large = naiveExactMemoryBytes(100, 1000);
    assert.ok(large > small);
  });
});

describe("bloomFpEstimate", () => {
  it("returns plausible FP rate for default config", () => {
    const fp = bloomFpEstimate(DEFAULT_CHAIN_CONFIG, 50);
    assert.ok(fp >= 0 && fp <= 1);
  });

  it("increases as filter fills", () => {
    const fpLow = bloomFpEstimate(DEFAULT_CHAIN_CONFIG, 10);
    const fpHigh = bloomFpEstimate(DEFAULT_CHAIN_CONFIG, 200);
    assert.ok(fpHigh > fpLow);
  });
});
