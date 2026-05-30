/**
 * Toy MapReduce word-count job: map → shuffle → reduce with optional straggler backup.
 * Mirrors the README ASCII example (3 shards, keys A/B/C).
 */

import { backupSpeedup } from "./mapreduce-math";

export const DEMO_SHARDS: string[][] = [
  ["A", "B", "A", "C"],
  ["B", "C", "B", "A"],
  ["C", "C", "A", "B"],
];

export const REDUCE_KEYS = ["A", "B", "C"] as const;

export type MapReduceConfig = {
  mapTasks: number;
  stragglerIndex: number | null;
  withBackup: boolean;
  /** Straggler progress per tick vs 1.0 for healthy workers */
  stragglerRate?: number;
};

export type WorkerStatus =
  | "idle"
  | "mapping"
  | "done"
  | "straggler"
  | "backup"
  | "killed";

export type MapWorker = {
  id: number;
  label: string;
  progress: number;
  status: WorkerStatus;
  shardPreview: string;
};

export type JobSnapshot = {
  tick: number;
  phase: "map" | "shuffle" | "reduce" | "complete";
  mapWorkers: MapWorker[];
  shufflePct: number;
  reduceWorkers: { key: string; progress: number; sum: number; target: number }[];
  statusNote: string;
};

export type JobTiming = {
  mapUnits: number;
  shuffleUnits: number;
  reduceUnits: number;
  totalUnits: number;
};

const FAST_MAP = 3;
const SHUFFLE_UNITS = 4;
const REDUCE_UNITS = 2;
const BACKUP_START = 4;

export function mapShard(shard: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const k of shard) counts[k] = (counts[k] ?? 0) + 1;
  return counts;
}

export function reduceGrouped(grouped: Record<string, number[]>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, vals] of Object.entries(grouped)) {
    out[k] = vals.reduce((a, b) => a + b, 0);
  }
  return out;
}

function shardForTask(taskId: number): string[] {
  return DEMO_SHARDS[taskId % DEMO_SHARDS.length] ?? ["A"];
}

function shardLabel(shard: string[]): string {
  return shard.join("");
}

export function jobTiming(config: MapReduceConfig): JobTiming {
  const rate = config.stragglerRate ?? 0.12;
  const stragglerUnits =
    config.stragglerIndex !== null ? Math.ceil(FAST_MAP / rate) : FAST_MAP;
  const mapUnits = config.withBackup && config.stragglerIndex !== null
    ? Math.max(FAST_MAP, BACKUP_START + FAST_MAP)
    : config.stragglerIndex !== null
      ? stragglerUnits
      : FAST_MAP;
  const shuffleUnits = SHUFFLE_UNITS;
  const reduceUnits = REDUCE_UNITS;
  return {
    mapUnits,
    shuffleUnits,
    reduceUnits,
    totalUnits: mapUnits + shuffleUnits + reduceUnits,
  };
}

export function compareMapPhase(config: Omit<MapReduceConfig, "withBackup">): {
  withoutBackup: number;
  withBackup: number;
  speedup: number;
} {
  const withoutBackup = jobTiming({ ...config, withBackup: false }).mapUnits;
  const withBackup = jobTiming({ ...config, withBackup: true }).mapUnits;
  return {
    withoutBackup,
    withBackup,
    speedup: backupSpeedup(withoutBackup, withBackup),
  };
}

