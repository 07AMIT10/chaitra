import assert from "node:assert/strict";
import test from "node:test";
import {
  memoryFactorVsFp32,
  quantize,
  quantizationVariance,
  scaleFactor,
  timingErrorRate,
} from "./approximate-computing-math.ts";

test("scale factor shrinks as bits increase", () => {
  const s8 = scaleFactor(0, 1, 8);
  const s7 = scaleFactor(0, 1, 7);
  assert.ok(s7 > s8);
});

test("quantize maps pi in [0,4] to bucket", () => {
  const xq = quantize(Math.PI, 0, 4, 8);
  assert.ok(xq >= 0 && xq <= 4);
  assert.ok(Math.abs(xq - Math.PI) < scaleFactor(0, 4, 8) / 2 + 1e-9);
});

test("variance scales ~ S^2 when bits drop by one", () => {
  const s8 = scaleFactor(0, 1, 8);
  const s7 = scaleFactor(0, 1, 7);
  const ratio = quantizationVariance(s7) / quantizationVariance(s8);
  assert.ok(ratio > 3.5 && ratio < 4.5);
});

test("memory factor INT4 vs FP32", () => {
  assert.equal(memoryFactorVsFp32(4), 8);
});

test("timing error rises when voltage drops", () => {
  const high = timingErrorRate(0.95);
  const low = timingErrorRate(0.65);
  assert.ok(low > high);
});
