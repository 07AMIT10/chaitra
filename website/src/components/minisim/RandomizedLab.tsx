import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { lasVegasSuccess } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function RandomizedLab() {
  const [trials, setTrials] = useState(5);
  const [p, setP] = useState(30);
  const success = useMemo(() => lasVegasSuccess(trials, p / 100), [trials, p]);

  const metrics: LabMetric[] = [
    { id: "trials", label: "Max trials", value: String(trials) },
    { id: "p", label: "P(success/trial)", value: `${p}%` },
    { id: "success", label: "P(eventual success)", value: `${(success * 100).toFixed(1)}%` },
  ];

  return (
    <MiniSimLab
      intro={<>Las Vegas: keep trying until success. P(eventual) = 1 − (1−p)^trials.</>}
      controls={[
        { id: "t", label: "Max trials", min: 1, max: 20, value: trials, valueText: `${trials} trials` },
        { id: "p", label: "Success probability", min: 5, max: 90, value: p, valueText: `${p}% per trial` },
      ]}
      onControlChange={(id, v) => (id === "t" ? setTrials(v) : setP(v))}
      metrics={metrics}
      status={`${(success * 100).toFixed(1)}% chance of success within ${trials} trials.`}
    >
      <div className="minisim__bars" role="img" aria-label="Success probability">
        <div className="minisim__bar" style={{ height: `${success * 100}%` }} />
      </div>
    </MiniSimLab>
  );
}
