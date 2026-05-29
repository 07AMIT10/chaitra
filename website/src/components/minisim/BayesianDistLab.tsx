import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { bayesianNetworkBelief } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function BayesianDistLab() {
  const [prior, setPrior] = useState(10);
  const [evidence, setEvidence] = useState(70);
  const belief = useMemo(() => bayesianNetworkBelief(prior / 100, evidence / 100), [prior, evidence]);

  const metrics: LabMetric[] = [
    { id: "prior", label: "P(failure)", value: `${prior}%` },
    { id: "evidence", label: "Sensor P(alarm|fail)", value: `${evidence}%` },
    { id: "belief", label: "P(fail|alarm)", value: `${(belief * 100).toFixed(1)}%` },
  ];

  return (
    <MiniSimLab
      intro={<>Noisy telemetry: update belief about cluster failure given an alarm.</>}
      controls={[
        { id: "p", label: "Prior failure", min: 1, max: 50, value: prior, valueText: `${prior}%` },
        { id: "e", label: "Alarm strength", min: 30, max: 99, value: evidence, valueText: `${evidence}%` },
      ]}
      onControlChange={(id, v) => (id === "p" ? setPrior(v) : setEvidence(v))}
      metrics={metrics}
      status={`Belief after alarm: ${(belief * 100).toFixed(1)}% failure probability.`}
    >
      <div className="minisim__grid" role="img" aria-label="Belief network">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`minisim__cell ${i < belief * 9 ? "minisim__cell--on" : ""}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
