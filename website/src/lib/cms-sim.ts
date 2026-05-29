import { cmsColumnIndex } from "./sketches/hash";
import { cmsDimensions } from "./cms-math";
import type { StreamEvent } from "./sketches/types";

/** Count-Min Sketch — parity with count_min_sketch.py */
export class CountMinSketch {
  readonly width: number;
  readonly depth: number;
  readonly table: number[][];

  constructor(epsilon = 0.01, delta = 0.05) {
    const { width, depth } = cmsDimensions(epsilon, delta);
    this.width = width;
    this.depth = depth;
    this.table = Array.from({ length: depth }, () => Array(width).fill(0));
  }

  add(item: string, count = 1): void {
    for (let i = 0; i < this.depth; i++) {
      const col = cmsColumnIndex(item, i, this.width);
      this.table[i][col] += count;
    }
  }

  getCount(item: string): number {
    let min = Infinity;
    for (let i = 0; i < this.depth; i++) {
      const col = cmsColumnIndex(item, i, this.width);
      min = Math.min(min, this.table[i][col]);
    }
    return min === Infinity ? 0 : min;
  }

  ingest(events: Iterable<StreamEvent>): void {
    for (const { key, count = 1 } of events) {
      this.add(key, count);
    }
  }

  maxCell(): number {
    let max = 0;
    for (const row of this.table) {
      for (const v of row) max = Math.max(max, v);
    }
    return max;
  }
}
