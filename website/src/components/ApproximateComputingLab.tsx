import { useMemo, useState } from "react";
import {
  formatPercent,
  formatSci,
  isInSafeVoltageRegion,
  loopSpeedup,
  memoryFactorVsFp32,
  normalizedPower,
  quantLevelValues,
  quantize,
  quantizationError,
  quantizationVariance,
  scaleFactor,
  timingErrorRate,
} from "../lib/approximate-computing-math";
import {
  LOOP_N_PRESETS,
  QUANT_PRESETS,
  buildHistogramBins,
  energyCurveSamples,
  generateSignalValues,
  runningMeans,
  sampleForHistogram,
  simulateLoopPerforation,
  type QuantRangePreset,
} from "../lib/approximate-computing-sim";
import {
  ComparePanel,
  LabShell,
  LabTabPanel,
  LabTabs,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
  type LabTab,
} from "./lab";
import "./ApproximateComputingLab.css";

const TABS: LabTab[] = [
  {
    id: "precision",
    label: "Precision",
    panelId: "ac-panel-precision",
    tabId: "ac-tab-precision",
  },
  { id: "energy", label: "Energy", panelId: "ac-panel-energy", tabId: "ac-tab-energy" },
  { id: "loops", label: "Loops", panelId: "ac-panel-loops", tabId: "ac-tab-loops" },
];

function polylinePath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  yMax: number
): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => {
      const x = (p.x / width) * 100;
      const y = 100 - (p.y / yMax) * 100;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function NumberLine({
  alpha,
  beta,
  x,
  xq,
  bits,
}: {
  alpha: number;
  beta: number;
  x: number;
  xq: number;
  bits: number;
}) {
  const w = 100;
  const h = 56;
  const span = beta - alpha || 1;
  const toX = (v: number) => ((v - alpha) / span) * w;
  const levels = quantLevelValues(alpha, beta, bits);
  const maxLevels = Math.min(levels.length, 32);

  return (
    <svg
      className="ac-lab__svg ac-lab__number-line"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Number line showing true value and quantized bucket"
    >
      <line x1={0} y1={h - 12} x2={w} y2={h - 12} stroke="var(--color-muted)" strokeWidth={0.5} />
      {levels.slice(0, maxLevels).map((lv, i) => (
        <line
          key={i}
          x1={toX(lv)}
          y1={h - 20}
          x2={toX(lv)}
          y2={h - 8}
          stroke="var(--color-muted)"
          strokeWidth={0.35}
          opacity={0.6}
        />
      ))}
      <circle cx={toX(x)} cy={h - 28} r={3} fill="var(--color-accent)" />
      <circle cx={toX(xq)} cy={h - 28} r={3} fill="var(--color-warning)" />
      <line
        x1={toX(x)}
        y1={h - 28}
        x2={toX(xq)}
        y2={h - 28}
        stroke="var(--color-warning)"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <text x={toX(x)} y={h - 34} fontSize={4} textAnchor="middle" fill="var(--color-accent)">
        x
      </text>
      <text x={toX(xq)} y={h - 34} fontSize={4} textAnchor="middle" fill="var(--color-warning)">
        xq
      </text>
    </svg>
  );
}

function EnergyChart({
  voltage,
  vTh,
  k,
}: {
  voltage: number;
  vTh: number;
  k: number;
}) {
  const samples = useMemo(() => energyCurveSamples(0.55, 1.0, 40, vTh, k), [vTh, k]);
  const powerPts = samples.map((s, i) => ({ x: i, y: s.power }));
  const errPts = samples.map((s, i) => ({ x: i, y: s.err }));
  const powerPath = polylinePath(powerPts, samples.length - 1, 100, 1);
  const errPath = polylinePath(errPts, samples.length - 1, 100, 1);
  const vIdx = Math.round(((voltage - 0.55) / 0.45) * (samples.length - 1));

  return (
    <svg
      className="ac-lab__svg"
      viewBox="0 0 100 60"
      role="img"
      aria-label="Power versus timing error rate as voltage changes"
    >
      <path d={powerPath} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} />
      <path
        d={errPath}
        fill="none"
        stroke="var(--color-warning)"
        strokeWidth={1.2}
        strokeDasharray="3 2"
      />
      <line
        x1={(vIdx / (samples.length - 1)) * 100}
        y1={0}
        x2={(vIdx / (samples.length - 1)) * 100}
        y2={60}
        stroke="var(--color-text)"
        strokeWidth={0.6}
        opacity={0.5}
      />
      <text x={2} y={8} fontSize={4} fill="var(--color-accent)">
        P ∝ V²
      </text>
      <text x={2} y={14} fontSize={4} fill="var(--color-warning)">
        P_err (illustrative)
      </text>
    </svg>
  );
}

