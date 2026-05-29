import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { windowAggregate } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function StreamingAnalyticsLab() {
  const [windowSize, setWindowSize] = useState(5);
  const events = useMemo(() => Array.from({ length: 30 }, (_, i) => (i % 7) + 1), []);
  const agg = useMemo(() => windowAggregate(events, windowSize), [events, windowSize]);

  const metrics: LabMetric[] = [
    { id: "win", label: "Window size", value: String(windowSize) },
    { id: "last", label: "Latest aggregate", value: String(agg[agg.length - 1]) },
  ];

  return (
    <MiniSimLab
      intro={<>Tumbling window sum over a scrolling event timeline.</>}
      controls={[{ id: "w", label: "Window size", min: 2, max: 15, value: windowSize, valueText: `${windowSize} events` }]}
      onControlChange={(_, v) => setWindowSize(v)}
      metrics={metrics}
      status={`Window-${windowSize} sum at latest event: ${agg[agg.length - 1]}.`}
    >
      <div className="minisim__line" role="img" aria-label="Windowed aggregate">
        {agg.map((v, i) => (
          <div key={i} className="minisim__tick" style={{ height: `${(v / Math.max(...agg)) * 100}%` }} />
        ))}
      </div>
    </MiniSimLab>
  );
}
