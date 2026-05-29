import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { bayesianUpdate } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function BayesianLab() {
  const [priorPct, setPriorPct] = useState(20);
  const [likePct, setLikePct] = useState(80);
  const posterior = useMemo(() => bayesianUpdate(priorPct / 100, likePct / 100), [priorPct, likePct]);

  const metrics: LabMetric[] = [
    { id: "prior", label: "Prior", value: `${priorPct}%` },
    { id: "like", label: "P(E|H)", value: `${likePct}%` },
    { id: "post", label: "Posterior", value: `${(posterior * 100).toFixed(1)}%`, tone: "aha" },
  ];

  return (
    <MiniSimLab
      intro={<>Bayes: posterior ∝ prior × likelihood. Slide evidence strength.</>}
      controls={[
        { id: "p", label: "Prior P(H)", min: 1, max: 99, value: priorPct, valueText: `${priorPct}%` },
        { id: "l", label: "Likelihood P(E|H)", min: 10, max: 99, value: likePct, valueText: `${likePct}%` },
      ]}
      onControlChange={(id, v) => (id === "p" ? setPriorPct(v) : setLikePct(v))}
      metrics={metrics}
      status={`Posterior P(H|E) = ${(posterior * 100).toFixed(1)}%.`}
    >
      <div className="minisim__bars" role="img" aria-label="Prior vs posterior">
        <div className="minisim__bar" style={{ height: `${priorPct}%`, opacity: 0.5 }} title="Prior" />
        <div className="minisim__bar" style={{ height: `${posterior * 100}%` }} title="Posterior" />
      </div>
    </MiniSimLab>
  );
}
