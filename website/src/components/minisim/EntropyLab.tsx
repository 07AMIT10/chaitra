import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { entropy } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function EntropyLab() {
  const [p1, setP1] = useState(50);
  const probs = useMemo(() => [p1 / 100, 1 - p1 / 100], [p1]);
  const h = entropy(probs);
  const uniform = entropy([0.5, 0.5]);

  const metrics: LabMetric[] = [
    { id: "h", label: "Entropy H", value: `${h.toFixed(3)} bits` },
    { id: "uniform", label: "Uniform baseline", value: `${uniform.toFixed(3)} bits` },
    { id: "surprise", label: "Max surprise", value: `${(-Math.log2(Math.min(...probs))).toFixed(2)} bits` },
  ];

  return (
    <MiniSimLab
      intro={<>Build a two-symbol distribution and watch entropy vs uniform baseline.</>}
      controls={[{ id: "p", label: "P(symbol A)", min: 1, max: 99, value: p1, valueText: `${p1}% / ${100 - p1}%` }]}
      onControlChange={(_, v) => setP1(v)}
      metrics={metrics}
      status={`H = ${h.toFixed(3)} bits. ${h < uniform ? "Skewed → lower entropy." : "Balanced → higher entropy."}`}
    >
      <div className="minisim__bars" role="img" aria-label="Symbol histogram">
        <div className="minisim__bar" style={{ height: `${probs[0] * 200}px` }} title={`A: ${p1}%`} />
        <div className="minisim__bar" style={{ height: `${probs[1] * 200}px` }} title={`B: ${100 - p1}%`} />
      </div>
    </MiniSimLab>
  );
}
