import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { uncertainQuery, probDbTupleConfidence } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

const TUPLES = [
  { id: "t1", conf: 0.92 },
  { id: "t2", conf: 0.75 },
  { id: "t3", conf: 0.45 },
  { id: "t4", conf: 0.88 },
];

export default function ProbDBLab() {
  const [thresholdPct, setThresholdPct] = useState(70);
  const threshold = thresholdPct / 100;
  const results = useMemo(
    () => TUPLES.map((t) => ({ ...t, match: uncertainQuery(t.conf, threshold) })),
    [threshold]
  );
  const joint = probDbTupleConfidence(results.filter((r) => r.match).map((r) => r.conf));

  const metrics: LabMetric[] = [
    { id: "thresh", label: "Confidence threshold", value: `${thresholdPct}%` },
    { id: "matches", label: "Matching tuples", value: String(results.filter((r) => r.match).length) },
    { id: "joint", label: "Joint confidence", value: joint.toFixed(3) },
  ];

  return (
    <MiniSimLab
      intro={<>Query uncertain tuples by confidence score threshold.</>}
      controls={[{ id: "t", label: "Threshold", min: 30, max: 95, value: thresholdPct, valueText: `${thresholdPct}% confidence` }]}
      onControlChange={(_, v) => setThresholdPct(v)}
      metrics={metrics}
      status={`${results.filter((r) => r.match).length} of ${TUPLES.length} tuples pass threshold.`}
    >
      <ul className="lab__hint">
        {results.map((r) => (
          <li key={r.id}>
            {r.id}: {(r.conf * 100).toFixed(0)}% {r.match ? "✓" : "✗"}
          </li>
        ))}
      </ul>
    </MiniSimLab>
  );
}
