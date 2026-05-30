import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  attentionOutput,
  formatWeight,
  scaleFactor,
  topAttentionIndex,
} from "../lib/transformer-attention-math";
import {
  ANIMAL_FOCUS_PRESET,
  IT_PRONOUN_PRESET,
  SENTENCE_KEYS,
  SENTENCE_VALUES,
  STREET_FOCUS_PRESET,
  computeAttention,
  queryFromSliders,
} from "../lib/transformer-attention-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./TransformerAttentionLab.css";

export default function TransformerAttentionLab() {
  const [q0Pct, setQ0Pct] = useState(IT_PRONOUN_PRESET.q0);
  const [q1Pct, setQ1Pct] = useState(IT_PRONOUN_PRESET.q1);
  const reducedMotion = usePrefersReducedMotion();

  const query = useMemo(() => queryFromSliders(q0Pct, q1Pct), [q0Pct, q1Pct]);
  const { scores, weights, labels } = useMemo(() => computeAttention(query), [query]);
  const dim = query.length;
  const scale = scaleFactor(dim);
  const topIdx = topAttentionIndex(weights);
  const uniform = 1 / weights.length;
  const context = useMemo(() => attentionOutput(weights, SENTENCE_VALUES), [weights]);

  const applyIt = () => {
    setQ0Pct(IT_PRONOUN_PRESET.q0);
    setQ1Pct(IT_PRONOUN_PRESET.q1);
  };

  const applyStreet = () => {
    setQ0Pct(STREET_FOCUS_PRESET.q0);
    setQ1Pct(STREET_FOCUS_PRESET.q1);
  };

  const applyAnimal = () => {
    setQ0Pct(ANIMAL_FOCUS_PRESET.q0);
    setQ1Pct(ANIMAL_FOCUS_PRESET.q1);
  };

  const pronounResolved = topIdx === 1 && weights[1]! > 0.4;
  const maxW = Math.max(...weights);

  const metrics: LabMetric[] = [
    {
      id: "q",
      label: "Query Q",
      value: `[${query.map((x) => x.toFixed(2)).join(", ")}]`,
    },
    { id: "scale", label: "1/√d_k", value: scale.toFixed(3) },
    {
      id: "top",
      label: "Top attention",
      value: `${labels[topIdx]} (${formatWeight(weights[topIdx]!)})`,
      tone: pronounResolved ? "aha" : "default",
    },
    {
      id: "sum",
      label: "Σ weights",
      value: weights.reduce((a, b) => a + b, 0).toFixed(4),
    },
    {
      id: "ctx",
      label: "Output V̄",
      value: `[${context.map((x) => x.toFixed(2)).join(", ")}]`,
    },
  ];

  if (pronounResolved) {
    metrics.push({
      id: "aha-it",
      label: "Pronoun cue",
      value: `"it" aligns with "${labels[1]}" — README animal/tired example.`,
      tone: "aha",
    });
  }

  const compareLeft = labels
    .map((l, i) => `${l}: α=${formatWeight(weights[i]!)}`)
    .join(" · ");
  const compareRight = labels.map((l) => `${l}: uniform ${formatWeight(uniform)}`).join(" · ");

  const predictKey = `${q0Pct}-${q1Pct}`;

  return (
    <LabShell
      intro={
        <>
          Toy <strong>scaled dot-product attention</strong>: adjust the 2-D query, compare dot scores to
          four keys, softmax to weights, then blend <strong>Value</strong> vectors — same flow as the README
          pronoun example.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="att-q0"
              label="Q[0]"
              min={1}
              max={100}
              value={q0Pct}
              valueText={query[0]!.toFixed(2)}
              onChange={setQ0Pct}
            />
            <RangeControl
              id="att-q1"
              label="Q[1]"
              min={1}
              max={100}
              value={q1Pct}
              valueText={query[1]!.toFixed(2)}
              onChange={setQ1Pct}
            />
            <ScenarioPresets
              aria-label="Attention query presets"
              presets={[
                { id: "it", label: '"it" → animal', onSelect: applyIt },
                { id: "street", label: "Street focus", onSelect: applyStreet },
                { id: "animal", label: "Animal focus", onSelect: applyAnimal },
              ]}
            />
          </div>
          <div
            className={`att-lab__heatmap${reducedMotion ? " att-lab__heatmap--static" : ""}`}
            role="img"
            aria-label={`Attention weights; top ${labels[topIdx]} at ${formatWeight(maxW)}`}
          >
            {weights.map((w, i) => (
              <div
                key={labels[i]}
                className={`att-lab__cell${i === topIdx ? " att-lab__cell--top" : ""}`}
                style={{ opacity: 0.25 + w * 0.75 }}
                title={`${labels[i]}: score ${scores[i]!.toFixed(2)} · α=${formatWeight(w)}`}
              >
                <span className="att-lab__word">{labels[i]}</span>
                <span className="att-lab__w">{formatWeight(w)}</span>
                <span className="att-lab__score">s={scores[i]!.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <ComparePanel
            leftLabel="Softmax attention α"
            rightLabel="Uniform baseline"
            left={compareLeft}
            right={compareRight}
          />
          <PredictReveal
            key={predictKey}
            prompt={
              <>
                For the current query, which key gets the <strong>highest</strong> softmax weight?
              </>
            }
            revealLabel="Reveal top key"
          >
            <p>
              <strong>{labels[topIdx]}</strong> (α={formatWeight(weights[topIdx]!)}) —{" "}
              {pronounResolved
                ? "matches the README animal referent for “it”."
                : 'try the “it → animal” preset.'}
            </p>
          </PredictReveal>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Softmax weights sum to {weights.reduce((a, b) => a + b, 0).toFixed(3)}; top key &quot;{labels[topIdx]}&quot;.
      </p>
    </LabShell>
  );
}
