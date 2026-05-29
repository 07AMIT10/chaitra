import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { attentionWeights } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function AttentionLab() {
  const [q0, setQ0] = useState(8);
  const [q1, setQ1] = useState(4);
  const q = useMemo(() => [q0 / 10, q1 / 10], [q0, q1]);
  const k = [0.9, 0.5, 0.2, 0.1];
  const weights = useMemo(() => attentionWeights(q, k), [q]);

  const metrics: LabMetric[] = weights.map((w, i) => ({
    id: `k${i}`,
    label: `Attn key ${i}`,
    value: w.toFixed(3),
  }));

  return (
    <MiniSimLab
      intro={<>Scaled dot-product attention on a 4×4 toy Q/K pair.</>}
      controls={[
        { id: "q0", label: "Q[0]", min: 1, max: 10, value: q0, valueText: `${(q0 / 10).toFixed(1)}` },
        { id: "q1", label: "Q[1]", min: 1, max: 10, value: q1, valueText: `${(q1 / 10).toFixed(1)}` },
      ]}
      onControlChange={(id, v) => (id === "q0" ? setQ0(v) : setQ1(v))}
      metrics={metrics}
      status={`Softmax weights sum to ${weights.reduce((a, b) => a + b, 0).toFixed(3)}.`}
    >
      <div className="minisim__matrix" style={{ gridTemplateColumns: "repeat(4, 1fr)" }} role="img" aria-label="Attention heatmap">
        {weights.map((w, i) => (
          <span key={i} style={{ opacity: 0.3 + w * 0.7 }}>{w.toFixed(2)}</span>
        ))}
      </div>
    </MiniSimLab>
  );
}
