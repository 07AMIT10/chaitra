import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  INTEGRAL_X2_TRUE,
  PI_TRUE,
  absoluteError,
  formatMc,
  piStandardErrorTheory,
  samplesToHalveError,
} from "../lib/mc-systems-math";
import {
  piConvergenceSeries,
  simulateIntegralXSquared,
  simulatePi,
} from "../lib/mc-systems-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./MonteCarloSystemsLab.css";

type ProblemMode = "pi" | "integral";

export default function MonteCarloSystemsLab() {
  const [mode, setMode] = useState<ProblemMode>("pi");
  const [samples, setSamples] = useState(4000);
  const [seed, setSeed] = useState(42);
  const reducedMotion = usePrefersReducedMotion();

  const piRun = useMemo(() => simulatePi(samples, seed), [samples, seed]);
  const integralRun = useMemo(
    () => simulateIntegralXSquared(samples, seed + 7),
    [samples, seed]
  );
  const convergence = useMemo(
    () => (mode === "pi" ? piConvergenceSeries(samples, seed) : []),
    [mode, samples, seed]
  );

  const truth = mode === "pi" ? PI_TRUE : INTEGRAL_X2_TRUE;
  const estimate = mode === "pi" ? piRun.estimate : integralRun.estimate;
  const stderr = mode === "pi" ? piRun.stderr : integralRun.stderr;
  const err = absoluteError(estimate, truth);
  const theorySe = mode === "pi" ? piStandardErrorTheory(samples) : integralRun.stderr;
  const errorShrinks = err < theorySe * 2.5;
  const quadRule = samplesToHalveError(samples);

  const applyFewSamples = () => {
    setMode("pi");
    setSamples(800);
    setSeed(42);
  };

  const applyManySamples = () => {
    setMode("pi");
    setSamples(12000);
    setSeed(42);
  };

  const applyIntegral = () => {
    setMode("integral");
    setSamples(6000);
    setSeed(99);
  };

  const maxConvErr = Math.max(...convergence.map((c) => c.error), err, 0.01);

  const metrics: LabMetric[] = [
    {
      id: "mode",
      label: "Problem",
      value: mode === "pi" ? "π (quarter circle)" : "∫₀¹ x² dx",
    },
    { id: "n", label: "Samples (N)", value: String(samples) },
    {
      id: "est",
      label: "Estimate",
      value: formatMc(estimate),
      tone: err < 0.02 ? "aha" : "default",
    },
    {
      id: "truth",
      label: "Exact",
      value: formatMc(truth),
    },
    {
      id: "err",
      label: "|Error|",
      value: formatMc(err),
      tone: err > 0.1 ? "warn" : "default",
    },
    {
      id: "se",
      label: "Std error (σ/√N)",
      value: formatMc(stderr),
    },
    {
      id: "se-theory",
      label: mode === "pi" ? "Theory SE @ π/4" : "Sample variance",
      value:
        mode === "pi"
          ? formatMc(theorySe)
          : formatMc(integralRun.sampleVariance, 5),
    },
  ];
  if (mode === "pi" && err < 0.05 && samples >= 2000) {
    metrics.push({
      id: "aha",
      label: "Aha — LLN",
      value: `|π̂−π|=${formatMc(err)} with SE≈${formatMc(stderr)} at N=${samples}.`,
      tone: "aha",
    });
  }

  const compareLeft =
    mode === "pi"
      ? `MC: π̂=${formatMc(piRun.estimate)} · ${piRun.inside}/${samples} hits · SE=${formatMc(piRun.stderr)}`
      : `MC: ∫̂=${formatMc(integralRun.estimate)} · SE=${formatMc(integralRun.stderr)}`;
  const compareRight =
    mode === "pi"
      ? `Exact: π=${formatMc(PI_TRUE)} · |error|=${formatMc(absoluteError(piRun.estimate, PI_TRUE))}`
      : `Exact: 1/3=${formatMc(INTEGRAL_X2_TRUE)} · |error|=${formatMc(absoluteError(integralRun.estimate, INTEGRAL_X2_TRUE))}`;

  return (
    <LabShell
      intro={
        <>
          <strong>Monte Carlo integration</strong>: random samples estimate π (quarter-circle
          hits in the unit square) or ∫₀¹ x² dx. The convergence strip plots |estimate − truth| vs
          N; metrics show the README’s σ/√N standard error.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="mc-samples"
              label="Sample count (N)"
              min={200}
              max={20000}
              step={200}
              value={samples}
              valueText={`${samples} samples`}
              onChange={setSamples}
            />
            <RangeControl
              id="mc-seed"
              label="RNG seed"
              min={1}
              max={200}
              value={seed}
              valueText={`seed ${seed}`}
              onChange={setSeed}
            />
            <ScenarioPresets
              aria-label="Monte Carlo scenario presets"
              presets={[
                { id: "few", label: "Few samples (noisy)", onSelect: applyFewSamples },
                { id: "many", label: "Many samples", onSelect: applyManySamples },
                { id: "integral", label: "∫ x² on [0,1]", onSelect: applyIntegral },
              ]}
            />
          </div>
          <div className="lab__row" role="group" aria-label="Monte Carlo problem">
            <button
              type="button"
              className={`lab__btn ${mode === "pi" ? "" : "lab__btn--ghost"}`}
              aria-pressed={mode === "pi"}
              onClick={() => setMode("pi")}
            >
              Estimate π
            </button>
            <button
              type="button"
              className={`lab__btn ${mode === "integral" ? "" : "lab__btn--ghost"}`}
              aria-pressed={mode === "integral"}
              onClick={() => setMode("integral")}
            >
              ∫₀¹ x² dx
            </button>
          </div>

          {mode === "pi" ? (
            <svg
              className={`mc-lab__scatter${reducedMotion ? " mc-lab__scatter--static" : ""}`}
              viewBox="0 0 1 1"
              role="img"
              aria-label={`${piRun.inside} of ${samples} random points fall inside the quarter circle`}
            >
              <rect x={0} y={0} width={1} height={1} fill="transparent" stroke="var(--color-muted)" strokeWidth={0.01} />
              <path className="mc-lab__arc" d="M 0 1 A 1 1 0 0 1 1 0" />
              {piRun.points.map((p, i) => (
                <circle
                  key={i}
                  className={`mc-lab__dot ${p.inside ? "mc-lab__dot--hit" : "mc-lab__dot--miss"}`}
                  cx={p.x}
                  cy={1 - p.y}
                  r={0.008}
                />
              ))}
            </svg>
          ) : (
            <p className="lab__hint">
              Each sample draws x ~ Uniform(0,1) and accumulates x²; the estimate is the sample mean
              (area under x² on [0,1]). True value 1/3.
            </p>
          )}

          {mode === "pi" && convergence.length > 0 && (
            <>
              <p className="lab__hint">|π̂ − π| vs sample count (log-spaced checkpoints, same seed).</p>
              <div
                className="mc-lab__conv"
                role="img"
                aria-label="Convergence: absolute error vs number of samples"
              >
                {convergence.map((pt) => (
                  <div
                    key={pt.n}
                    className="mc-lab__conv-bar"
                    style={{ height: `${(pt.error / maxConvErr) * 100}%` }}
                    title={`N=${pt.n}: |error|=${formatMc(pt.error)} SE=${formatMc(pt.stderr)}`}
                  />
                ))}
              </div>
            </>
          )}

          <p className="lab__hint">
            Halving error needs ~4× samples (README). At N={samples}, try N≈{quadRule} for ~½ SE.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${mode}-${samples}-${seed}`}
        prompt={
          <>
            At <strong>N={samples}</strong> for{" "}
            <strong>{mode === "pi" ? "π" : "∫₀¹ x²"}</strong>, will the standard error{" "}
            <strong>σ/√N</strong> be within <strong>2.5×</strong> of |estimate − exact| (CLT band)?
          </>
        }
        storageKey="mc-systems"
        options={[
          { id: "yes", label: "Yes — within CLT band (error < 2.5× SE)", isCorrect: errorShrinks },
          { id: "no", label: "No — error exceeds CLT band", isCorrect: !errorShrinks },
        ]}
        revealLabel="Show estimate vs exact"
      >
        <ComparePanel
          leftLabel="Monte Carlo"
          rightLabel="Ground truth"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {errorShrinks
            ? `|error|=${formatMc(err)} tracks SE=${formatMc(stderr)} — variance shrinks as 1/√N.`
            : `High variance at N=${samples} — try Many samples or re-seed; quadrupling N roughly halves SE.`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {mode === "pi" ? "π" : "∫x²"} estimate {formatMc(estimate)} · exact {formatMc(truth)} · SE{" "}
        {formatMc(stderr)}. Reveal above for side-by-side compare.
      </p>
    </LabShell>
  );
}
