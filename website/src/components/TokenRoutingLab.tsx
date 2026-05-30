import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  coefficientOfVariation,
  formatLoad,
  formatRatio,
  idealLoadPerExpert,
  loadImbalanceRatio,
} from "../lib/token-routing-math";
import {
  HOTSPOT_PRESET,
  MIXTRAL_TOP2_PRESET,
  SWITCH_TOP1_PRESET,
  simulateSkewedRouting,
  simulateTopKTokenRouting,
} from "../lib/token-routing-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./TokenRoutingLab.css";

export default function TokenRoutingLab() {
  const [experts, setExperts] = useState(8);
  const [tokens, setTokens] = useState(256);
  const [topK, setTopK] = useState(2);
  const [seed, setSeed] = useState(42);
  const [skewed, setSkewed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const loads = useMemo(
    () =>
      skewed
        ? simulateSkewedRouting(experts, tokens, topK)
        : simulateTopKTokenRouting(experts, tokens, topK, seed),
    [experts, tokens, topK, seed, skewed]
  );

  const ideal = idealLoadPerExpert(tokens, topK, experts);
  const maxLoad = Math.max(...loads, 1);
  const imbalance = loadImbalanceRatio(maxLoad, ideal);
  const cv = coefficientOfVariation(loads);

  const applySwitch = () => {
    setSkewed(false);
    setExperts(SWITCH_TOP1_PRESET.experts);
    setTokens(SWITCH_TOP1_PRESET.tokens);
    setTopK(SWITCH_TOP1_PRESET.topK);
    setSeed(SWITCH_TOP1_PRESET.seed);
  };

  const applyMixtral = () => {
    setSkewed(false);
    setExperts(MIXTRAL_TOP2_PRESET.experts);
    setTokens(MIXTRAL_TOP2_PRESET.tokens);
    setTopK(MIXTRAL_TOP2_PRESET.topK);
    setSeed(MIXTRAL_TOP2_PRESET.seed);
  };

  const applyHotspot = () => {
    setSkewed(true);
    setExperts(HOTSPOT_PRESET.experts);
    setTokens(HOTSPOT_PRESET.tokens);
    setTopK(HOTSPOT_PRESET.topK);
  };

  const overloaded = imbalance > 1.5;

  const metrics: LabMetric[] = [
    { id: "e", label: "Experts", value: String(experts) },
    { id: "t", label: "Tokens", value: String(tokens) },
    { id: "k", label: "Top-K", value: String(topK) },
    { id: "ideal", label: "Ideal load", value: formatLoad(ideal) },
    {
      id: "max",
      label: "Max load",
      value: formatLoad(maxLoad),
      tone: overloaded ? "warn" : "default",
    },
    {
      id: "imb",
      label: "Max / ideal",
      value: formatRatio(imbalance),
      tone: overloaded ? "warn" : cv < 0.15 ? "aha" : "default",
    },
    { id: "cv", label: "Load CV", value: formatRatio(cv) },
  ];

  if (skewed && overloaded) {
    metrics.push({
      id: "aha-hot",
      label: "Load collapse",
      value: `E0 takes ${formatLoad(loads[0]!)} vs ideal ${formatLoad(ideal)} — need auxiliary loss / expert-choice routing.`,
      tone: "warn",
    });
  }

  const compareLeft = loads
    .slice(0, 6)
    .map((l, i) => `E${i}:${formatLoad(l)}`)
    .join(" · ");
  const compareRight = `Ideal uniform: ${formatLoad(ideal)} per expert · total assignments ${tokens * topK}`;

  const predictKey = `${experts}-${tokens}-${topK}-${skewed}-${seed}`;

  return (
    <LabShell
      intro={
        <>
          Batch <strong>Top-K token routing</strong>: each token picks the highest-scoring experts (seeded
          random gates) or a <strong>hotspot</strong> skew preset. Compare expert loads to the uniform{" "}
          <strong>ideal</strong> (tokens × K) / E.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="tr-e"
              label="Experts"
              min={2}
              max={12}
              value={experts}
              valueText={`${experts} experts`}
              onChange={(v) => {
                setSkewed(false);
                setExperts(v);
              }}
            />
            <RangeControl
              id="tr-t"
              label="Tokens"
              min={40}
              max={500}
              step={10}
              value={tokens}
              valueText={`${tokens} tokens`}
              onChange={setTokens}
            />
            <RangeControl
              id="tr-k"
              label="Top-K"
              min={1}
              max={4}
              value={topK}
              valueText={`top ${topK}`}
              onChange={setTopK}
            />
            <ScenarioPresets
              aria-label="Token routing presets"
              presets={[
                { id: "switch", label: "Switch Top-1", onSelect: applySwitch },
                { id: "mixtral", label: "Mixtral Top-2", onSelect: applyMixtral },
                { id: "hot", label: "Hotspot skew", onSelect: applyHotspot },
              ]}
            />
          </div>
          <svg
            className={`tr-lab__bars${reducedMotion ? " tr-lab__bars--static" : ""}`}
            viewBox={`0 0 ${loads.length * 36} 100`}
            role="img"
            aria-label={`Expert loads; max ${maxLoad}, ideal ${ideal.toFixed(1)}`}
          >
            {loads.map((l, i) => {
              const h = maxLoad > 0 ? (l / maxLoad) * 72 : 0;
              const hot = l === maxLoad && overloaded;
              return (
                <g key={i}>
                  <rect
                    x={i * 36 + 8}
                    y={88 - h}
                    width={20}
                    height={h}
                    fill={hot ? "var(--color-error)" : "var(--color-accent)"}
                  >
                    <title>{`Expert ${i}: ${l} tokens`}</title>
                  </rect>
                  <text x={i * 36 + 18} y={96} textAnchor="middle" fontSize="8" fill="var(--color-muted)">
                    E{i}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="tr-lab__ideal" aria-hidden="true">
            Ideal line: {formatLoad(ideal)}
          </div>
          <ComparePanel
            leftLabel="Observed loads"
            rightLabel="Uniform ideal"
            left={compareLeft}
            right={compareRight}
          />
          <PredictReveal
            key={predictKey}
            prompt={
              <>
                Will <strong>max load</strong> exceed <strong>1.5×</strong> the ideal uniform load (
                {formatLoad(ideal)})?
              </>
            }
            storageKey="token-routing"
            options={[
              { id: "yes", label: "Yes — max load exceeds 1.5× ideal", isCorrect: overloaded },
              { id: "no", label: "No — max load is within 1.5× ideal", isCorrect: !overloaded },
            ]}
            revealLabel="Reveal imbalance"
          >
            <p>
              {overloaded
                ? `Yes — max/ideal = ${formatRatio(imbalance)} (${skewed ? "hotspot routing" : "variance"}).`
                : `No — max/ideal = ${formatRatio(imbalance)}; loads near balanced.`}
            </p>
          </PredictReveal>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Max load {formatLoad(maxLoad)} vs ideal {formatLoad(ideal)} (imbalance {formatRatio(imbalance)}).
        {skewed ? " Hotspot routing — expert 0 overloaded." : ""}
      </p>
    </LabShell>
  );
}
