import { useMemo, useState } from "react";
import { entropyBits, softmaxAtTemperature } from "../../lib/llm-temperature-math";
import { LabShell, MetricsAside, PredictReveal, RangeControl, type LabMetric } from "../lab";

const LOGITS = [2.0, 1.0, 0.2];
const TOKENS = ["the", "cat", "sat"];

export default function LlmTemperatureLab() {
  const [temperature, setTemperature] = useState(1.0);

  const probs = useMemo(() => softmaxAtTemperature(LOGITS, temperature), [temperature]);
  const ent = useMemo(() => entropyBits(probs), [probs]);

  const metrics: LabMetric[] = [
    { id: "t", label: "Temperature T", value: temperature.toFixed(2) },
    { id: "ent", label: "Entropy (bits)", value: ent.toFixed(2) },
    {
      id: "top",
      label: "Top token",
      value: `${TOKENS[probs.indexOf(Math.max(...probs))]} (${(Math.max(...probs) * 100).toFixed(0)}%)`,
    },
  ];

  return (
    <LabShell intro={<>Sample next-token distribution over toy logits as temperature changes.</>}>
      <div className="lab__grid">
        <div>
          <RangeControl
            id="llm-temp"
            label="Temperature T"
            min={0.2}
            max={3}
            step={0.1}
            value={temperature}
            valueText={`T = ${temperature.toFixed(1)}`}
            onChange={setTemperature}
          />
          <svg
            className="preview-lab__chart"
            viewBox="0 0 240 100"
            role="img"
            aria-label="Softmax probabilities for three tokens"
          >
            {probs.map((p, i) => (
              <g key={TOKENS[i]}>
                <rect
                  x={20 + i * 70}
                  y={90 - p * 80}
                  width={50}
                  height={p * 80}
                  fill="var(--color-accent)"
                  opacity={0.85}
                />
                <text x={45 + i * 70} y={96} textAnchor="middle" fill="var(--color-muted)" fontSize="10">
                  {TOKENS[i]}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <PredictReveal
        prompt="As T → 0, does the distribution sharpen toward one token?"
        options={[
          { id: "yes", label: "Yes — approaches argmax", isCorrect: true },
          { id: "flat", label: "No — stays uniform", isCorrect: false },
        ]}
        storageKey="preview-llm-temperature"
      >
        <p className="lab__status">Entropy = {ent.toFixed(2)} bits; lower T concentrates mass.</p>
      </PredictReveal>
    </LabShell>
  );
}
