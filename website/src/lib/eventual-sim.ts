/**
 * Eventually consistent replica timeline: W=1 writes, async replication, stale reads.
 * Version-vector merge for concurrent writes (README shopping-cart + vector clocks).
 */

import { versionVectorMerge, type VersionVector } from "./eventual-math";

export type ReplicaSnapshot = {
  id: string;
  value: number | null;
  vector: VersionVector;
};

export type ReadEvent = {
  from: string;
  value: number | null;
  stale: boolean;
  authoritative: number;
};

export type TimelineFrame = {
  tick: number;
  label: string;
  replicas: ReplicaSnapshot[];
  inFlight: { from: string; to: string }[];
  lastRead?: ReadEvent;
  mergedVector?: VersionVector;
  converged: boolean;
};

export type EventualPresetId = "amazon-cart" | "concurrent-writes" | "slow-replication";

export const AMAZON_CART_PRESET: { id: EventualPresetId; n: number; lambda: number } = {
  id: "amazon-cart",
  n: 3,
  lambda: 8,
};

export const CONCURRENT_WRITES_PRESET: { id: EventualPresetId; n: number; lambda: number } = {
  id: "concurrent-writes",
  n: 2,
  lambda: 6,
};

export const SLOW_REPLICATION_PRESET: { id: EventualPresetId; n: number; lambda: number } = {
  id: "slow-replication",
  n: 4,
  lambda: 0.8,
};

function replica(id: string, value: number | null, vector: VersionVector): ReplicaSnapshot {
  return { id, value, vector };
}

function frame(
  tick: number,
  label: string,
  replicas: ReplicaSnapshot[],
  opts: Partial<Omit<TimelineFrame, "tick" | "label" | "replicas">> = {}
): TimelineFrame {
  const mergedVector = replicas.reduce(
    (acc, r) => versionVectorMerge(acc, r.vector),
    {} as VersionVector
  );
  const values = replicas.map((r) => r.value);
  const vectors = replicas.map((r) => r.vector);
  const sameValue = values.every((v) => v === values[0] && v !== null);
  const sameVec = vectors.every(
    (v) => JSON.stringify(v) === JSON.stringify(mergedVector) && Object.keys(v).length > 0
  );
  return {
    tick,
    label,
    replicas,
    inFlight: opts.inFlight ?? [],
    lastRead: opts.lastRead,
    mergedVector: opts.mergedVector ?? mergedVector,
    converged: opts.converged ?? (sameValue && sameVec),
  };
}

/** Write X=5 to primary A; stale read on C; then replication and convergence. */
export function buildAmazonCartTimeline(): TimelineFrame[] {
  return [
    frame(0, "Initial — all replicas agree on balance 0", [
      replica("A", 0, {}),
      replica("B", 0, {}),
      replica("C", 0, {}),
    ]),
    frame(
      1,
      "Client writes X=5 to A (W=1) — success returned immediately",
      [replica("A", 5, { A: 1 }), replica("B", 0, {}), replica("C", 0, {})],
      { inFlight: [{ from: "A", to: "B" }, { from: "A", to: "C" }] }
    ),
    frame(
      2,
      "Client reads from C — replication not arrived (stale read)",
      [replica("A", 5, { A: 1 }), replica("B", 0, {}), replica("C", 0, {})],
      {
        inFlight: [{ from: "A", to: "B" }, { from: "A", to: "C" }],
        lastRead: { from: "C", value: 0, stale: true, authoritative: 5 },
      }
    ),
    frame(3, "Async replication reaches B", [
      replica("A", 5, { A: 1 }),
      replica("B", 5, { A: 1 }),
      replica("C", 0, {}),
    ], { inFlight: [{ from: "A", to: "C" }] }),
    frame(4, "Replication completes on C", [
      replica("A", 5, { A: 1 }),
      replica("B", 5, { A: 1 }),
      replica("C", 5, { A: 1 }),
    ]),
    frame(
      5,
      "Read from C after convergence — returns X=5",
      [
        replica("A", 5, { A: 1 }),
        replica("B", 5, { A: 1 }),
        replica("C", 5, { A: 1 }),
      ],
      {
        lastRead: { from: "C", value: 5, stale: false, authoritative: 5 },
        converged: true,
      }
    ),
  ];
}

