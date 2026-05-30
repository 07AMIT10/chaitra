/** Partition routing simulation — hash (keyed) vs random (probabilistic) */

import { hashPartition, imbalanceRatio, maxPartitionLag } from "./dist-queues-math";

export type RoutingMode = "hash" | "random";

export type RoutedMessage = {
  seq: number;
  userId: number;
  partition: number;
};

export type PartitionSimResult = {
  loads: number[];
  messages: RoutedMessage[];
  maxLoad: number;
  lag: number;
  imbalance: number;
  userOrderViolations: number;
};

export const HOT_USER_PRESET = { partitions: 8, messages: 320, skew: 9, mode: "hash" as const };
export const CLICKSTREAM_PRESET = {
  partitions: 12,
  messages: 400,
  skew: 2,
  mode: "random" as const,
};
export const BALANCED_HASH_PRESET = {
  partitions: 6,
  messages: 300,
  skew: 2,
  mode: "hash" as const,
};

function makeRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Skewed user picker: higher skew → more traffic to user 0 (hot key). */
export function pickUserId(skew: number, rand: () => number): number {
  if (skew <= 1.5) return Math.floor(rand() * 100);
  const hotProb = Math.min(0.95, 1 - 1 / skew);
  if (rand() < hotProb) return 0;
  return 1 + Math.floor(rand() * 99);
}

export function routePartition(
  userId: number,
  partitions: number,
  mode: RoutingMode,
  rand: () => number
): number {
  if (mode === "hash") return hashPartition(userId, partitions);
  return Math.floor(rand() * partitions);
}

/** Round-robin merge across partitions (parallel consumers). */
export function consumerMergeOrder(
  messages: RoutedMessage[],
  partitions: number
): RoutedMessage[] {
  const byPart: RoutedMessage[][] = Array.from({ length: partitions }, () => []);
  for (const m of messages) byPart[m.partition].push(m);
  const merged: RoutedMessage[] = [];
  const maxLen = Math.max(0, ...byPart.map((p) => p.length));
  for (let i = 0; i < maxLen; i++) {
    for (let p = 0; p < partitions; p++) {
      const msg = byPart[p][i];
      if (msg) merged.push(msg);
    }
  }
  return merged;
}

/** Count adjacent inversions per user in consumption order. */
export function userOrderViolations(merged: RoutedMessage[]): number {
  const byUser = new Map<number, number[]>();
  for (const m of merged) {
    const list = byUser.get(m.userId) ?? [];
    list.push(m.seq);
    byUser.set(m.userId, list);
  }
  let violations = 0;
  for (const seqs of byUser.values()) {
    for (let i = 1; i < seqs.length; i++) {
      if (seqs[i] < seqs[i - 1]) violations++;
    }
  }
  return violations;
}

export function simulateRouting(
  partitions: number,
  messageCount: number,
  skew: number,
  mode: RoutingMode,
  seed = 42
): PartitionSimResult {
  const rand = makeRand(seed);
  const loads = Array(partitions).fill(0);
  const messages: RoutedMessage[] = [];

  for (let seq = 0; seq < messageCount; seq++) {
    const userId = pickUserId(skew, rand);
    const partition = routePartition(userId, partitions, mode, rand);
    loads[partition]++;
    messages.push({ seq, userId, partition });
  }

  const merged = consumerMergeOrder(messages, partitions);
  const violations = userOrderViolations(merged);
  const maxLoad = Math.max(...loads, 0);

  return {
    loads,
    messages,
    maxLoad,
    lag: maxPartitionLag(loads),
    imbalance: imbalanceRatio(loads),
    userOrderViolations: violations,
  };
}

export function compareRoutingModes(
  partitions: number,
  messageCount: number,
  skew: number,
  seed = 42
): { hash: PartitionSimResult; random: PartitionSimResult } {
  return {
    hash: simulateRouting(partitions, messageCount, skew, "hash", seed),
    random: simulateRouting(partitions, messageCount, skew, "random", seed + 1),
  };
}
