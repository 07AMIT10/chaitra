import { CountMinSketch } from "./cms-sim";

export type AccessResult = "hit" | "miss-admit" | "miss-reject";

/** TinyLFU admission with CMS frequency estimate — simplified from README pattern */
export class TinyLFUCache {
  capacity: number;
  /** LRU order: first key = victim */
  window: Map<string, number>;
  cms: CountMinSketch;
  admitted: string[];
  rejected: string[];
  hits: number;
  misses: number;

  constructor(capacity = 8) {
    this.capacity = capacity;
    this.window = new Map();
    this.cms = new CountMinSketch(0.05, 0.1);
    this.admitted = [];
    this.rejected = [];
    this.hits = 0;
    this.misses = 0;
  }

  reset(): void {
    this.window.clear();
    this.cms = new CountMinSketch(0.05, 0.1);
    this.admitted = [];
    this.rejected = [];
    this.hits = 0;
    this.misses = 0;
  }

  private touch(key: string): void {
    const freq = this.window.get(key) ?? 0;
    this.window.delete(key);
    this.window.set(key, freq + 1);
  }

  private lruVictim(): string {
    const first = this.window.keys().next().value;
    if (!first) throw new Error("empty cache");
    return first;
  }

  private evict(key: string): void {
    this.window.delete(key);
  }

  access(key: string, useAdmission = true): AccessResult {
    this.cms.add(key);
    if (this.window.has(key)) {
      this.touch(key);
      this.hits++;
      return "hit";
    }
    this.misses++;
    if (this.window.size < this.capacity) {
      this.window.set(key, 1);
      this.admitted.push(key);
      return "miss-admit";
    }
    const victim = this.lruVictim();
    if (!useAdmission) {
      this.evict(victim);
      this.window.set(key, 1);
      this.admitted.push(key);
      return "miss-admit";
    }
    const newFreq = this.cms.getCount(key);
    const victimFreq = this.cms.getCount(victim);
    if (newFreq > victimFreq) {
      this.evict(victim);
      this.window.set(key, 1);
      this.admitted.push(key);
      return "miss-admit";
    }
    this.rejected.push(key);
    return "miss-reject";
  }
}

export function replayTrace(
  trace: readonly string[],
  capacity: number,
  useAdmission: boolean
): TinyLFUCache {
  const cache = new TinyLFUCache(capacity);
  for (const key of trace) {
    cache.access(key, useAdmission);
  }
  return cache;
}

/** One-shot keys after filling cache — classic scan pollution */
export const CACHE_SCAN_TRACE = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "a",
  "b",
  "a",
  "b",
  "a",
  "b",
  "a",
  "b",
] as const;

/** Hot key vs many cold one-timers */
export const HOT_COLD_TRACE = [
  "hot",
  "hot",
  "hot",
  "warm",
  "warm",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "hot",
  "hot",
  "warm",
  "warm",
  "c9",
  "c10",
  "c11",
  "c12",
  "hot",
  "hot",
  "hot",
  "warm",
  "warm",
  "hot",
  "hot",
] as const;

export const DEMO_TRACE = CACHE_SCAN_TRACE;
