import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  activeExpertFraction,
  formatPercent,
  formatScore,
} from "../lib/mixture-of-experts-math";
import {
  EXPERT_WEIGHTS,
  LAW_PRESET,
  QUANTUM_PRESET,
  TOP1_PRESET,
  TOKEN_PRESETS,
  getTokenPreset,
  routeToken,
  type TokenPresetId,
} from "../lib/mixture-of-experts-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./MixtureOfExpertsLab.css";

const EXPERT_LABELS = ["Physics", "Law", "Bio", "History"];

export default function MixtureOfExpertsLab() {
  const [tokenId, setTokenId] = useState<TokenPresetId>("physics");
  const [topK, setTopK] = useState(2);
  const reducedMotion = usePrefersReducedMotion();

  const token = getTokenPreset(tokenId).embedding;
  const { scores, routed, probs } = useMemo(() => routeToken(token, topK), [token, topK]);

  const maxScore = Math.max(...scores, 0.01);
  const denseFLOPs = EXPERT_WEIGHTS.length;
  const sparseFLOPs = topK;
  const savings = 1 - sparseFLOPs / denseFLOPs;

  const applyQuantum = () => {
    setTokenId(QUANTUM_PRESET.tokenId);
    setTopK(QUANTUM_PRESET.topK);
  };

  const applyLaw = () => {
    setTokenId(LAW_PRESET.tokenId);
    setTopK(LAW_PRESET.topK);
  };

  const applyTop1 = () => {
    setTokenId(TOP1_PRESET.tokenId);
    setTopK(TOP1_PRESET.topK);
  };

  const topExpert = routed[0] ?? 0;
  const dominated = scores[topExpert]! > scores.reduce((a, b) => a + b, 0) / scores.length * 1.4;

  const metrics: LabMetric[] = [
    { id: "token", label: "Token", value: getTokenPreset(tokenId).label },
    { id: "k", label: "Top-K", value: String(topK) },
    {
      id: "active",
      label: "Active experts",
      value: routed.map((i) => `E${i}`).join(", "),
      tone: topK === 1 ? "aha" : "default",
    },
    {
      id: "sparse",
      label: "Compute vs dense",
      value: `${sparseFLOPs}/${denseFLOPs} experts (${formatPercent(savings)} saved)`,
      tone: savings >= 0.5 ? "aha" : "default",
    },
    {
      id: "top-gate",
      label: "Top gate prob",
      value: formatPercent(probs[topExpert] ?? 0, 1),
    },
  ];

  if (dominated && topK <= 2) {
    metrics.push({
      id: "aha-route",
      label: "Router confidence",
      value: `E${topExpert} gate ${formatScore(scores[topExpert]!)} — clear specialist match.`,
      tone: "aha",
    });
  }

  const compareLeft = routed
    .map((i) => `E${i}: gate=${formatScore(scores[i]!)} · P=${formatPercent(probs[i] ?? 0, 1)}`)
    .join(" · ");
  const compareRight = `Dense: all ${denseFLOPs} experts · Sparse: ${sparseFLOPs} (${formatPercent(activeExpertFraction(denseFLOPs, topK))} active)`;

  const predictKey = `${tokenId}-${topK}`;

  return (
    <LabShell
      intro={
        <>
          Toy <strong>gating router</strong>: token embedding dot-products against expert weight rows,
          <strong> Top-K</strong> selection, and gate probabilities — same sparse pattern as Mixtral-style MoE
          in the README.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <div className="lab__presets" role="group" aria-label="Token embedding">
              {TOKEN_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`lab__btn lab__btn--ghost${tokenId === p.id ? " lab__btn--active" : ""}`}
                  onClick={() => setTokenId(p.id)}
                  aria-pressed={tokenId === p.id}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <RangeControl
              id="moe-k"
              label="Top-K experts"
              min={1}
              max={4}
              value={topK}
              valueText={`top ${topK}`}
              onChange={setTopK}
            />
            <ScenarioPresets
              aria-label="MoE routing presets"
              presets={[
                { id: "quantum", label: "Quantum → physics", onSelect: applyQuantum },
                { id: "law", label: "Law token", onSelect: applyLaw },
                { id: "top1", label: "Top-1 bio", onSelect: applyTop1 },
              ]}
            />
          </div>
          <div
            className={`moe-lab__grid${reducedMotion ? " moe-lab__grid--static" : ""}`}
            role="img"
            aria-label={`Expert gate scores; active experts ${routed.join(", ")}`}
          >
            {EXPERT_WEIGHTS.map((_, i) => {
              const active = routed.includes(i);
              const h = (scores[i]! / maxScore) * 100;
              return (
                <div
                  key={i}
                  className={`moe-lab__cell${active ? " moe-lab__cell--on" : ""}`}
                  title={`${EXPERT_LABELS[i]}: score ${formatScore(scores[i]!)} · P=${formatPercent(probs[i] ?? 0, 1)}`}
                >
                  <div className="moe-lab__bar" style={{ height: `${h}%` }} />
                  <span className="moe-lab__label">E{i}</span>
                  <span className="moe-lab__score">{formatScore(scores[i]!)}</span>
                </div>
              );
            })}
          </div>
          <ComparePanel
            leftLabel="Sparse Top-K route"
            rightLabel="Dense baseline"
            left={compareLeft}
            right={compareRight}
          />
          <PredictReveal
            key={predictKey}
            prompt={
              <>
                With <strong>Top-K={topK}</strong> on this token, how many of the {denseFLOPs} experts stay
                idle?
              </>
            }
            revealLabel="Reveal active fraction"
          >
            <p>
              {topK} of {denseFLOPs} experts active ({formatPercent(activeExpertFraction(denseFLOPs, topK))})
              — {formatPercent(savings)} fewer expert FLOPs than dense.
            </p>
          </PredictReveal>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Token routed to experts {routed.join(", ")}; gate scores {scores.map((s, i) => `E${i}=${formatScore(s)}`).join(", ")}.
      </p>
    </LabShell>
  );
}
