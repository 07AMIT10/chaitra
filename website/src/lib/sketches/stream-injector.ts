import type { FrequencyTruth, StreamEvent } from "./types";

export const DEMO_FRUIT_STREAM: StreamEvent[] = [
  ...Array.from({ length: 100 }, () => ({ key: "apple" })),
  ...Array.from({ length: 50 }, () => ({ key: "banana" })),
  ...Array.from({ length: 10 }, () => ({ key: "orange" })),
];

export const DEMO_NOISE_KEYS = Array.from({ length: 200 }, (_, i) => `noise_${i}`);

/** Build ground-truth frequency map from a stream. */
export function truthFromStream(events: Iterable<StreamEvent>): FrequencyTruth {
  const truth = new Map<string, number>();
  for (const { key, count = 1 } of events) {
    truth.set(key, (truth.get(key) ?? 0) + count);
  }
  return truth;
}

/** Deterministic pseudo-random stream for demos. */
export function syntheticStream(
  keys: string[],
  counts: number[],
  noiseKeys: string[] = []
): StreamEvent[] {
  const events: StreamEvent[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      events.push({ key: keys[i] });
    }
  }
  for (const nk of noiseKeys) {
    events.push({ key: nk });
  }
  return events;
}

/** Step through stream returning prefix events up to index (inclusive). */
export function streamPrefix(events: StreamEvent[], index: number): StreamEvent[] {
  return events.slice(0, Math.max(0, index + 1));
}

/** Seeded shuffle for reproducible stream order. */
export function shuffleStream(events: StreamEvent[], seed = 42): StreamEvent[] {
  const out = [...events];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Unique keys from stream in insertion order. */
export function distinctKeys(events: Iterable<StreamEvent>): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const { key } of events) {
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}
