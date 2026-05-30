import { useMemo, useState } from "react";
import {
  heuristicMaxLoadRandom,
  optimalMaxLoad,
  successProbability,
  formatProbability,
} from "../lib/prob-sched-math";
import {
  compareStrategies,
  HEAVY_LOAD_PRESET,
  HIGH_P_SUCCESS_PRESET,
  NOMAD_STYLE_PRESET,
  simulatePlacement,
  type PlacementStrategy,
} from "../lib/prob-sched-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./ProbabilisticSchedulingLab.css";

const DEFAULT_TRIALS = 50;

function curvePath(samples: { k: number; p: number }[]): string {
  if (samples.length === 0) return "";
  const maxK = samples[samples.length - 1].k;
  const pts = samples.map((s, i) => {
    const x = maxK <= 1 ? 0 : (s.k / maxK) * 100;
    const y = 100 - s.p * 100;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  });
  return pts.join(" ");
}

export default function ProbabilisticSchedulingLab() {
  const [tasks, setTasks] = useState(120);
  const [workers, setWorkers] = useState(8);
  const [sampleSize, setSampleSize] = useState(3);
  const [goodFracPct, setGoodFracPct] = useState(10);
  const [trials, setTrials] = useState(DEFAULT_TRIALS);
  const [strategy, setStrategy] = useState<PlacementStrategy>("sample-k");

  const goodFrac = goodFracPct / 100;
  const pSuccess = successProbability(goodFrac, sampleSize);
  const optMax = optimalMaxLoad(tasks, workers);
  const estRandomMax = heuristicMaxLoadRandom(tasks, workers);

  const stats = useMemo(
    () => simulatePlacement(tasks, workers, strategy, sampleSize),
    [tasks, workers, strategy, sampleSize]
  );

  const optimalRun = useMemo(
    () => simulatePlacement(tasks, workers, "optimal", sampleSize, 7),
    [tasks, workers, sampleSize]
  );

  const comparison = useMemo(
    () => compareStrategies(tasks, workers, sampleSize, trials),
    [tasks, workers, sampleSize, trials]
  );

  const maxBar = Math.max(...stats.loads, ...optimalRun.loads, 1);
  const sampleWins =
    comparison.sampleK.avgMax < comparison.random.avgMax - 0.15;
  const sampleNearOptimal =
    comparison.sampleK.avgMax <= comparison.optimal.maxLoad + 0.5;

  const pCurve = useMemo(() => {
    const maxK = Math.min(workers, 12);
    const out: { k: number; p: number }[] = [];
    for (let k = 1; k <= maxK; k++) {
      out.push({ k, p: successProbability(goodFrac, k) });
    }
    return out;
  }, [goodFrac, workers]);

  const applyNomadStyle = () => {
    setTasks(NOMAD_STYLE_PRESET.tasks);
    setWorkers(NOMAD_STYLE_PRESET.workers);
    setSampleSize(NOMAD_STYLE_PRESET.sampleSize);
    setTrials(NOMAD_STYLE_PRESET.trials);
    setGoodFracPct(10);
    setStrategy("sample-k");
  };

  const applyHeavyLoad = () => {
    setTasks(HEAVY_LOAD_PRESET.tasks);
    setWorkers(HEAVY_LOAD_PRESET.workers);
    setSampleSize(HEAVY_LOAD_PRESET.sampleSize);
    setTrials(HEAVY_LOAD_PRESET.trials);
    setGoodFracPct(10);
    setStrategy("sample-k");
  };

  const applyHighPSuccess = () => {
    setTasks(HIGH_P_SUCCESS_PRESET.tasks);
    setWorkers(HIGH_P_SUCCESS_PRESET.workers);
    setSampleSize(HIGH_P_SUCCESS_PRESET.sampleSize);
    setTrials(HIGH_P_SUCCESS_PRESET.trials);
    setGoodFracPct(10);
    setStrategy("sample-k");
  };

  const metrics: LabMetric[] = [
    { id: "tasks", label: "Tasks", value: String(tasks) },
    { id: "workers", label: "Workers (N)", value: String(workers) },
    { id: "k", label: "Sample size (k)", value: String(sampleSize) },
    {
      id: "psuccess",
      label: "P(good node in sample)",
      value: formatProbability(pSuccess),
      tone: pSuccess >= 0.88 ? "aha" : "default",
    },
    { id: "max", label: "Max load (this run)", value: String(stats.maxLoad) },
    {
      id: "opt",
      label: "Optimal max (greedy)",
      value: String(optimalRun.maxLoad),
      tone: stats.maxLoad <= optimalRun.maxLoad + 1 ? "aha" : "default",
    },
    {
      id: "trials",
      label: `Avg max (${trials} trials)`,
      value: `random ${comparison.random.avgMax.toFixed(1)} · k-sample ${comparison.sampleK.avgMax.toFixed(1)}`,
      tone: sampleWins ? "aha" : "default",
    },
  ];

  if (sampleWins && tasks >= workers * 12) {
    metrics.push({
      id: "aha",
      label: "Aha — sampling beats random",
      value: `k-sample lowers avg max by ${(comparison.random.avgMax - comparison.sampleK.avgMax).toFixed(1)} vs 1 random pick.`,
      tone: "aha",
    });
  } else if (sampleNearOptimal && strategy === "sample-k") {
    metrics.push({
      id: "aha2",
      label: "Aha — near optimal",
      value: `Sample-k avg max ${comparison.sampleK.avgMax.toFixed(1)} vs greedy optimal ${comparison.optimal.maxLoad}.`,
      tone: "aha",
    });
  }

  const compareLeft = `Random: avg max ${comparison.random.avgMax.toFixed(1)} (heuristic ~${estRandomMax.toFixed(1)})`;
  const compareRight = `Sample-k (k=${sampleSize}): avg max ${comparison.sampleK.avgMax.toFixed(1)} · optimal greedy max ${comparison.optimal.maxLoad}`;

  const markerX =
    workers <= 1 ? 0 : (Math.min(sampleSize, workers) / Math.min(workers, 12)) * 100;

  return (
    <LabShell
      intro={
        <>
          <strong>Probabilistic scheduling</strong> places each task on a worker without scanning the
          whole cluster: pick one random worker, or sample <strong>k</strong> workers and assign to
          the lightest. The histogram is one deterministic run (small N); trial averages compare{" "}
          <strong>random</strong> vs <strong>sample-k</strong> vs <strong>greedy optimal</strong>.
          The curve plots P<sub>success</sub> = 1 − (1 − p)<sup>k</sup> from the README.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="prob-sched-tasks"
              label="Tasks"
              min={20}
              max={300}
              step={10}
              value={tasks}
              valueText={`${tasks} tasks`}
              onChange={setTasks}
            />
            <RangeControl
              id="prob-sched-workers"
              label="Workers (small N)"
              min={2}
              max={12}
              value={workers}
              valueText={`${workers} workers`}
              onChange={setWorkers}
            />
            <RangeControl
              id="prob-sched-k"
              label="Sample size (k)"
              min={1}
              max={8}
              value={sampleSize}
              valueText={`k = ${sampleSize}`}
              onChange={setSampleSize}
            />
            <RangeControl
              id="prob-sched-pgood"
              label="Top fraction “good” (p)"
              min={5}
              max={30}
              value={goodFracPct}
              valueText={`${goodFracPct}%`}
              onChange={setGoodFracPct}
            />
            <RangeControl
              id="prob-sched-trials"
              label="Repeat trials"
              min={20}
              max={100}
              step={10}
              value={trials}
              valueText={`${trials} trials`}
              onChange={setTrials}
            />
            <ScenarioPresets
              aria-label="Probabilistic scheduling presets"
              presets={[
                { id: "nomad", label: "Nomad-style (k=3)", onSelect: applyNomadStyle },
                { id: "heavy", label: "Heavy load", onSelect: applyHeavyLoad },
                { id: "psuccess", label: "High P_success", onSelect: applyHighPSuccess },
              ]}
            />
          </div>

          <div className="lab__row" role="group" aria-label="Placement strategy for histogram">
            <button
              type="button"
              className={`lab__btn ${strategy === "random" ? "" : "lab__btn--ghost"}`}
              aria-pressed={strategy === "random"}
              onClick={() => setStrategy("random")}
            >
              Random
            </button>
            <button
              type="button"
              className={`lab__btn ${strategy === "sample-k" ? "" : "lab__btn--ghost"}`}
              aria-pressed={strategy === "sample-k"}
              onClick={() => setStrategy("sample-k")}
            >
              Sample-k
            </button>
            <button
              type="button"
              className={`lab__btn ${strategy === "optimal" ? "" : "lab__btn--ghost"}`}
              aria-pressed={strategy === "optimal"}
              onClick={() => setStrategy("optimal")}
            >
              Optimal
            </button>
          </div>

          <div className="prob-sched-lab__curve">
            <div
              className="prob-sched-lab__curve-inner"
              role="img"
              aria-label={`P success vs sample size k for p=${goodFracPct}% good nodes; current k=${sampleSize}, P=${formatProbability(pSuccess)}`}
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <path
                  d={curvePath(pCurve)}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="prob-sched-lab__marker" style={{ left: `${markerX}%` }} />
            </div>
            <p className="lab__hint">
              P<sub>success</sub> = 1 − (1 − p)<sup>k</sup> · marker = current k · at k={sampleSize},
              P ≈ {formatProbability(pSuccess)} (independent of cluster size N).
            </p>
          </div>

          <div
            className="prob-sched-lab__chart"
            role="img"
            aria-label={`Worker load histogram: max ${stats.maxLoad}, strategy ${strategy}`}
          >
            {stats.loads.map((load, i) => (
              <div
                key={i}
                className={`prob-sched-lab__bar prob-sched-lab__bar--${
                  strategy === "random"
                    ? "random"
                    : strategy === "optimal"
                      ? "optimal"
                      : "sample"
                }`}
                style={{ height: `${(load / maxBar) * 100}%` }}
                title={`worker ${i}: ${load}`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Bar height = tasks per worker (seed 42). Greedy optimal max = {optMax}; this run max{" "}
            {stats.maxLoad}. Optimal reference bars (green) max {optimalRun.maxLoad}.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${tasks}-${workers}-${sampleSize}-${trials}`}
        prompt={
          <>
            With <strong>{workers}</strong> workers, <strong>{tasks}</strong> tasks, and sample size{" "}
            <strong>k = {sampleSize}</strong> over <strong>{trials}</strong> trials, will{" "}
            <strong>sample-k</strong> achieve a <strong>lower average max load</strong> than pure
            random placement — closer to <strong>greedy optimal</strong> (max {optMax})?
          </>
        }
        revealLabel="Compare random vs sample-k vs optimal"
      >
        <ComparePanel
          leftLabel="1 random worker"
          rightLabel={`k-sample (k=${sampleSize})`}
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Greedy optimal (full scan, small N): max load {comparison.optimal.maxLoad}, spread{" "}
          {comparison.optimal.spread.toFixed(1)}.{" "}
          {sampleWins
            ? `Sample-k cuts avg max by ${(comparison.random.avgMax - comparison.sampleK.avgMax).toFixed(1)} — you trade O(N) scoring for O(k) with most of the balance benefit.`
            : "Try Heavy load or Nomad-style — when tasks ≫ workers, sampling separates fastest from random."}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {strategy === "random"
          ? "Random"
          : strategy === "sample-k"
            ? `Sample-k (k=${sampleSize})`
            : "Optimal"}{" "}
        histogram · P(good) at k={sampleSize}: {formatProbability(pSuccess)} · {trials} trial avg:
        random {comparison.random.avgMax.toFixed(1)} vs sample-k{" "}
        {comparison.sampleK.avgMax.toFixed(1)}. Reveal above for side-by-side comparison.
      </p>
    </LabShell>
  );
}
