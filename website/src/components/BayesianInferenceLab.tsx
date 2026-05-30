import { useMemo, useState } from "react";
import {
  formatPercent,
  formatPosterior,
  likelihoodRatio,
  marginalEvidence,
  posterior,
} from "../lib/bayesian-inf-math";
import {
  AB_SEQUENTIAL_PRESET,
  EVIDENCE_CHIPS,
  RARE_DISEASE_PRESET,
  SERVER_ALARM_PRESET,
  applyChip,
  applyChipSequence,
  customObservationChip,
  emptyBelief,
  rareDiseaseGroundTruth,
  type BeliefState,
  type EvidenceChip,
} from "../lib/bayesian-inf-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./BayesianInferenceLab.css";

function getBetaPath(p: number, width: number, height: number): string {
  const N = 12;
  const alpha = 1 + p * N;
  const beta = 1 + (1 - p) * N;
  
  const points: { x: number; y: number }[] = [];
  const steps = 60;
  let maxVal = 0.00001;
  
  for (let i = 0; i <= steps; i++) {
    const xVal = i / steps;
    // Unnormalized Beta PDF: x^(alpha-1) * (1-x)^(beta-1)
    const yVal = Math.pow(xVal, alpha - 1) * Math.pow(1 - xVal, beta - 1);
    if (yVal > maxVal) {
      maxVal = yVal;
    }
    points.push({ x: xVal, y: yVal });
  }
  
  const svgPoints = points.map((pt) => {
    const svgX = 10 + pt.x * (width - 20);
    const scaledY = pt.y / maxVal;
    const svgY = height - 15 - scaledY * (height - 30);
    return `${svgX.toFixed(1)},${svgY.toFixed(1)}`;
  });
  
  return `M 10,${height - 15} L ${svgPoints.join(" L ")} L ${width - 10},${height - 15} Z`;
}

