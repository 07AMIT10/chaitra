/** G-Counter, OR-Set, and probabilistic tombstone CRDT helpers */

import { bloomMaybeContains, buildBitArray } from "./bloom-sim";

export type GCounter = Map<string, number>;

export function emptyCounter(replicas: string[]): GCounter {
  return new Map(replicas.map((r) => [r, 0]));
}

export function increment(counter: GCounter, replica: string): GCounter {
  const next = new Map(counter);
  next.set(replica, (next.get(replica) ?? 0) + 1);
  return next;
}

/** Correct state-based G-Counter merge: componentwise max (join ⊔) */
export function mergeCounters(a: GCounter, b: GCounter): GCounter {
  const keys = new Set([...a.keys(), ...b.keys()]);
  const merged = new Map<string, number>();
  for (const k of keys) {
    merged.set(k, Math.max(a.get(k) ?? 0, b.get(k) ?? 0));
  }
  return merged;
}

/** Wrong merge: sums per-replica counts — double-counts partitioned updates */
export function naiveSumMerge(a: GCounter, b: GCounter): GCounter {
  const keys = new Set([...a.keys(), ...b.keys()]);
  const merged = new Map<string, number>();
  for (const k of keys) {
    merged.set(k, (a.get(k) ?? 0) + (b.get(k) ?? 0));
  }
  return merged;
}

export function counterValue(c: GCounter): number {
  let sum = 0;
  for (const v of c.values()) sum += v;
  return sum;
}

export type LWWRegister = { value: number; ts: number };

export function lwwWrite(_prev: LWWRegister, value: number, ts: number): LWWRegister {
  return { value, ts };
}

export function lwwMerge(a: LWWRegister, b: LWWRegister): LWWRegister {
  if (a.ts === b.ts) return a.value >= b.value ? a : b;
  return a.ts > b.ts ? a : b;
}

export type ORSet = Map<string, Set<string>>;

export function orSetAdd(set: ORSet, tag: string, element: string): ORSet {
  const next = new Map(set);
  const tags = new Set(next.get(element) ?? []);
  tags.add(tag);
  next.set(element, tags);
  return next;
}

export function orSetRemove(set: ORSet, tag: string, element: string): ORSet {
  const next = new Map(set);
  const tags = new Set(next.get(element) ?? []);
  tags.delete(tag);
  if (tags.size === 0) next.delete(element);
  else next.set(element, tags);
  return next;
}

export function orSetMerge(a: ORSet, b: ORSet): ORSet {
  const elements = new Set([...a.keys(), ...b.keys()]);
  const merged: ORSet = new Map();
  for (const el of elements) {
    const tags = new Set([...(a.get(el) ?? []), ...(b.get(el) ?? [])]);
    if (tags.size > 0) merged.set(el, tags);
  }
  return merged;
}

export function orSetElements(set: ORSet): string[] {
  return [...set.keys()].sort();
}

export const REPLICAS = ["Node_A", "Node_B", "Node_C"] as const;

export const PROB_BLOOM_M = 64;
export const PROB_BLOOM_K = 3;

export type ProbCompactionState = {
  live: ORSet;
  /** Exact tombstones kept for strong semantics */
  tombstones: Set<string>;
  /** Probabilistic tombstone bloom over deleted element ids */
  deletedBloom: Uint8Array;
};

export function emptyProbState(): ProbCompactionState {
  return {
    live: new Map(),
    tombstones: new Set(),
    deletedBloom: new Uint8Array(PROB_BLOOM_M),
  };
}

function bloomKeysFromTombstones(tombstones: Iterable<string>): string[] {
  return [...tombstones].map((el) => `del:${el}`);
}

export function rebuildDeletedBloom(tombstones: Set<string>): Uint8Array {
  return buildBitArray(bloomKeysFromTombstones(tombstones), PROB_BLOOM_K, PROB_BLOOM_M);
}

export function probDelete(state: ProbCompactionState, element: string): ProbCompactionState {
  const tombstones = new Set(state.tombstones);
  tombstones.add(element);
  const live = new Map(state.live);
  live.delete(element);
  return {
    live,
    tombstones,
    deletedBloom: rebuildDeletedBloom(tombstones),
  };
}

export function probMaybeDeleted(state: ProbCompactionState, element: string): boolean {
  if (state.tombstones.has(element)) return true;
  const { present } = bloomMaybeContains(
    state.deletedBloom,
    `del:${element}`,
    PROB_BLOOM_K,
    PROB_BLOOM_M
  );
  return present;
}

/** Apply add; returns null if probabilistic tombstone rejects (false positive possible) */
export function probTryAdd(
  state: ProbCompactionState,
  tag: string,
  element: string
): { state: ProbCompactionState; rejected: boolean; falsePositive: boolean } {
  if (probMaybeDeleted(state, element)) {
    const falsePositive = !state.tombstones.has(element);
    return { state, rejected: true, falsePositive };
  }
  return {
    state: { ...state, live: orSetAdd(state.live, tag, element) },
    rejected: false,
    falsePositive: false,
  };
}

export function probCompact(state: ProbCompactionState): ProbCompactionState {
  return {
    live: new Map(state.live),
    tombstones: new Set(),
    deletedBloom: rebuildDeletedBloom(new Set()),
  };
}

/** Preset: concurrent increments on different replicas */
export function presetConcurrentIncrements(): { a: GCounter; b: GCounter } {
  let a = emptyCounter([...REPLICAS]);
  let b = emptyCounter([...REPLICAS]);
  a = increment(increment(a, "Node_A"), "Node_A");
  b = increment(increment(increment(b, "Node_B"), "Node_B"), "Node_B");
  b = increment(b, "Node_C");
  return { a, b };
}

/** Preset: partition — both incremented same replica while split */
export function presetPartitionHeal(): { a: GCounter; b: GCounter } {
  let a = emptyCounter([...REPLICAS]);
  let b = emptyCounter([...REPLICAS]);
  for (let i = 0; i < 3; i++) {
    a = increment(a, "Node_A");
    b = increment(b, "Node_A");
  }
  return { a, b };
}

/** Preset: LWW conflict — B wins on timestamp */
export function presetLwwConflict(): { a: LWWRegister; b: LWWRegister } {
  return {
    a: { value: 10, ts: 100 },
    b: { value: 7, ts: 200 },
  };
}

/** Preset: delete with bloom, then stale add arrives */
export function presetCompactionStaleAdd(): ProbCompactionState {
  let s = emptyProbState();
  s = { ...s, live: orSetAdd(s.live, "tag_a", "Banana") };
  s = probDelete(s, "Banana");
  return s;
}
