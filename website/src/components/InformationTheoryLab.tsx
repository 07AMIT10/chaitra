import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  crossEntropy,
  entropyVsUniform,
  formatBits,
  formatPercent,
  maxSurprisal,
  surprisal,
  uniformDistribution,
} from "../lib/information-theory-math";
import {
  BIASED_PRESET,
  FAIR_PRESET,
  SKEWED_PRESET,
  UNIFORM_PRESET,
  getPreset,
  resolveDistribution,
  type SymbolPresetId,
} from "../lib/information-theory-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./InformationTheoryLab.css";

export default function InformationTheoryLab() {
  const [presetId, setPresetId] = useState<SymbolPresetId>("biased");
  const [p0Pct, setP0Pct] = useState(99);
  const reducedMotion = usePrefersReducedMotion();

  const preset = useMemo(() => getPreset(presetId), [presetId]);
  const { symbols, probs } = useMemo(
    () => resolveDistribution(preset, p0Pct),
    [preset, p0Pct]
  );

  const stats = useMemo(() => entropyVsUniform(probs), [probs]);
  const uniform = useMemo(() => uniformDistribution(symbols.length), [symbols.length]);
  const maxP = Math.max(...probs, 1e-9);
  const rareIdx = probs.indexOf(Math.min(...probs.filter((p) => p > 0)));

  const applyFair = () => {
    setPresetId(FAIR_PRESET.presetId);
    setP0Pct(FAIR_PRESET.p0Pct);
  };

  const applyBiased = () => {
    setPresetId(BIASED_PRESET.presetId);
    setP0Pct(BIASED_PRESET.p0Pct);
  };

  const applySkewed = () => {
    setPresetId(SKEWED_PRESET.presetId);
    setP0Pct(SKEWED_PRESET.p0Pct);
  };

  const applyUniform = () => {
    setPresetId(UNIFORM_PRESET.presetId);
    setP0Pct(UNIFORM_PRESET.p0Pct);
  };

  const lowEntropy = stats.gap > 0.5;
  const nearMax = stats.gap < 0.05 && symbols.length > 1;

  const metrics: LabMetric[] = [
    { id: "preset", label: "Distribution", value: preset.label },
    {
      id: "h",
      label: "Entropy H(X)",
      value: formatBits(stats.h),
      tone: lowEntropy ? "warn" : nearMax ? "aha" : "default",
    },
    {
      id: "uniform",
      label: "Uniform baseline H",
      value: formatBits(stats.uniformH),
    },
    {
      id: "gap",
      label: "Headroom vs uniform",
      value: formatBits(stats.gap),
      tone: stats.gap > 0.3 ? "default" : "aha",
    },
    {
      id: "max-i",
      label: "Max surprisal I(x)",
      value: formatBits(maxSurprisal(probs), 2),
      tone: maxSurprisal(probs) > 3 ? "aha" : "default",
    },
    {
      id: "ce",
      label: "H(P, uniform)",
      value: formatBits(stats.crossEntropyUniform),
    },
    {
      id: "kl",
      label: "D_KL(P ‖ uniform)",
      value: formatBits(stats.klUniform),
    },
  ];

  if (lowEntropy && presetId === "biased") {
    metrics.push({
      id: "aha-bias",
      label: "Aha — rare event",
      value: `Tails at ${formatPercent(probs[1] ?? 0)} carries ${formatBits(surprisal(probs[1] ?? 0), 2)} — average only ${formatBits(stats.h)}.`,
      tone: "aha",
    });
  }

  const compareLeft = `Your H(X)=${formatBits(stats.h)} · max I(x)=${formatBits(maxSurprisal(probs), 2)} · H(P,Q_u)=${formatBits(stats.crossEntropyUniform)}`;
  const compareRight = `Uniform H=${formatBits(stats.uniformH)} · gap=${formatBits(stats.gap)} · D_KL=${formatBits(stats.klUniform)}`;

  const predictKey = `${presetId}-${p0Pct}`;

  return (
    <LabShell
      intro={
        <>
          Build a <strong>symbol histogram</strong> and read <strong>Shannon entropy</strong> (average
          bits per symbol) against the <strong>uniform baseline</strong> on the same alphabet. Per-symbol{" "}
          <strong>surprisal</strong> $I(x)=-\log_2 P(x)$ shows why rare outcomes carry more information —
          the README’s biased-coin example.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            {preset.tunableTwoSymbol ? (
              <RangeControl
                id="it-p0"
                label={`P(${symbols[0]})`}
                min={1}
                max={99}
                value={p0Pct}
                valueText={`${p0Pct}% / ${100 - p0Pct}%`}
                onChange={setP0Pct}
              />
            ) : null}
            <ScenarioPresets
              aria-label="Information theory distribution presets"
              presets={[
                { id: "fair", label: "Fair coin", onSelect: applyFair },
                { id: "biased", label: "Biased 99/1", onSelect: applyBiased },
                { id: "skewed", label: "Skewed stream", onSelect: applySkewed },
                { id: "uniform", label: "Uniform ×4", onSelect: applyUniform },
              ]}
            />
          </div>
          <div
            className={`it-lab__chart${reducedMotion ? " it-lab__chart--static" : ""}`}
            role="img"
            aria-label={`Symbol histogram: entropy ${stats.h.toFixed(3)} bits vs uniform ${stats.uniformH.toFixed(3)}`}
          >
            {symbols.map((sym, i) => {
              const p = probs[i] ?? 0;
              const iSurprise = surprisal(p);
              const isRare = i === rareIdx && p < maxP;
              return (
                <div key={sym} className="it-lab__col">
                  <div
                    className={`it-lab__bar${isRare ? " it-lab__bar--rare" : ""}`}
                    style={{ height: `${(p / maxP) * 100}%` }}
                    title={`${sym}: P=${formatPercent(p)} · I=${formatBits(iSurprise, 2)}`}
                  />
                  <span className="it-lab__label">{sym}</span>
                  <span className="it-lab__surprise">{formatBits(iSurprise, 2)}</span>
                </div>
              );
            })}
          </div>
          <table className="it-lab__table">
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col">P(x)</th>
                <th scope="col">I(x)</th>
                <th scope="col">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((sym, i) => {
                const p = probs[i] ?? 0;
                const contrib = p > 0 ? -p * Math.log2(p) : 0;
                return (
                  <tr key={sym}>
                    <td>{sym}</td>
                    <td>{formatPercent(p)}</td>
                    <td>{formatBits(surprisal(p), 2)}</td>
                    <td>{formatBits(contrib, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="lab__hint">
            Bar height ∝ probability; number under each bar is surprisal. Entropy is the sum of the
            contribution column (expected surprisal).
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={predictKey}
        prompt={
          <>
            For <strong>{preset.label}</strong>
            {preset.tunableTwoSymbol ? (
              <>
                {" "}
                with P({symbols[0]})=<strong>{p0Pct}%</strong>
              </>
            ) : null}
            , will <strong>H(X)</strong> stay <strong>below</strong> the uniform baseline on{" "}
            <strong>{symbols.length}</strong> symbols?
          </>
        }
        revealLabel="Show entropy vs uniform baseline"
      >
        <ComparePanel
          leftLabel="Your distribution P"
          rightLabel="Uniform Q on same alphabet"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          H(X)={formatBits(stats.h)} vs uniform {formatBits(stats.uniformH)} —{" "}
          {stats.gap > 0.01 ? (
            <>
              <strong>{formatBits(stats.gap)}</strong> bits of compression headroom (skewed → predictable).
            </>
          ) : (
            <>near maximum uncertainty for {symbols.length} symbols.</>
          )}{" "}
          Cross-entropy H(P, Q<sub>u</sub>)={formatBits(crossEntropy(probs, uniform))} matches H + D_KL
          here.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {preset.label}: H={formatBits(stats.h)}, uniform={formatBits(stats.uniformH)}, rarest symbol
        surprisal {formatBits(surprisal(probs[rareIdx] ?? 0), 2)}.{" "}
        {lowEntropy
          ? "Skewed → lower entropy; rare events dominate surprisal."
          : "Balanced → entropy approaches the uniform ceiling."}
      </p>
    </LabShell>
  );
}