export default function BayesianInferenceLab() {
  const [priorPct, setPriorPct] = useState(20);
  const [likeGivenHPct, setLikeGivenHPct] = useState(80);
  const [likeGivenNotHPct, setLikeGivenNotHPct] = useState(20);
  const [belief, setBelief] = useState<BeliefState>(() => emptyBelief(0.2));

  const prior = priorPct / 100;
  const leH = likeGivenHPct / 100;
  const leNotH = likeGivenNotHPct / 100;

  const previewPosterior = useMemo(
    () => posterior(belief.currentPrior, leH, leNotH),
    [belief.currentPrior, leH, leNotH]
  );
  const previewMarginal = useMemo(
    () => marginalEvidence(belief.currentPrior, leH, leNotH),
    [belief.currentPrior, leH, leNotH]
  );
  const lr = useMemo(() => likelihoodRatio(leH, leNotH), [leH, leNotH]);

  const syncPriorFromSlider = (pct: number) => {
    const p = pct / 100;
    setPriorPct(pct);
    setBelief(emptyBelief(p));
  };

  const applyRareDisease = () => {
    setPriorPct(RARE_DISEASE_PRESET.priorPct);
    setLikeGivenHPct(RARE_DISEASE_PRESET.likeGivenHPct);
    setLikeGivenNotHPct(RARE_DISEASE_PRESET.likeGivenNotHPct);
    const chips = RARE_DISEASE_PRESET.chipIds
      .map((id) => EVIDENCE_CHIPS.find((c) => c.id === id))
      .filter((c): c is EvidenceChip => c !== undefined);
    setBelief(applyChipSequence(RARE_DISEASE_PRESET.priorPct / 100, chips));
  };

  const applyServerAlarm = () => {
    setPriorPct(SERVER_ALARM_PRESET.priorPct);
    setLikeGivenHPct(SERVER_ALARM_PRESET.likeGivenHPct);
    setLikeGivenNotHPct(SERVER_ALARM_PRESET.likeGivenNotHPct);
    const chips = SERVER_ALARM_PRESET.chipIds
      .map((id) => EVIDENCE_CHIPS.find((c) => c.id === id))
      .filter((c): c is EvidenceChip => c !== undefined);
    setBelief(applyChipSequence(SERVER_ALARM_PRESET.priorPct / 100, chips));
  };

  const applyAbSequential = () => {
    setPriorPct(AB_SEQUENTIAL_PRESET.priorPct);
    setLikeGivenHPct(AB_SEQUENTIAL_PRESET.likeGivenHPct);
    setLikeGivenNotHPct(AB_SEQUENTIAL_PRESET.likeGivenNotHPct);
    const chips = AB_SEQUENTIAL_PRESET.chipIds
      .map((id) => EVIDENCE_CHIPS.find((c) => c.id === id))
      .filter((c): c is EvidenceChip => c !== undefined);
    setBelief(applyChipSequence(AB_SEQUENTIAL_PRESET.priorPct / 100, chips));
  };

  const addChip = (chip: EvidenceChip) => {
    setBelief((b) => applyChip(b, chip));
  };

  const addCustomObservation = () => {
    const chip = customObservationChip(leH, leNotH);
    setBelief((b) => applyChip(b, chip));
  };

  const resetChain = () => {
    setBelief(emptyBelief(prior));
  };

  const groundTruth = rareDiseaseGroundTruth();
  const rareDiseaseMode =
    priorPct <= 0.001 && belief.steps.some((s) => s.chip.id === "pos-test");
  const panicThreshold = belief.currentPrior >= 0.5;

  const metrics: LabMetric[] = [
    { id: "prior", label: "Current prior P(H)", value: formatPosterior(belief.currentPrior) },
    {
      id: "marginal",
      label: "P(E) next obs.",
      value: formatPosterior(previewMarginal),
    },
    {
      id: "lr",
      label: "Likelihood ratio",
      value: (lr >= 100 ? lr.toFixed(0) : lr.toFixed(2)) + "x",
      tone: lr >= 5 ? "default" : lr <= 1 ? "warn" : "default",
    },
    {
      id: "post",
      label: "Posterior P(H|E)",
      value: formatPosterior(belief.currentPrior),
      tone: belief.steps.length > 0 ? "aha" : "default",
    },
    {
      id: "steps",
      label: "Evidence applied",
      value: String(belief.steps.length),
    },
  ];

  if (rareDiseaseMode && !panicThreshold) {
    metrics.push({
      id: "aha-rare",
      label: "Aha — base rate matters",
      value: "Positive test but P(disease) ≪ 1% — prior dominates.",
      tone: "aha",
    });
  }
  if (panicThreshold && priorPct < 1) {
    metrics.push({
      id: "warn-panic",
      label: "Would panic?",
      value: "Posterior ≥ 50% — easy to over-react without Bayes.",
      tone: "warn",
    });
  }

  const compareLeft = rareDiseaseMode
    ? `Intuitive: ${groundTruth.intuitiveWrong}`
    : `Model posterior: ${formatPosterior(belief.currentPrior)}`;
  const compareRight = rareDiseaseMode
    ? groundTruth.correctLabel
    : `Analytic one-step: ${formatPosterior(previewPosterior)}`;

  const predictPrompt =
    priorPct <= 0.001 && belief.steps.length === 0 ? (
      <>
        Prior <strong>1 in 1,000,000</strong>, 99% accurate test returns{" "}
        <strong>positive</strong>. Will P(disease | +) exceed <strong>50%</strong>?
      </>
    ) : (
      <>
        Current belief <strong>{formatPosterior(belief.currentPrior)}</strong> with sliders P(E|H){" "}
        <strong>{likeGivenHPct}%</strong>, P(E|¬H) <strong>{likeGivenNotHPct}%</strong>. After the
        next custom observation, will posterior exceed <strong>50%</strong>?
      </>
    );

  return (
    <LabShell
      intro={
        <>
          <strong>Bayesian inference</strong> multiplies prior × likelihood and normalizes by{" "}
          <em>P(E)</em>. Each posterior becomes the prior for the next tick — the engine behind rare
          disease tests, server alarms, and live A/B dashboards in the README.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="bayes-prior"
              label="Prior P(H)"
              min={0.0001}
              max={99}
              step={priorPct < 1 ? 0.0001 : 1}
              value={priorPct}
              valueText={formatPosterior(prior)}
              onChange={syncPriorFromSlider}
            />
            <RangeControl
              id="bayes-le-h"
              label="Likelihood P(E|H)"
              min={1}
              max={99}
              value={likeGivenHPct}
              valueText={`${likeGivenHPct}%`}
              onChange={setLikeGivenHPct}
            />
            <RangeControl
              id="bayes-le-not-h"
              label="P(E|¬H) false positive"
              min={1}
              max={99}
              value={likeGivenNotHPct}
              valueText={`${likeGivenNotHPct}%`}
              onChange={setLikeGivenNotHPct}
            />
            <ScenarioPresets
              aria-label="Bayesian inference scenario presets"
              presets={[
                { id: "rare", label: "Rare disease test", onSelect: applyRareDisease },
                { id: "server", label: "Server alarm", onSelect: applyServerAlarm },
                { id: "ab", label: "A/B sequential", onSelect: applyAbSequential },
              ]}
            />
          </div>

          <div className="bayes-lab__visualization">
            <svg
              className="bayes-lab__svg"
              viewBox="0 0 320 160"
              aria-label="Prior vs posterior Beta distribution curves"
            >
              {/* Grid Lines */}
              <line x1="10" y1="145" x2="310" y2="145" stroke="var(--color-muted)" opacity="0.3" strokeWidth="1" />
              <line x1="10" y1="10" x2="10" y2="145" stroke="var(--color-muted)" opacity="0.3" strokeWidth="1" />
              <line x1="160" y1="10" x2="160" y2="145" stroke="var(--color-muted)" opacity="0.15" strokeDasharray="3,3" />
              <line x1="310" y1="10" x2="310" y2="145" stroke="var(--color-muted)" opacity="0.3" strokeWidth="1" />

              {/* Prior Curve */}
              <path
                d={getBetaPath(
                  belief.steps.length > 0
                    ? belief.steps[belief.steps.length - 1].prior
                    : belief.currentPrior,
                  320,
                  160
                )}
                fill="rgba(148, 163, 184, 0.12)"
                stroke="var(--color-muted)"
                strokeWidth="1.5"
                opacity="0.85"
                style={{ transition: "d 0.3s ease" }}
              />

              {/* Posterior Curve */}
              <path
                d={getBetaPath(belief.currentPrior, 320, 160)}
                fill="color-mix(in srgb, var(--color-accent) 18%, transparent)"
                stroke="var(--color-accent)"
                strokeWidth="2"
                style={{ transition: "d 0.3s ease" }}
              />

              {/* Mode indicator dots */}
              <circle
                cx={10 + (belief.steps.length > 0 ? belief.steps[belief.steps.length - 1].prior : belief.currentPrior) * 300}
                cy="145"
                r="4"
                fill="var(--color-muted)"
              />
              <circle
                cx={10 + belief.currentPrior * 300}
                cy="145"
                r="5"
                fill="var(--color-accent)"
              />

              {/* Axis Labels */}
              <text x="10" y="157" fontSize="10" fill="var(--color-muted)" textAnchor="start">0.0</text>
              <text x="160" y="157" fontSize="10" fill="var(--color-muted)" textAnchor="middle">0.5</text>
              <text x="310" y="157" fontSize="10" fill="var(--color-muted)" textAnchor="end">1.0</text>
            </svg>
            <div className="bayes-lab__legend-row">
              <span className="bayes-lab__legend-item">
                <span className="bayes-lab__legend-swatch bayes-lab__legend-swatch--prior" />
                Prior ({formatPosterior(belief.steps.length > 0 ? belief.steps[belief.steps.length - 1].prior : belief.currentPrior)})
              </span>
              <span className="bayes-lab__legend-item">
                <span className="bayes-lab__legend-swatch bayes-lab__legend-swatch--posterior" />
                Posterior ({formatPosterior(belief.currentPrior)})
              </span>
            </div>
          </div>

          <p className="lab__hint">Muted = belief before last evidence; blue = current posterior density.</p>

          <div className="bayes-lab__chips" role="group" aria-label="Evidence chips">
            {EVIDENCE_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="bayes-lab__chip"
                onClick={() => addChip(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="bayes-lab__actions">
            <button type="button" className="bayes-lab__chip" onClick={addCustomObservation}>
              Apply slider observation
            </button>
            <button type="button" className="bayes-lab__reset" onClick={resetChain}>
              Reset evidence chain
            </button>
          </div>

          <div className="bayes-lab__timeline" aria-label="Evidence update chain">
            {belief.steps.length === 0 ? (
              <span className="lab__hint">No evidence yet — click a chip or preset.</span>
            ) : (
              belief.steps.map((step, i) => (
                <span key={`${step.chip.id}-${i}`} className="bayes-lab__step">
                  {i > 0 && <span className="bayes-lab__step-arrow">→</span>}
                  <span>{step.chip.shortLabel}</span>
                  <span className="bayes-lab__step-arrow">:</span>
                  <span>{formatPosterior(step.prior)}</span>
                  <span className="bayes-lab__step-arrow">→</span>
                  <span>{formatPosterior(step.posterior)}</span>
                </span>
              ))
            )}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${priorPct}-${belief.steps.length}-${belief.currentPrior}`}
        prompt={predictPrompt}
        storageKey="bayesian-inf"
        options={[
          { id: "exceed", label: "Yes — posterior will exceed 50%", isCorrect: previewPosterior >= 0.5 },
          { id: "below", label: "No — posterior stays below 50%", isCorrect: previewPosterior < 0.5 },
        ]}
        revealLabel="Show posterior vs intuition"
      >
        <ComparePanel
          leftLabel={rareDiseaseMode ? "Intuition trap" : "After evidence"}
          rightLabel={rareDiseaseMode ? "Bayes posterior" : "One-step preview"}
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {rareDiseaseMode
            ? `README analytic posterior ≈ ${formatPosterior(groundTruth.analyticPosterior)} — not 99%.`
            : `Next observation preview: ${formatPosterior(previewPosterior)} (P(E)=${formatPercent(previewMarginal)}).`}
          {belief.steps.length > 0
            ? ` Chain length ${belief.steps.length}; latest chip "${belief.steps[belief.steps.length - 1].chip.label}".`
            : ""}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        P(H) = {formatPosterior(belief.currentPrior)} after {belief.steps.length} update
        {belief.steps.length === 1 ? "" : "s"}. Sliders set the next custom observation.
      </p>
    </LabShell>
  );
}
