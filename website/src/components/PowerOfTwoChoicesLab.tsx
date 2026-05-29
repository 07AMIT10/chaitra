import { useMemo, useState } from "react";
import { runTrials, simulateBins } from "../lib/pot2-sim";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./PowerOfTwoChoicesLab.css";

export default function PowerOfTwoChoicesLab() {
  const [nBins, setNBins] = useState(20);
  const [nBalls, setNBalls] = useState(200);
  const [strategy, setStrategy] = useState<"random" | "power-of-two">("power-of-two");

  const stats = useMemo(
    () => simulateBins(nBins, nBalls, strategy),
    [nBins, nBalls, strategy]
  );
  const comparison = useMemo(
    () => ({
      random: runTrials(nBins, nBalls, 50, "random"),
      pot2: runTrials(nBins, nBalls, 50, "power-of-two"),
    }),
    [nBins, nBalls]
  );

  const maxBin = Math.max(...stats.bins, 1);

  const metrics: LabMetric[] = [
    { id: "bins", label: "Bins", value: String(nBins) },
    { id: "balls", label: "Balls", value: String(nBalls) },
    { id: "max", label: "Max load", value: String(stats.maxLoad) },
    { id: "empty", label: "Empty bins", value: String(stats.emptyBins) },
    {
      id: "cmp",
      label: "Avg max (50 trials)",
      value: `random ${comparison.random.avgMax.toFixed(1)} vs Po2 ${comparison.pot2.avgMax.toFixed(1)}`,
      tone: "aha",
    },
  ];

  return (
    <LabShell
      intro={
        <>
          Power-of-two choices: pick the lighter of two random bins. Dramatically reduces max load
          vs uniform random — the classic balls-into-bins result.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="pot2-bins"
            label="Number of bins"
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
          <div className="lab__row">
            <button
              type="button"
              className={`lab__btn ${strategy === "random" ? "" : "lab__btn--ghost"}`}
              onClick={() => setStrategy("random")}
            >
              Random
            </button>
            <button
              type="button"
              className={`lab__btn ${strategy === "power-of-two" ? "" : "lab__btn--ghost"}`}
              onClick={() => setStrategy("power-of-two")}
            >
              Power-of-two
            </button>
          </div>
          <div className="pot2-lab__chart" role="img" aria-label="Bin load histogram">
            {stats.bins.map((load, i) => (
              <div
                key={i}
                className="pot2-lab__bar"
                style={{ height: `${(load / maxBin) * 100}%` }}
                title={`bin ${i}: ${load}`}
              />
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        {strategy === "power-of-two" ? "Power-of-two" : "Random"}: max load {stats.maxLoad},
        {stats.emptyBins} empty bins.
      </p>
    </LabShell>
  );
}
