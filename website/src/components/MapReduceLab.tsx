import { useEffect, useMemo, useState } from "react";
import {
  expectedMaxExponential,
  formatProbability,
  formatSpeedup,
  formatTimeUnits,
  noFailureProbability,
} from "../lib/mapreduce-math";
import {
  HEALTHY_CLUSTER_PRESET,
  STRAGGLER_NO_BACKUP_PRESET,
  STRAGGLER_RETRY_PRESET,
  buildJobTimeline,
  compareMapPhase,
  jobTiming,
  snapshotAtStep,
  type MapReduceConfig,
} from "../lib/mapreduce-sim";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./MapReduceLab.css";

const CLUSTER_SERVERS = 5000;
const DAILY_FAIL_P = 0.001;

export default function MapReduceLab() {
  const [mapTasks, setMapTasks] = useState(3);
  const [stragglerIndex, setStragglerIndex] = useState(2);
  const [withBackup, setWithBackup] = useState(true);
  const [hasStraggler, setHasStraggler] = useState(true);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const config: MapReduceConfig = useMemo(
    () => ({
      mapTasks,
      stragglerIndex: hasStraggler ? stragglerIndex : null,
      withBackup: hasStraggler && withBackup,
    }),
    [mapTasks, stragglerIndex, withBackup, hasStraggler]
  );

  const timeline = useMemo(() => buildJobTimeline(config), [config]);
  const snap = useMemo(() => snapshotAtStep(timeline, frame), [timeline, frame]);
  const timing = useMemo(() => jobTiming(config), [config]);
  const mapCompare = useMemo(
    () =>
      hasStraggler
        ? compareMapPhase({ mapTasks, stragglerIndex, stragglerRate: config.stragglerRate })
        : null,
    [hasStraggler, mapTasks, stragglerIndex, config.stragglerRate]
  );

  const maxFrame = Math.max(0, timeline.length - 1);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setFrame((f) => {
        if (f >= maxFrame) {
          setIsPlaying(false);
          return maxFrame;
        }
        return f + 1;
      });
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying, maxFrame]);

  const clusterOk = noFailureProbability(DAILY_FAIL_P, CLUSTER_SERVERS);
  const tailMax = expectedMaxExponential(mapTasks);

  const applyStragglerRetry = () => {
    setMapTasks(STRAGGLER_RETRY_PRESET.mapTasks);
    setStragglerIndex(STRAGGLER_RETRY_PRESET.stragglerIndex ?? 2);
    setWithBackup(true);
    setHasStraggler(true);
    setFrame(0);
  };

  const applyHealthy = () => {
    setMapTasks(HEALTHY_CLUSTER_PRESET.mapTasks);
    setHasStraggler(false);
    setWithBackup(false);
    setFrame(0);
  };

  const applyStragglerStall = () => {
    setMapTasks(STRAGGLER_NO_BACKUP_PRESET.mapTasks);
    setStragglerIndex(STRAGGLER_NO_BACKUP_PRESET.stragglerIndex ?? 2);
    setWithBackup(false);
    setHasStraggler(true);
    setFrame(maxFrame > 0 ? Math.min(maxFrame, 12) : 0);
  };

  const stepFrame = () => setFrame((f) => Math.min(maxFrame, f + 1));
  const resetFrame = () => setFrame(0);

  const backupHelps =
    mapCompare !== null && mapCompare.withBackup < mapCompare.withoutBackup * 0.85;

  const metrics: LabMetric[] = [
    { id: "phase", label: "Phase", value: snap.phase },
    { id: "maps", label: "Map tasks", value: String(mapTasks) },
    {
      id: "straggler",
      label: "Straggler",
      value: hasStraggler ? `M${stragglerIndex + 1}` : "none",
      tone: hasStraggler && !withBackup ? "warn" : "default",
    },
    {
      id: "backup",
      label: "Backup tasks",
      value: hasStraggler && withBackup ? "on" : "off",
    },
    {
      id: "map-time",
      label: "Map phase (toy)",
      value: formatTimeUnits(timing.mapUnits),
    },
    {
      id: "total",
      label: "Job total (toy)",
      value: formatTimeUnits(timing.totalUnits),
    },
    {
      id: "cluster",
      label: `P(all OK), N=${CLUSTER_SERVERS}`,
      value: formatProbability(clusterOk),
      tone: clusterOk < 0.02 ? "warn" : "default",
    },
    {
      id: "tail",
      label: `E[max map], N=${mapTasks}`,
      value: formatTimeUnits(tailMax),
    },
  ];
  if (backupHelps && mapCompare) {
    metrics.push({
      id: "aha",
      label: "Backup wins",
      value: `Map phase ${formatSpeedup(mapCompare.speedup)} faster vs waiting on straggler.`,
      tone: "aha",
    });
  }

  const compareLeft = mapCompare
    ? `No backup: map wall ${formatTimeUnits(mapCompare.withoutBackup)}`
    : `Healthy cluster: map wall ${formatTimeUnits(timing.mapUnits)}`;
  const compareRight = mapCompare
    ? `With backup: map wall ${formatTimeUnits(mapCompare.withBackup)} (${formatSpeedup(mapCompare.speedup)} speedup)`
    : `Shuffle + reduce: +${formatTimeUnits(timing.shuffleUnits + timing.reduceUnits)}`;

  const phases: { id: string; label: string }[] = [
    { id: "map", label: "Map" },
    { id: "shuffle", label: "Shuffle" },
    { id: "reduce", label: "Reduce" },
  ];

  return (
    <LabShell
      intro={
        <>
          <strong>Word-count MapReduce</strong> on three README shards (keys A/B/C): watch{" "}
          <strong>map</strong> workers emit counts, <strong>shuffle</strong> route keys to reducers,
          then <strong>reduce</strong> merge. Enable a <strong>straggler</strong> and{" "}
          <strong>backup task</strong> to see tail latency truncate (README § backup tasks).
        </>
      }
    >
      <div className="lab__grid">
        <div className={reducedMotion ? "mapreduce-lab--static" : undefined}>
          <div className="lab__controls-panel">
            <RangeControl
              id="mr-tasks"
              label="Map tasks"
              min={2}
              max={6}
              value={mapTasks}
              valueText={`${mapTasks} workers`}
              onChange={(v) => {
                setMapTasks(v);
                setStragglerIndex((s) => Math.min(s, v - 1));
                setFrame(0);
              }}
            />
            <RangeControl
              id="mr-frame"
              label="Timeline"
              min={0}
              max={maxFrame}
              value={frame}
              valueText={`step ${frame + 1} / ${maxFrame + 1}`}
              onChange={setFrame}
            />
            {hasStraggler && (
              <RangeControl
                id="mr-straggler"
                label="Straggler worker"
                min={0}
                max={mapTasks - 1}
                value={stragglerIndex}
                valueText={`M${stragglerIndex + 1}`}
                onChange={(v) => {
                  setStragglerIndex(v);
                  setFrame(0);
                }}
              />
            )}
            <ScenarioPresets
              aria-label="MapReduce scenario presets"
              presets={[
                { id: "retry", label: "Straggler + backup", onSelect: applyStragglerRetry },
                { id: "stall", label: "Straggler stalls job", onSelect: applyStragglerStall },
                { id: "healthy", label: "Healthy cluster", onSelect: applyHealthy },
              ]}
            />
          </div>
          <div className="lab__row">
            <button
              type="button"
              className="lab__btn"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause MapReduce timeline playback" : "Play MapReduce timeline playback"}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button type="button" className="lab__btn" onClick={stepFrame}>
              Step timeline
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={resetFrame}>
              Reset to start
            </button>
            <button
              type="button"
              className={`lab__btn lab__btn--ghost${hasStraggler ? " lab__btn--active" : ""}`}
              onClick={() => {
                setHasStraggler((v) => !v);
                setFrame(0);
              }}
              aria-pressed={hasStraggler}
            >
              Straggler {hasStraggler ? "on" : "off"}
            </button>
            <button
              type="button"
              className={`lab__btn lab__btn--ghost${withBackup ? " lab__btn--active" : ""}`}
              onClick={() => {
                setWithBackup((v) => !v);
                setFrame(0);
              }}
              aria-pressed={withBackup}
              disabled={!hasStraggler}
            >
              Backup {withBackup ? "on" : "off"}
            </button>
          </div>

          <div className="mapreduce-lab__pipeline" role="group" aria-label="Job phase">
            {phases.map((p) => (
              <div
                key={p.id}
                className={`mapreduce-lab__phase${
                  snap.phase === p.id || (snap.phase === "complete" && p.id === "reduce")
                    ? " mapreduce-lab__phase--active"
                    : ""
                }`}
              >
                {p.label}
              </div>
            ))}
          </div>

          {(snap.phase === "map" || snap.shufflePct < 1) && (
            <div
              className="mapreduce-lab__workers"
              role="img"
              aria-label="Map workers and progress"
            >
              {snap.mapWorkers.map((w) => (
                <div
                  key={w.id}
                  className={`mapreduce-lab__worker${
                    w.status === "straggler"
                      ? " mapreduce-lab__worker--straggler"
                      : w.status === "backup"
                        ? " mapreduce-lab__worker--backup"
                        : w.status === "killed"
                          ? " mapreduce-lab__worker--killed"
                          : ""
                  }`}
                >
                  <div className="mapreduce-lab__worker-label">{w.label}</div>
                  <div className="mapreduce-lab__shard">{w.shardPreview}</div>
                  <div className="mapreduce-lab__bar-wrap">
                    <div
                      className="mapreduce-lab__bar"
                      style={{ width: `${w.progress * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {snap.phase === "shuffle" && (
            <div
              className="mapreduce-lab__shuffle"
              role="progressbar"
              aria-valuenow={Math.round(snap.shufflePct * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Shuffle progress"
            >
              <div
                className="mapreduce-lab__shuffle-fill"
                style={{ width: `${snap.shufflePct * 100}%` }}
              />
            </div>
          )}

          {(snap.phase === "reduce" || snap.phase === "complete") && (
            <div
              className="mapreduce-lab__reducers"
              role="img"
              aria-label="Reduce workers merging key counts"
            >
              {snap.reduceWorkers.map((r) => (
                <div key={r.key} className="mapreduce-lab__reducer">
                  <div className="mapreduce-lab__reducer-key">{r.key}</div>
                  <div className="mapreduce-lab__reducer-sum">
                    {r.sum} / {r.target}
                  </div>
                  <div className="mapreduce-lab__bar-wrap">
                    <div
                      className="mapreduce-lab__bar"
                      style={{ width: `${r.progress * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="lab__hint">{snap.statusNote}</p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${mapTasks}-${stragglerIndex}-${withBackup}-${hasStraggler}`}
        prompt={
          <>
            With <strong>{mapTasks}</strong> map tasks
            {hasStraggler ? (
              <>
                {" "}
                and <strong>M{stragglerIndex + 1}</strong> as a straggler (~12% speed)
              </>
            ) : (
              ""
            )}
            , does turning on <strong>backup tasks</strong> shorten the map phase by more than{" "}
            <strong>2×</strong> versus waiting for the straggler alone?
          </>
        }
        storageKey="mapreduce"
        options={[
          { id: "yes", label: "Yes — backup shortens map phase by >2×", isCorrect: mapCompare !== null && mapCompare.speedup > 2.0 },
          { id: "no", label: "No — speedup is ≤ 2× (or no straggler active)", isCorrect: mapCompare === null || mapCompare.speedup <= 2.0 },
        ]}
        revealLabel="Compare map phase with vs without backup"
      >
        <ComparePanel
          leftLabel="Map phase (no backup)"
          rightLabel={hasStraggler && withBackup ? "Map phase (backup on)" : "Shuffle + reduce"}
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {mapCompare ? (
            backupHelps ? (
              <>
                Yes — backup finishes map in {formatTimeUnits(mapCompare.withBackup)} vs{" "}
                {formatTimeUnits(mapCompare.withoutBackup)} waiting ({formatSpeedup(mapCompare.speedup)}).
                Google reports ~44% end-to-end job savings when backups truncate stragglers near completion.
              </>
            ) : (
              <>
                Not at 2× yet — speedup is {formatSpeedup(mapCompare.speedup)}. Step the timeline or enable
                straggler + backup preset.
              </>
            )
          ) : (
            <>No straggler — map phase completes in {formatTimeUnits(timing.mapUnits)}; tail risk is low.</>
          )}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {snap.phase} · step {frame + 1}/{maxFrame + 1} · {snap.statusNote}
      </p>
    </LabShell>
  );
}
