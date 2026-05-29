import { md5KeyHash } from "./sketches/hash";
import type { RingAssignment } from "./sketches/types";

/** Consistent hash ring — parity with consistent_hashing.py */
export class ConsistentHashRing {
  replicas: number;
  ring: number[];
  nodes: Map<number, string>;

  constructor(replicas = 3) {
    this.replicas = replicas;
    this.ring = [];
    this.nodes = new Map();
  }

  addNode(name: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const vnode = `${name}_${i}`;
      const pos = md5KeyHash(vnode);
      this.ring.push(pos);
      this.nodes.set(pos, name);
    }
    this.ring.sort((a, b) => a - b);
  }

  removeNode(name: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const pos = md5KeyHash(`${name}_${i}`);
      const idx = this.ring.indexOf(pos);
      if (idx >= 0) this.ring.splice(idx, 1);
      this.nodes.delete(pos);
    }
  }

  getNode(key: string): string | null {
    if (this.ring.length === 0) return null;
    const pos = md5KeyHash(key);
    let idx = this.ring.findIndex((p) => p > pos);
    if (idx === -1) idx = 0;
    return this.nodes.get(this.ring[idx]) ?? null;
  }

  assignKeys(keys: string[]): RingAssignment[] {
    return keys.map((key) => ({
      key,
      node: this.getNode(key),
      hash: md5KeyHash(key),
    }));
  }

  remapCount(before: ConsistentHashRing, keys: string[]): { moved: number; stayed: number } {
    let moved = 0;
    let stayed = 0;
    for (const key of keys) {
      const a = before.getNode(key);
      const b = this.getNode(key);
      if (a === b) stayed++;
      else moved++;
    }
    return { moved, stayed };
  }
}

export const DEMO_KEYS = ["user123", "user456", "image.png", "dataset.json", "session_abc", "cache_key_7"];

export const DEMO_SERVERS = ["Server_A", "Server_B", "Server_C"];
