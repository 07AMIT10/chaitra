import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { streamingSketchDemo } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function StreamingAlgoLab() {
  const [events, setEvents] = useState(1000);
  const demo = useMemo(() => streamingSketchDemo(events), [events]);

  const metrics: LabMetric[] = [
    { id: "events", label: "Stream events", value: String(events) },
    { id: "cms", label: "CMS error est.", value: demo.cms.toFixed(1) },
    { id: "hll", label: "HLL buckets", value: demo.hll.toFixed(0) },
    { id: "bloom", label: "Bloom FP est.", value: demo.bloom.toFixed(2) },
  ];

  return (
    <MiniSimLab
      intro={<>One synthetic stream feeding Bloom + CMS + HLL sketches together.</>}
      controls={[{ id: "e", label: "Events", min: 100, max: 5000, step: 100, value: events, valueText: `${events} events` }]}
      onControlChange={(_, v) => setEvents(v)}
      metrics={metrics}
      status={`${events} events processed through sketch chain.`}
    >
      <div className="minisim__bars" role="img" aria-label="Sketch metrics">
        <div className="minisim__bar" style={{ height: "60%" }} title="CMS" />
        <div className="minisim__bar" style={{ height: "80%" }} title="HLL" />
        <div className="minisim__bar" style={{ height: "30%" }} title="Bloom" />
      </div>
    </MiniSimLab>
  );
}
