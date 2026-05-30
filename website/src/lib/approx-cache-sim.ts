import {
  expectedAbsentLookupCost,
  falsePositiveFromBitsPerItem,
  hitRatio,
} from "./approx-cache-math";
import { CountMinSketch } from "./cms-sim";
import { CACHE_SCAN_TRACE } from "./tinylfu-sim";

export type LsmLookupSummary = {
  sstCount: number;
  bloomFpr: number;
  bitsPerItem: number;
  naiveCost: number;
  bloomCost: number;
  savingsPct: number;
  expectedFpReads: number;
};

/** Absent-key lookup across stacked SSTables with per-file Bloom filters */
export function simulateAbsentLsmLookup(
  sstCount: number,
  bitsPerItem: number,
  ramMicros = 1,
  diskMicros = 10_000
): LsmLookupSummary {
  const bloomFpr = falsePositiveFromBitsPerItem(bitsPerItem);
  const perTableNaive = ramMicros + diskMicros;
  const perTableBloom = expectedAbsentLookupCost(ramMicros, diskMicros, bloomFpr);
  const naiveCost = sstCount * perTableNaive;
  const bloomCost = sstCount * perTableBloom;
  const savingsPct =
    naiveCost > 0 ? ((naiveCost - bloomCost) / naiveCost) * 100 : 0;
  return {
    sstCount,
    bloomFpr,
    bitsPerItem,
    naiveCost,
    bloomCost,
    savingsPct,
    expectedFpReads: sstCount * bloomFpr,
  };
}

export type CacheAdmissionSummary = {
  hits: number;
  misses: number;
  rejected: number;
  accesses: number;
};

/** Oracle exact-frequency admission on LRU window */
export class ExactFrequencyCache {
  capacity: number;
  window: Map<string, number>;
  counts: Map<string, number>;
  hits = 0;
  misses = 0;
  rejected: string[] = [];

  constructor(capacity: number) {
    this.capacity = capacity;
    this.window = new Map();
    this.counts = new Map();
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

  access(key: string): "hit" | "miss-admit" | "miss-reject" {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    if (this.window.has(key)) {
      this.touch(key);
      this.hits++;
      return "hit";
    }
    this.misses++;
    if (this.window.size < this.capacity) {
      this.window.set(key, 1);
      return "miss-admit";
    }
    const victim = this.lruVictim();
    const newFreq = this.counts.get(key) ?? 0;
    const victimFreq = this.counts.get(victim) ?? 0;
    if (newFreq > victimFreq) {
      this.window.delete(victim);
      this.window.set(key, 1);
      return "miss-admit";
    }
    this.rejected.push(key);
    return "miss-reject";
  }

  summary(accesses: number): CacheAdmissionSummary {
    return {
      hits: this.hits,
      misses: this.misses,
      rejected: this.rejected.length,
      accesses,
    };
  }
}

/** CMS-backed admission — same policy as TinyLFU, tunable ε */
export class SketchAdmissionCache {
  capacity: number;
  window: Map<string, number>;
  cms: CountMinSketch;
  hits = 0;
  misses = 0;
  rejected: string[] = [];

  constructor(capacity: number, cmsEpsilon: number) {
    this.capacity = capacity;
    this.window = new Map();
    this.cms = new CountMinSketch(cmsEpsilon, 0.05);
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

  access(key: string): "hit" | "miss-admit" | "miss-reject" {
    this.cms.add(key);
    if (this.window.has(key)) {
      this.touch(key);
      this.hits++;
      return "hit";
    }
    this.misses++;
    if (this.window.size < this.capacity) {
      this.window.set(key, 1);
      return "miss-admit";
    }
    const victim = this.lruVictim();
    const newFreq = this.cms.getCount(key);
    const victimFreq = this.cms.getCount(victim);
    if (newFreq > victimFreq) {
      this.window.delete(victim);
      this.window.set(key, 1);
      return "miss-admit";
    }
    this.rejected.push(key);
    return "miss-reject";
  }

  summary(accesses: number): CacheAdmissionSummary {
    return {
      hits: this.hits,
      misses: this.misses,
      rejected: this.rejected.length,
      accesses,
    };
  }
}

export function replayAdmissionCompare(
  trace: readonly string[],
  capacity: number,
  cmsEpsilon: number
): { exact: CacheAdmissionSummary; sketch: CacheAdmissionSummary } {
  const exactCache = new ExactFrequencyCache(capacity);
  const sketchCache = new SketchAdmissionCache(capacity, cmsEpsilon);
  for (const key of trace) {
    exactCache.access(key);
    sketchCache.access(key);
  }
  const n = trace.length;
  return {
    exact: exactCache.summary(n),
    sketch: sketchCache.summary(n),
  };
}

export function compareAdmissionModes(
  trace: readonly string[],
  capacity: number,
  cmsEpsilon: number
) {
  const { exact, sketch } = replayAdmissionCompare(trace, capacity, cmsEpsilon);
  return {
    exact,
    sketch,
    exactRatio: hitRatio(exact.hits, exact.accesses),
    sketchRatio: hitRatio(sketch.hits, sketch.accesses),
    deltaHits: sketch.hits - exact.hits,
  };
}

export const LSM_SWEET_SPOT_PRESET = {
  sstCount: 8,
  bitsPerItem: 10,
  cmsEpsilon: 0.02,
  capacity: 8,
};

export const LSM_WASTED_FP_PRESET = {
  sstCount: 12,
  bitsPerItem: 4,
  cmsEpsilon: 0.02,
  capacity: 8,
};

export const CACHE_TIGHT_CMS_PRESET = {
  sstCount: 6,
  bitsPerItem: 10,
  cmsEpsilon: 0.01,
  capacity: 8,
};

export const CACHE_LOOSE_CMS_PRESET = {
  sstCount: 6,
  bitsPerItem: 10,
  cmsEpsilon: 0.12,
  capacity: 6,
};

export { CACHE_SCAN_TRACE };
