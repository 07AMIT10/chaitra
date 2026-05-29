import { hllItemHash } from "./sketches/hash";
import { alphaM } from "./hll-math";
import type { StreamEvent } from "./sketches/types";

function leadingZeros(val: number, maxBits: number): number {
  const binary = val.toString(2).padStart(maxBits, "0");
  let count = 0;
  for (const bit of binary) {
    if (bit === "0") count++;
    else break;
  }
  return count + 1;
}

/** HyperLogLog — parity with hyperloglog.py */
export class HyperLogLog {
  readonly b: number;
  readonly m: number;
  registers: number[];

  constructor(b = 8) {
    this.b = b;
    this.m = 1 << b;
    this.registers = Array(this.m).fill(0);
  }

  add(item: string): void {
    const h = hllItemHash(item);
    const bucketIndex = h >>> (32 - this.b);
    const mask = (1 << (32 - this.b)) - 1;
    const remaining = h & mask;
    const lz = leadingZeros(remaining, 32 - this.b);
    this.registers[bucketIndex] = Math.max(this.registers[bucketIndex], lz);
  }

  count(): number {
    const z = this.registers.reduce((sum, val) => sum + 2 ** -val, 0);
    const alpha = alphaM(this.m);
    let estimate = (alpha * this.m ** 2) / z;
    if (estimate <= 2.5 * this.m) {
      const zeros = this.registers.filter((r) => r === 0).length;
      if (zeros > 0) estimate = this.m * Math.log(this.m / zeros);
    }
    return Math.round(estimate);
  }

  ingest(events: Iterable<StreamEvent>): void {
    for (const { key } of events) this.add(key);
  }

  zeroRegisters(): number {
    return this.registers.filter((r) => r === 0).length;
  }
}

export function exactDistinct(events: Iterable<StreamEvent>): number {
  return new Set([...events].map((e) => e.key)).size;
}
