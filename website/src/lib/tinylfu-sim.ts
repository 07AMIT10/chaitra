import { CountMinSketch } from "./cms-sim";

export type CacheEntry = { key: string; freq: number };

/** TinyLFU admission with CMS frequency estimate — simplified from README pattern */
export class TinyLFUCache {
  capacity: number;
  window: Map<string, number>;
  cms: CountMinSketch;
  admitted: string[];
  rejected: string[];

  constructor(capacity = 8) {
    this.capacity = capacity;
    this.window = new Map();
    this.cms = new CountMinSketch(0.05, 0.1);
    this.admitted = [];
    this.rejected = [];
  }

  reset(): void {
    this.window.clear();
    this.cms = new CountMinSketch(0.05, 0.1);
    this.admitted = [];
    this.rejected = [];
  }

  access(key: string, useAdmission = true): "hit" | "miss-admit" | "miss-reject" {
    this.cms.add(key);
    const freq = this.cms.getCount(key);
    if (this.window.has(key)) {
      this.window.set(key, (this.window.get(key) ?? 0) + 1);
      return "hit";
    }
    if (this.window.size < this.capacity) {
      this.window.set(key, 1);
      this.admitted.push(key);
      return "miss-admit";
    }
    if (!useAdmission) {
      const victim = [...this.window.keys()][0];
      this.window.delete(victim!);
      this.window.set(key, 1);
      this.admitted.push(key);
      return "miss-admit";
    }
    const minFreq = Math.min(...[...this.window.entries()].map(([, v]) => v));
    const minKey = [...this.window.entries()].find(([, v]) => v === minFreq)?.[0];
    if (minKey && freq > this.cms.getCount(minKey)) {
      this.window.delete(minKey);
      this.window.set(key, 1);
      this.admitted.push(key);
      return "miss-admit";
    }
    this.rejected.push(key);
    return "miss-reject";
  }
}

export const DEMO_TRACE = [
  "a", "b", "c", "d", "e", "f", "g", "h",
  "a", "b", "i", "j", "a", "k", "l", "m",
  "a", "b", "c", "n", "o", "p", "a", "q",
];
