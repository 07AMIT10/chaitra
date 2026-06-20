import { useMemo, useState } from "react";
import { LabShell } from "../lab/LabShell";
import { PredictReveal } from "../lab/PredictReveal";
import { clamp01, formatPosterior, posterior } from "../../lib/bayesian-inf-math";

type Props = {
  scenario?: string;
  defaultPrior?: number;
  likelihoodGivenH?: number;
  likelihoodGivenNotH?: number;
};

export function BayesianForecastLab({
  scenario = "Will the feature ship on time?",
  defaultPrior = 0.4,
  likelihoodGivenH = 0.75,
  likelihoodGivenNotH = 0.2,
}: Props) {
  const [prior, setPrior] = useState(defaultPrior);
  const [evidenceStrength, setEvidenceStrength] = useState(0.5);

  const leH = clamp01(likelihoodGivenH * evidenceStrength + (1 - evidenceStrength) * 0.5);
  const leNotH = clamp01(
    likelihoodGivenNotH * evidenceStrength + (1 - evidenceStrength) * 0.5
  );

  const updated = useMemo(
    () => posterior(prior, leH, leNotH),
    [prior, leH, leNotH]
  );

  const delta = updated - prior;

  return (
    <LabShell
      intro="Drag the prior and evidence strength. Watch how Bayesian updating shifts probability mass — forecasting is belief maintenance, not prophecy."
      className="bayesian-forecast-lab"
    >
      <PredictReveal
        prompt="Before touching the sliders: will your posterior rise or fall with strong positive evidence?"
        storageKey="drishti-bayesian-forecast"
        options={[
          { id: "rise", label: "Posterior rises", isCorrect: true },
          { id: "fall", label: "Posterior falls", isCorrect: false },
          { id: "same", label: "Stays the same", isCorrect: false },
        ]}
      >
        <div className="bayesian-forecast-lab__results">
          <p className="bayesian-forecast-lab__scenario">{scenario}</p>
          <div className="bayesian-forecast-lab__bar" aria-hidden="true">
            <div
              className="bayesian-forecast-lab__bar-fill"
              style={{ width: `${updated * 100}%` }}
            />
          </div>
          <p className="bayesian-forecast-lab__stat">
            Prior <strong>{formatPosterior(prior)}</strong> → Posterior{" "}
            <strong>{formatPosterior(updated)}</strong>
            {delta !== 0 && (
              <span className={delta > 0 ? "bayesian-forecast-lab__up" : "bayesian-forecast-lab__down"}>
                {" "}
                ({delta > 0 ? "+" : ""}
                {(delta * 100).toFixed(1)} pts)
              </span>
            )}
          </p>
        </div>
      </PredictReveal>

      <div className="bayesian-forecast-lab__controls">
        <label className="bayesian-forecast-lab__control">
          <span>Prior P(ship on time)</span>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={prior}
            onChange={(e) => setPrior(parseFloat(e.target.value))}
          />
          <output>{formatPosterior(prior)}</output>
        </label>
        <label className="bayesian-forecast-lab__control">
          <span>Evidence strength (leading indicator)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={evidenceStrength}
            onChange={(e) => setEvidenceStrength(parseFloat(e.target.value))}
          />
          <output>{(evidenceStrength * 100).toFixed(0)}%</output>
        </label>
      </div>
    </LabShell>
  );
}
