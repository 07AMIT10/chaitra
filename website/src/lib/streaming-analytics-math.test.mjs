import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  windowStart,
  windowEnd,
  eventTimeWatermark,
  exactWindowSum,
} from "./streaming-analytics-math.ts";

describe("windowStart", () => {
  it("floors event time to window boundary", () => {
    assert.equal(windowStart(37, 10), 30);
  });

  it("returns 0 for invalid window size", () => {
    assert.equal(windowStart(37, 0), 0);
  });
});

describe("windowEnd", () => {
  it("equals start + windowSize", () => {
    assert.equal(windowEnd(37, 10), 40);
  });
});

describe("eventTimeWatermark", () => {
  it("subtracts allowed lateness from max event time", () => {
    assert.equal(eventTimeWatermark(100, 5), 95);
  });

  it("never goes below 0", () => {
    assert.equal(eventTimeWatermark(3, 10), 0);
  });
});

describe("exactWindowSum", () => {
  it("sums values in [start, end)", () => {
    const events = [
      { eventTime: 5, value: 1 },
      { eventTime: 15, value: 2 },
      { eventTime: 25, value: 3 },
    ];
    assert.equal(exactWindowSum(events, 10, 20), 2);
  });
});