export function buildJobTimeline(config: MapReduceConfig): JobSnapshot[] {
  const { mapTasks, stragglerIndex, withBackup } = config;
  const stragglerRate = config.stragglerRate ?? 0.12;
  const snapshots: JobSnapshot[] = [];

  const progress = Array.from({ length: mapTasks }, () => 0);
  const status: WorkerStatus[] = Array.from({ length: mapTasks }, () => "mapping");
  let backupActive = false;
  let backupProgress = 0;
  let mapDone = false;
  let tick = 0;
  const maxTicks = 80;

  const makeMapWorkers = (): MapWorker[] => {
    const workers = Array.from({ length: mapTasks }, (_, id) => {
      const shard = shardForTask(id);
      let st: WorkerStatus = status[id] ?? "mapping";
      if (id === stragglerIndex && progress[id] < FAST_MAP && progress[id] > 0) {
        st = backupActive && backupProgress >= FAST_MAP ? "killed" : "straggler";
      }
      return {
        id,
        label: `M${id + 1}`,
        progress: Math.min(1, progress[id] / FAST_MAP),
        status: st,
        shardPreview: shardLabel(shard),
      };
    });
    if (backupActive) {
      workers.push({
        id: mapTasks,
        label: "B↑",
        progress: Math.min(1, backupProgress / FAST_MAP),
        status: backupProgress >= FAST_MAP ? "done" : "backup",
        shardPreview: shardLabel(shardForTask(stragglerIndex ?? 0)),
      });
    }
    return workers;
  };

  while (!mapDone && tick < maxTicks) {
    tick++;
    for (let i = 0; i < mapTasks; i++) {
      if (progress[i] >= FAST_MAP) {
        status[i] = "done";
        continue;
      }
      const inc = i === stragglerIndex ? stragglerRate : 1;
      progress[i] = Math.min(FAST_MAP, progress[i] + inc);
      if (progress[i] >= FAST_MAP) status[i] = "done";
    }

    if (
      withBackup &&
      stragglerIndex !== null &&
      progress[stragglerIndex] < FAST_MAP &&
      tick >= BACKUP_START
    ) {
      backupActive = true;
      backupProgress = Math.min(FAST_MAP, backupProgress + 1);
    }

    const allPrimaryDone = progress.every((p) => p >= FAST_MAP);
    const backupWins =
      backupActive && backupProgress >= FAST_MAP && stragglerIndex !== null;
    mapDone = allPrimaryDone || backupWins;

    snapshots.push({
      tick,
      phase: "map",
      mapWorkers: makeMapWorkers(),
      shufflePct: 0,
      reduceWorkers: REDUCE_KEYS.map((key) => ({
        key,
        progress: 0,
        sum: 0,
        target: 0,
      })),
      statusNote: backupActive
        ? `Backup task on shard M${stragglerIndex! + 1} — first finish wins`
        : stragglerIndex !== null
          ? `Straggler M${stragglerIndex + 1} at ${(stragglerRate * 100).toFixed(0)}% speed`
          : "Map tasks running in parallel",
    });
  }

  const mapOutputs = Array.from({ length: mapTasks }, (_, i) => mapShard(shardForTask(i)));
  const grouped: Record<string, number[]> = {};
  for (const key of REDUCE_KEYS) {
    grouped[key] = mapOutputs.map((m) => m[key] ?? 0);
  }
  const finalCounts = reduceGrouped(grouped);

  for (let s = 1; s <= SHUFFLE_UNITS; s++) {
    tick++;
    snapshots.push({
      tick,
      phase: "shuffle",
      mapWorkers: makeMapWorkers().map((w) => ({ ...w, status: "done" as WorkerStatus, progress: 1 })),
      shufflePct: s / SHUFFLE_UNITS,
      reduceWorkers: REDUCE_KEYS.map((key) => ({
        key,
        progress: 0,
        sum: 0,
        target: finalCounts[key] ?? 0,
      })),
      statusNote: `Shuffle: routing intermediate keys to reducers (${Math.round((s / SHUFFLE_UNITS) * 100)}%)`,
    });
  }

  for (let r = 1; r <= REDUCE_UNITS; r++) {
    tick++;
    snapshots.push({
      tick,
      phase: r === REDUCE_UNITS ? "complete" : "reduce",
      mapWorkers: makeMapWorkers().map((w) => ({ ...w, status: "done" as WorkerStatus, progress: 1 })),
      shufflePct: 1,
      reduceWorkers: REDUCE_KEYS.map((key) => ({
        key,
        progress: r / REDUCE_UNITS,
        sum: Math.round((finalCounts[key] ?? 0) * (r / REDUCE_UNITS)),
        target: finalCounts[key] ?? 0,
      })),
      statusNote:
        r === REDUCE_UNITS
          ? `Job complete — ${REDUCE_KEYS.map((k) => `${k}=${finalCounts[k]}`).join(", ")}`
          : "Reduce: aggregating grouped values per key",
    });
  }

  return snapshots;
}

export function snapshotAtStep(timeline: JobSnapshot[], step: number): JobSnapshot {
  if (timeline.length === 0) {
    return {
      tick: 0,
      phase: "map",
      mapWorkers: [],
      shufflePct: 0,
      reduceWorkers: [],
      statusNote: "",
    };
  }
  const idx = Math.max(0, Math.min(timeline.length - 1, step));
  return timeline[idx]!;
}

export const STRAGGLER_RETRY_PRESET: MapReduceConfig = {
  mapTasks: 3,
  stragglerIndex: 2,
  withBackup: true,
};

export const HEALTHY_CLUSTER_PRESET: MapReduceConfig = {
  mapTasks: 4,
  stragglerIndex: null,
  withBackup: false,
};

export const STRAGGLER_NO_BACKUP_PRESET: MapReduceConfig = {
  mapTasks: 3,
  stragglerIndex: 2,
  withBackup: false,
};
