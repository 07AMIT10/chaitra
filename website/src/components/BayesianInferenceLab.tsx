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

function barHeight(fraction: number): string {
  const p = Math.min(1, Math.max(0, fraction));
  if (p <= 0) return "2%";
  const scaled = Math.sqrt(p);
  return `${Math.max(4, scaled * 100)}%`;
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

          <div className="bayes-lab__bars" role="img" aria-label="Prior belief vs posterior after evidence">
            <div className="bayes-lab__bar-col">
              <div
                className="bayes-lab__bar bayes-lab__bar--prior"
                style={{
                  height: barHeight(
                    belief.steps.length > 0
                      ? belief.steps[belief.steps.length - 1].prior
                      : belief.currentPrior
                  ),
                }}
                title="Prior at start of last step"
              />
              <span className="bayes-lab__bar-label">Prior</span>
            </div>
            <div className="bayes-lab__bar-col">
              <div
                className="bayes-lab__bar"
                style={{ height: barHeight(belief.currentPrior) }}
                title="Current posterior"
              />
              <span className="bayes-lab__bar-label">Posterior</span>
            </div>
          </div>

          <p className="lab__hint">Gray = belief before last evidence; accent = current P(H).</p>

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
