/** G-Counter CRDT merge — simplified from CRDTS_PLUS_PROBABILITY README */

export type GCounter = Map<string, number>;

export function emptyCounter(replicas: string[]): GCounter {
  return new Map(replicas.map((r) => [r, 0]));
}

export function increment(counter: GCounter, replica: string): GCounter {
  const next = new Map(counter);
  next.set(replica, (next.get(replica) ?? 0) + 1);
  return next;
}

export function mergeCounters(a: GCounter, b: GCounter): GCounter {
  const keys = new Set([...a.keys(), ...b.keys()]);
  const merged = new Map<string, number>();
  for (const k of keys) {
    merged.set(k, Math.max(a.get(k) ?? 0, b.get(k) ?? 0));
  }
  return merged;
}

export function counterValue(c: GCounter): number {
  let sum = 0;
  for (const v of c.values()) sum += v;
  return sum;
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

export const REPLICAS = ["Node_A", "Node_B", "Node_C"];
