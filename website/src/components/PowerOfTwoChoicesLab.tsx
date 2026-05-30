import { useMemo, useState } from "react";
import {
  expectedMaxLoadPowerOfTwo,
  expectedMaxLoadRandom,
  formatMaxLoadEstimate,
} from "../lib/pot2-math";
import { runTrials, simulateBins } from "../lib/pot2-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./PowerOfTwoChoicesLab.css";

const DEFAULT_TRIALS = 50;

export default function PowerOfTwoChoicesLab() {
  const [nBins, setNBins] = useState(10);
  const [nBalls, setNBalls] = useState(400);
  const [trials, setTrials] = useState(DEFAULT_TRIALS);
  const [strategy, setStrategy] = useState<"random" | "power-of-two">("power-of-two");

  const stats = useMemo(
    () => simulateBins(nBins, nBalls, strategy),
    [nBins, nBalls, strategy]
  );
  const comparison = useMemo(
    () => ({
      random: runTrials(nBins, nBalls, trials, "random"),
      pot2: runTrials(nBins, nBalls, trials, "power-of-two"),
    }),
    [nBins, nBalls, trials]
  );

  const maxBin = Math.max(...stats.bins, 1);
  const pot2Wins = comparison.pot2.avgMax < comparison.random.avgMax - 0.05;
  const estRandom = expectedMaxLoadRandom(nBins);
  const estPot2 = expectedMaxLoadPowerOfTwo(nBins);

  const applyManyBallsFewBins = () => {
    setNBins(8);
    setNBalls(400);
    setTrials(80);
    setStrategy("power-of-two");
  };

  const applyBalancedCluster = () => {
    setNBins(20);
    setNBalls(200);
    setTrials(50);
    setStrategy("power-of-two");
  };

  const applyLargeCluster = () => {
    setNBins(50);
    setNBalls(500);
    setTrials(50);
    setStrategy("random");
  };

  const metrics: LabMetric[] = [
    { id: "bins", label: "Bins (N)", value: String(nBins) },
    { id: "balls", label: "Balls", value: String(nBalls) },
    { id: "trials", label: "Trials", value: String(trials) },
    { id: "max", label: "Max load (this run)", value: String(stats.maxLoad) },
    { id: "empty", label: "Empty bins", value: String(stats.emptyBins) },
    {
      id: "est",
      label: "Theory max (1 vs 2 choice)",
      value: `random ~${formatMaxLoadEstimate(nBins, "random")} · Po2 ~${formatMaxLoadEstimate(nBins, "power-of-two")}`,
    },
    {
      id: "cmp",
      label: `Avg max (${trials} trials)`,
      value: `random ${comparison.random.avgMax.toFixed(1)} · Po2 ${comparison.pot2.avgMax.toFixed(1)}`,
      tone: pot2Wins ? "aha" : "default",
    },
  ];
  if (pot2Wins && nBalls >= nBins * 8) {
    metrics.push({
      id: "aha",
      label: "Aha — two choices win",
      value: `Po2 avg max ${(comparison.random.avgMax - comparison.pot2.avgMax).toFixed(1)} lower than random.`,
      tone: "aha",
    });
  }

  const compareLeft = `Random: avg max ${comparison.random.avgMax.toFixed(1)} (theory ~${estRandom.toFixed(1)})`;
  const compareRight = `Power-of-two: avg max ${comparison.pot2.avgMax.toFixed(1)} (theory ~${estPot2.toFixed(1)})`;

  return (
    <LabShell
      intro={
        <>
          <strong>Balls into bins</strong>: each ball picks a bin — uniformly at random, or the
          lighter of two random bins (power-of-two). The histogram is one deterministic run; trial
          averages match the README’s ln N / ln ln N vs ln ln N scaling.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="pot2-bins"
              label="Number of bins (N)"
              min={5}
              max={50}
              value={nBins}
              valueText={`${nBins} bins`}
              onChange={setNBins}
            />
            <RangeControl
              id="pot2-balls"
              label="Number of balls"
              min={50}
              max={500}
              step={10}
              value={nBalls}
              valueText={`${nBalls} balls`}
              onChange={setNBalls}
            />
            <RangeControl
              id="pot2-trials"
              label="Repeat trials"
              min={20}
              max={100}
              step={10}
              value={trials}
              valueText={`${trials} trials`}
              onChange={setTrials}
            />
            <ScenarioPresets
              aria-label="Power-of-two balls-into-bins presets"
              presets={[
                {
                  id: "hot",
                  label: "Many balls, few bins",
                  onSelect: applyManyBallsFewBins,
                },
                { id: "balanced", label: "Balanced cluster", onSelect: applyBalancedCluster },
                { id: "large", label: "Large cluster", onSelect: applyLargeCluster },
              ]}
            />
          </div>
          <div className="lab__row" role="group" aria-label="Assignment strategy for histogram">
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
              className={`lab__btn ${strategy === "power-of-two" ? "" : "lab__btn--ghost"}`}
              aria-pressed={strategy === "power-of-two"}
              onClick={() => setStrategy("power-of-two")}
            >
              Power-of-two
            </button>
          </div>
          <div
            className="pot2-lab__chart"
            role="img"
            aria-label={`Bin load histogram: max ${stats.maxLoad}, ${stats.emptyBins} empty bins, ${strategy} assignment`}
          >
            {stats.bins.map((load, i) => (
              <div
                key={i}
                className="pot2-lab__bar"
                style={{ height: `${(load / maxBin) * 100}%` }}
                title={`bin ${i}: ${load}`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Bar height = balls per bin for the selected strategy (seed 42). Toggle Random vs
            Power-of-two; trial averages below use independent seeds per trial.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${nBins}-${nBalls}-${trials}`}
        prompt={
          <>
            With <strong>{nBins}</strong> bins and <strong>{nBalls}</strong> balls over{" "}
            <strong>{trials}</strong> trials, will <strong>power-of-two</strong> achieve a{" "}
            <strong>lower average max load</strong> than pure random assignment?
          </>
        }
        storageKey="power-of-two"
        options={[
          { id: "yes", label: "Yes — power-of-two max load is lower", isCorrect: pot2Wins },
          { id: "no", label: "No — they are roughly the same or random wins", isCorrect: !pot2Wins },
        ]}
        revealLabel="Show random vs power-of-two max load"
      >
        <ComparePanel
          leftLabel="1 choice (random)"
          rightLabel="2 choices (power-of-two)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          This run ({strategy}): max load <strong>{stats.maxLoad}</strong>, {stats.emptyBins} empty
          bins.{" "}
          {pot2Wins
            ? `Over ${trials} trials, power-of-two lowers avg max by ${(comparison.random.avgMax - comparison.pot2.avgMax).toFixed(1)} — matching the README’s ln ln N gap.`
            : "Try Many balls, few bins — when load is heavy, two choices separate fastest."}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {strategy === "power-of-two" ? "Power-of-two" : "Random"} histogram · {trials} trial avg:
        random {comparison.random.avgMax.toFixed(1)} vs Po2 {comparison.pot2.avgMax.toFixed(1)} max
        load. Reveal above for side-by-side comparison.
      </p>
    </LabShell>
  );
}
