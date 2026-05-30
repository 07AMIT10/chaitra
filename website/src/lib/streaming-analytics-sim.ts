/**
 * Tumbling event-time windows with ingest-order processing and watermarks.
 * Synthetic mobile clickstream (README tunnel / late-data narrative).
 */

import {
  eventTimeWatermark,
  exactWindowSum,
  windowEnd,
  windowStart,
} from "./streaming-analytics-math";

export interface StreamEvent {
  id: string;
  eventTime: number;
  ingestTime: number;
  value: number;
  label: string;
}

export interface StreamingAnalyticsConfig {
  windowSize: number;
  allowedLateness: number;
}

export interface WindowSnapshot {
  start: number;
  end: number;
  partialSum: number;
  emittedSum: number | null;
  exactSum: number;
  lateDropped: number;
  status: "open" | "closed";
}

export interface StreamingSnapshot {
  processed: StreamEvent[];
  droppedIds: string[];
  watermark: number;
  maxEventTime: number;
  windows: WindowSnapshot[];
  totalLateDropped: number;
  totalLateValue: number;
}

/** Ingest-time order (datacenter receive order). */
export const CLICKSTREAM: StreamEvent[] = [
  { id: "c01", eventTime: 1, ingestTime: 1, value: 5, label: "home" },
  { id: "c02", eventTime: 2, ingestTime: 2, value: 3, label: "search" },
  { id: "c03", eventTime: 3, ingestTime: 3, value: 7, label: "product" },
  { id: "c04", eventTime: 8, ingestTime: 4, value: 2, label: "cart" },
  { id: "c05", eventTime: 9, ingestTime: 5, value: 4, label: "checkout" },
  { id: "c06", eventTime: 1, ingestTime: 6, value: 6, label: "tunnel-replay" },
  { id: "c07", eventTime: 12, ingestTime: 7, value: 10, label: "push" },
  { id: "c08", eventTime: 15, ingestTime: 8, value: 8, label: "offer" },
  { id: "c09", eventTime: 5, ingestTime: 9, value: 9, label: "tunnel-late" },
  { id: "c10", eventTime: 18, ingestTime: 10, value: 5, label: "share" },
  { id: "c11", eventTime: 19, ingestTime: 11, value: 3, label: "wishlist" },
  { id: "c12", eventTime: 11, ingestTime: 12, value: 4, label: "backfill" },
  { id: "c13", eventTime: 22, ingestTime: 13, value: 6, label: "notify" },
  { id: "c14", eventTime: 25, ingestTime: 14, value: 2, label: "email" },
  { id: "c15", eventTime: 7, ingestTime: 15, value: 5, label: "tunnel-very-late" },
  { id: "c16", eventTime: 28, ingestTime: 16, value: 7, label: "reorder" },
  { id: "c17", eventTime: 31, ingestTime: 17, value: 4, label: "upsell" },
  { id: "c18", eventTime: 4, ingestTime: 18, value: 8, label: "stale-click" },
  { id: "c19", eventTime: 33, ingestTime: 19, value: 6, label: "survey" },
  { id: "c20", eventTime: 35, ingestTime: 20, value: 3, label: "rating" },
];

export const STREAM_MAX = CLICKSTREAM.length - 1;

export const DEFAULT_STREAM_CONFIG: StreamingAnalyticsConfig = {
  windowSize: 10,
  allowedLateness: 3,
};

export const TUNNEL_LATE_PRESET = {
  streamIdx: STREAM_MAX,
  allowedLateness: 6,
  windowSize: 10,
};

export const TIGHT_WATERMARK_PRESET = {
  streamIdx: STREAM_MAX,
  allowedLateness: 1,
  windowSize: 10,
};

export const PRE_CLOSE_PRESET = {
  streamIdx: 8,
  allowedLateness: 3,
  windowSize: 10,
};

function uniqueWindowStarts(events: StreamEvent[], windowSize: number): number[] {
  const starts = new Set<number>();
  for (const e of events) {
    starts.add(windowStart(e.eventTime, windowSize));
  }
  return [...starts].sort((a, b) => a - b);
}

/** Process first streamIdx+1 events in ingest order; close windows when watermark passes end. */
export function runStreamingAnalytics(
  streamIdx: number,
  config: StreamingAnalyticsConfig
): StreamingSnapshot {
  const { windowSize, allowedLateness } = config;
  const idx = Math.min(Math.max(0, streamIdx), STREAM_MAX);
  const processed = CLICKSTREAM.slice(0, idx + 1);

  const starts = uniqueWindowStarts(CLICKSTREAM, windowSize);
  const windows: WindowSnapshot[] = starts.map((start) => ({
    start,
    end: start + windowSize,
    partialSum: 0,
    emittedSum: null,
    exactSum: exactWindowSum(CLICKSTREAM, start, start + windowSize),
    lateDropped: 0,
    status: "open" as const,
  }));

  let maxEventTime = 0;
  let watermark = 0;
  let totalLateDropped = 0;
  let totalLateValue = 0;
  const droppedIds: string[] = [];

  const winByStart = new Map(windows.map((w) => [w.start, w]));

  const closeEligible = () => {
    for (const w of windows) {
      if (w.status === "closed") continue;
      if (watermark >= w.end) {
        w.emittedSum = w.partialSum;
        w.status = "closed";
      }
    }
  };

  for (const ev of processed) {
    maxEventTime = Math.max(maxEventTime, ev.eventTime);
    watermark = eventTimeWatermark(maxEventTime, allowedLateness);

    const start = windowStart(ev.eventTime, windowSize);
    const w = winByStart.get(start);
    if (!w) continue;

    if (w.status === "closed") {
      w.lateDropped += 1;
      totalLateDropped += 1;
      totalLateValue += ev.value;
      droppedIds.push(ev.id);
      continue;
    }

    w.partialSum += ev.value;
    closeEligible();
  }

  closeEligible();

  return {
    processed,
    droppedIds,
    watermark,
    maxEventTime,
    windows,
    totalLateDropped,
    totalLateValue,
  };
}

export function recentEventsTape(events: StreamEvent[], max = 14): StreamEvent[] {
  return events.slice(-max);
}

export function windowForEvent(eventTime: number, windowSize: number): { start: number; end: number } {
  const start = windowStart(eventTime, windowSize);
  return { start, end: windowEnd(eventTime, windowSize) };
}

export function ingestProgressPct(streamIdx: number): number {
  if (STREAM_MAX <= 0) return 100;
  return ((streamIdx + 1) / (STREAM_MAX + 1)) * 100;
}