function LoopChart({
  points,
}: {
  points: { i: number; exact: number; perforated: number }[];
}) {
  if (points.length === 0) return null;
  const ys = points.flatMap((p) => [p.exact, p.perforated]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const span = yMax - yMin || 1;
  const w = points.length - 1;
  const exactPath = points
    .map((p, i) => {
      const x = (i / w) * 100;
      const y = 100 - ((p.exact - yMin) / span) * 100;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const perfPath = points
    .map((p, i) => {
      const x = (i / w) * 100;
      const y = 100 - ((p.perforated - yMin) / span) * 100;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="ac-lab__svg" viewBox="0 0 100 50" role="img" aria-label="Running mean comparison">
      <path d={exactPath} fill="none" stroke="var(--color-accent)" strokeWidth={1} />
      <path
        d={perfPath}
        fill="none"
        stroke="var(--color-warning)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </svg>
  );
}

export default function ApproximateComputingLab() {
  const [tab, setTab] = useState("precision");

  const [bits, setBits] = useState(8);
  const [rangePreset, setRangePreset] = useState<QuantRangePreset>("demo");
  const preset = QUANT_PRESETS[rangePreset];
  const [x, setX] = useState(preset.defaultX);

  const [voltage, setVoltage] = useState(0.88);
  const [errorBudgetPct, setErrorBudgetPct] = useState(5);

  const [skipPct, setSkipPct] = useState(10);
  const [loopN, setLoopN] = useState(10000);
  const [loopSignal, setLoopSignal] = useState<"sine" | "noisy">("sine");

  const alpha = preset.alpha;
  const beta = preset.beta;

  const S = scaleFactor(alpha, beta, bits);
  const xq = quantize(x, alpha, beta, bits);
  const eps = quantizationError(x, xq);
  const varEps = quantizationVariance(S);
  const memFactor = memoryFactorVsFp32(bits);

  const hist = useMemo(() => {
    const samples = sampleForHistogram(
      alpha,
      beta,
      rangePreset === "weight" ? "gaussian" : "uniform",
      200,
      42
    );
    return buildHistogramBins(samples, alpha, beta, bits, 20);
  }, [alpha, beta, bits, rangePreset]);

  const power = normalizedPower(voltage);
  const pErr = timingErrorRate(voltage);
  const safe = isInSafeVoltageRegion(pErr, errorBudgetPct);

  const loopValues = useMemo(
    () => generateSignalValues(loopN, loopSignal, 99),
    [loopN, loopSignal]
  );
  const loopResult = useMemo(
    () => simulateLoopPerforation(loopValues, skipPct / 100, 12345),
    [loopValues, skipPct]
  );
  const loopSeries = useMemo(
    () => runningMeans(loopValues, skipPct / 100, 12345, 80),
    [loopValues, skipPct]
  );

  const quantMetrics: LabMetric[] = [
    { id: "s", label: "Step S", value: formatSci(S) },
    { id: "xq", label: "x_q", value: formatSci(xq) },
    { id: "eps", label: "|ε|", value: formatSci(Math.abs(eps)) },
    { id: "var", label: "Var(ε)", value: formatSci(varEps) },
    { id: "mem", label: "Memory vs FP32", value: `${memFactor.toFixed(1)}× smaller` },
  ];

  const energyMetrics: LabMetric[] = [
    { id: "p", label: "Relative power", value: formatPercent(power) },
    { id: "err", label: "P_err (model)", value: formatPercent(pErr) },
    { id: "safe", label: "Within error budget?", value: safe ? "Yes" : "No" },
  ];

  const speedup = loopSpeedup(skipPct / 100);
  const loopMetrics: LabMetric[] = [
    { id: "exec", label: "Iterations run", value: loopResult.executed.toLocaleString() },
    { id: "speed", label: "Speedup (≈)", value: `${speedup.toFixed(2)}×` },
    {
      id: "delta",
      label: "|mean error|",
      value: formatSci(Math.abs(loopResult.perforatedMean - loopResult.exactMean)),
    },
  ];

  const applyLlmInt4 = () => {
    setTab("precision");
    setRangePreset("symmetric");
    setBits(4);
    setX(0.12);
  };
  const applyUndervolt = () => {
    setTab("energy");
    setVoltage(0.75);
  };
  const applyFastLoop = () => {
    setTab("loops");
    setSkipPct(20);
    setLoopN(10000);
  };

  return (
    <LabShell
      intro={
        <>
          Three ways systems trade exactness for speed — <strong>precision</strong>,{" "}
          <strong>energy</strong>, and <strong>loop perforation</strong>. Use the tabs and presets
          below; curves in the Energy tab are illustrative, not SPICE-accurate.
        </>
      }
    >
      <ScenarioPresets
        aria-label="Approximate computing scenarios"
        presets={[
          { id: "llm", label: "LLM INT4", onSelect: applyLlmInt4 },
          { id: "volt", label: "Aggressive undervolt", onSelect: applyUndervolt },
          { id: "loop", label: "Fast approximate reduce", onSelect: applyFastLoop },
        ]}
      />

      <LabTabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel="Approximate computing modes" />

      <LabTabPanel tab={TABS[0]} active={tab === "precision"}>
        <div className="lab__grid">
          <div>
            <RangeControl
              id="ac-bits"
              label="Bit width b"
              min={2}
              max={16}
              step={1}
              value={bits}
              valueText={`${bits} bits`}
              onChange={setBits}
            />
            <RangeControl
              id="ac-x"
              label={`Value x (${preset.label})`}
              min={alpha}
              max={beta}
              step={(beta - alpha) / 200}
              value={x}
              valueText={formatSci(x)}
              onChange={setX}
            />
            <div className="lab__presets" role="group" aria-label="Quantization range">
              {(Object.keys(QUANT_PRESETS) as QuantRangePreset[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className="lab__btn lab__btn--ghost"
                  aria-pressed={rangePreset === id}
                  onClick={() => {
                    setRangePreset(id);
                    setX(QUANT_PRESETS[id].defaultX);
                  }}
                >
                  {QUANT_PRESETS[id].label}
                </button>
              ))}
            </div>
            <NumberLine alpha={alpha} beta={beta} x={x} xq={xq} bits={bits} />
            <div className="ac-lab__hist" aria-hidden>
              {hist.raw.map((c, i) => (
                <div
                  key={i}
                  className="ac-lab__hist-bar"
                  style={{ height: `${(c / Math.max(...hist.raw, 1)) * 100}%` }}
                />
              ))}
            </div>
            <div className="ac-lab__legend">
              <span>
                <i style={{ background: "var(--color-accent)" }} /> input distribution
              </span>
              <span>
                <i style={{ background: "var(--color-warning)" }} /> after quant (conceptual)
              </span>
            </div>
          </div>
          <MetricsAside metrics={quantMetrics} />
        </div>
        <PredictReveal
          prompt="Halving b (same range) multiplies Var(ε) by about 4×?"
          options={[
            { id: "yes", label: "Yes — S doubles, variance ∝ S²", isCorrect: true },
            { id: "no", label: "No — variance unchanged", isCorrect: false },
          ]}
          storageKey="ac-lab-var-scale"
        >
          <p className="lab__status">
            Current Var(ε) = {formatSci(varEps)} with S = {formatSci(S)}.
          </p>
        </PredictReveal>
      </LabTabPanel>

      <LabTabPanel tab={TABS[1]} active={tab === "energy"}>
        <div className="lab__grid">
          <div>
            <RangeControl
              id="ac-voltage"
              label="Supply voltage V (normalized)"
              min={0.6}
              max={1}
              step={0.01}
              value={voltage}
              valueText={voltage.toFixed(2)}
              onChange={setVoltage}
            />
            <RangeControl
              id="ac-budget"
              label="Error budget %"
              min={1}
              max={15}
              step={1}
              value={errorBudgetPct}
              valueText={`${errorBudgetPct}%`}
              onChange={setErrorBudgetPct}
            />
            <div className="ac-lab__chart">
              <EnergyChart voltage={voltage} vTh={0.85} k={40} />
            </div>
            <p className="ac-lab__callout">
              Real chips keep voltage in a guardband; approximate computing may operate with bounded{" "}
              P<sub>err</sub> past that band to save energy (∝ V²).
            </p>
          </div>
          <MetricsAside metrics={energyMetrics} />
        </div>
        <PredictReveal
          prompt="Can you minimize power and keep timing error at zero?"
          options={[
            { id: "no", label: "No — lower V trades power for error risk", isCorrect: true },
            { id: "yes", label: "Yes — always free", isCorrect: false },
          ]}
          storageKey="ac-lab-energy-trade"
        />
      </LabTabPanel>

      <LabTabPanel tab={TABS[2]} active={tab === "loops"}>
        <div className="lab__grid">
          <div>
            <RangeControl
              id="ac-skip"
              label="Skip rate"
              min={0}
              max={50}
              step={5}
              value={skipPct}
              valueText={`${skipPct}%`}
              onChange={setSkipPct}
            />
            <div className="lab__presets" role="group" aria-label="Loop length">
              {LOOP_N_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="lab__btn lab__btn--ghost"
                  aria-pressed={loopN === p.N}
                  onClick={() => setLoopN(p.N)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="lab__presets" role="group" aria-label="Signal type">
              <button
                type="button"
                className="lab__btn lab__btn--ghost"
                aria-pressed={loopSignal === "sine"}
                onClick={() => setLoopSignal("sine")}
              >
                Smooth sine
              </button>
              <button
                type="button"
                className="lab__btn lab__btn--ghost"
                aria-pressed={loopSignal === "noisy"}
                onClick={() => setLoopSignal("noisy")}
              >
                Noisy walk
              </button>
            </div>
            <div className="ac-lab__chart">
              <LoopChart points={loopSeries} />
            </div>
            <div className="ac-lab__legend">
              <span>
                <i style={{ background: "var(--color-accent)" }} /> exact running mean
              </span>
              <span>
                <i style={{ background: "var(--color-warning)" }} /> perforated mean
              </span>
            </div>
          </div>
          <MetricsAside metrics={loopMetrics} />
        </div>
        <ComparePanel
          leftLabel="Perforated mean"
          rightLabel="Exact mean"
          left={<p className="lab__status">{formatSci(loopResult.perforatedMean)}</p>}
          right={<p className="lab__status">{formatSci(loopResult.exactMean)}</p>}
        />
        <PredictReveal
          prompt="Skipping ~10% of iterations yields ~10% speedup?"
          options={[
            { id: "yes", label: "Roughly yes — fewer iterations executed", isCorrect: true },
            { id: "no", label: "No effect on runtime", isCorrect: false },
          ]}
          storageKey="ac-lab-loop-skip"
        />
      </LabTabPanel>
    </LabShell>
  );
}
