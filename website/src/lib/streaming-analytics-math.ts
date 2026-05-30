/**
 * Streaming analytics formulas (STREAMING_ANALYTICS/README.md — windows & watermarks).
 */

/** Tumbling window start for event-time t and fixed width w */
export function windowStart(eventTime: number, windowSize: number): number {
  if (windowSize <= 0) return 0;
  return Math.floor(eventTime / windowSize) * windowSize;
}

export function windowEnd(eventTime: number, windowSize: number): number {
  return windowStart(eventTime, windowSize) + windowSize;
}

/**
 * Event-time watermark after observing events: W = max(eventTime) − allowedLateness.
 * Declares no future events with event time < W (heuristic; late data may still arrive).
 */
export function eventTimeWatermark(maxEventTimeSeen: number, allowedLateness: number): number {
  return Math.max(0, maxEventTimeSeen - allowedLateness);
}

/** P(network delay > Δ) < ε — README bound for choosing allowed lateness Δ */
export function lateDropBoundEpsilon(delayExceedsDeltaProb: number): boolean {
  return delayExceedsDeltaProb < 0.001;
}

/** Exact tumbling-window sum over a complete event list (hindsight ground truth). */
export function exactWindowSum(
  events: { eventTime: number; value: number }[],
  start: number,
  end: number
): number {
  return events
    .filter((e) => e.eventTime >= start && e.eventTime < end)
    .reduce((a, e) => a + e.value, 0);
}

export function formatEventTime(t: number): string {
  return `t=${t}`;
}

export function formatWatermark(w: number): string {
  return `W=${w}`;
}

export function formatWindowLabel(start: number, end: number): string {
  return `[${start}, ${end})`;
}
