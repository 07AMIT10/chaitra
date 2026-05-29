import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { estimatePi } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function MonteCarloLab() {
  const [samples, setSamples] = useState(1000);
  const { estimate, inside } = useMemo(() => estimatePi(samples), [samples]);
  const err = Math.abs(estimate - Math.PI);

  const metrics: LabMetric[] = [
    { id: "samples", label: "Samples", value: String(samples) },
    { id: "pi", label: "π estimate", value: estimate.toFixed(4) },
    { id: "err", label: "Error", value: err.toFixed(4) },
    { id: "inside", label: "Inside circle", value: String(inside) },
  ];

  return (
    <MiniSimLab
      intro={<>Monte Carlo π: random points in a unit square. More samples → lower variance.</>}
      controls={[{ id: "n", label: "Samples", min: 100, max: 10000, step: 100, value: samples, valueText: `${samples} points` }]}
      onControlChange={(_, v) => setSamples(v)}
      metrics={metrics}
      status={`π ≈ ${estimate.toFixed(4)} from ${samples} samples (${inside} inside quarter circle).`}
    >
      <p className="lab__hint">True π = {Math.PI.toFixed(4)}. Error {err.toFixed(4)}.</p>
    </MiniSimLab>
  );
}