/** Concurrent writes on A and B; max-merge vectors; LWW on value by higher sum. */
export function buildConcurrentWritesTimeline(): TimelineFrame[] {
  return [
    frame(0, "Both replicas start at 0", [replica("A", 0, {}), replica("B", 0, {})]),
    frame(1, "A writes 10 — vector {A:1}", [
      replica("A", 10, { A: 1 }),
      replica("B", 0, {}),
    ], { inFlight: [{ from: "A", to: "B" }] }),
    frame(
      2,
      "B writes 20 before hearing A — concurrent {B:1}",
      [replica("A", 10, { A: 1 }), replica("B", 20, { B: 1 })],
      { inFlight: [{ from: "A", to: "B" }, { from: "B", to: "A" }] }
    ),
    frame(
      3,
      "Stale read on B still shows 20 while A has 10",
      [replica("A", 10, { A: 1 }), replica("B", 20, { B: 1 })],
      {
        lastRead: { from: "B", value: 20, stale: true, authoritative: 10 },
      }
    ),
    frame(4, "Gossip exchanges vectors — merge {A:1,B:1}", [
      replica("A", 10, { A: 1, B: 1 }),
      replica("B", 20, { A: 1, B: 1 }),
    ]),
    frame(
      5,
      "Max-merge complete — both replicas share merged vector (value reconciled)",
      [
        replica("A", 20, { A: 1, B: 1 }),
        replica("B", 20, { A: 1, B: 1 }),
      ],
      {
        mergedVector: { A: 1, B: 1 },
        lastRead: { from: "A", value: 20, stale: false, authoritative: 20 },
        converged: true,
      }
    ),
  ];
}

/** Four replicas; long in-flight replication; elevated P(stale). */
export function buildSlowReplicationTimeline(): TimelineFrame[] {
  return [
    frame(0, "Four replicas — cart empty", [
      replica("A", 0, {}),
      replica("B", 0, {}),
      replica("C", 0, {}),
      replica("D", 0, {}),
    ]),
    frame(
      1,
      "Add item on A (W=1) — only A updated",
      [
        replica("A", 1, { A: 1 }),
        replica("B", 0, {}),
        replica("C", 0, {}),
        replica("D", 0, {}),
      ],
      {
        inFlight: [
          { from: "A", to: "B" },
          { from: "A", to: "C" },
          { from: "A", to: "D" },
        ],
      }
    ),
    frame(
      2,
      "Refresh hits D — empty cart (stale)",
      [
        replica("A", 1, { A: 1 }),
        replica("B", 0, {}),
        replica("C", 0, {}),
        replica("D", 0, {}),
      ],
      {
        inFlight: [
          { from: "A", to: "B" },
          { from: "A", to: "C" },
          { from: "A", to: "D" },
        ],
        lastRead: { from: "D", value: 0, stale: true, authoritative: 1 },
      }
    ),
    frame(3, "Slow gossip — B catches up", [
      replica("A", 1, { A: 1 }),
      replica("B", 1, { A: 1 }),
      replica("C", 0, {}),
      replica("D", 0, {}),
    ], { inFlight: [{ from: "A", to: "C" }, { from: "A", to: "D" }] }),
    frame(4, "C updated; D still stale", [
      replica("A", 1, { A: 1 }),
      replica("B", 1, { A: 1 }),
      replica("C", 1, { A: 1 }),
      replica("D", 0, {}),
    ], { inFlight: [{ from: "A", to: "D" }] }),
    frame(
      5,
      "All replicas converged — cart shows item",
      [
        replica("A", 1, { A: 1 }),
        replica("B", 1, { A: 1 }),
        replica("C", 1, { A: 1 }),
        replica("D", 1, { A: 1 }),
      ],
      {
        lastRead: { from: "D", value: 1, stale: false, authoritative: 1 },
        converged: true,
      }
    ),
  ];
}

export function buildTimeline(preset: EventualPresetId): TimelineFrame[] {
  switch (preset) {
    case "amazon-cart":
      return buildAmazonCartTimeline();
    case "concurrent-writes":
      return buildConcurrentWritesTimeline();
    case "slow-replication":
      return buildSlowReplicationTimeline();
    default:
      return buildAmazonCartTimeline();
  }
}

export function snapshotAtStep(timeline: TimelineFrame[], step: number): TimelineFrame {
  const idx = Math.min(Math.max(0, step), timeline.length - 1);
  return timeline[idx]!;
}

export function presetMeta(preset: EventualPresetId): { n: number; lambda: number; label: string } {
  switch (preset) {
    case "amazon-cart":
      return { ...AMAZON_CART_PRESET, label: "Amazon cart (stale refresh)" };
    case "concurrent-writes":
      return { ...CONCURRENT_WRITES_PRESET, label: "Concurrent writes (vector merge)" };
    case "slow-replication":
      return { ...SLOW_REPLICATION_PRESET, label: "Slow replication (N=4)" };
    default:
      return { ...AMAZON_CART_PRESET, label: "Amazon cart" };
  }
}

/** Ground truth: value after full merge (all replicas converged). */
export function authoritativeValue(timeline: TimelineFrame[]): number {
  const last = timeline[timeline.length - 1];
  const vals = last.replicas.map((r) => r.value).filter((v): v is number => v !== null);
  return vals[0] ?? 0;
}
