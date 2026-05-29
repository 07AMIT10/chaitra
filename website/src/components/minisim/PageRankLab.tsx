import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { DEMO_GRAPH, pagerankStep } from "../../lib/minisim";
import type { LabMetric } from "../lab";

export default function PageRankLab() {
  const [dampingPct, setDampingPct] = useState(85);
  const [iterations, setIterations] = useState(8);
  const damping = dampingPct / 100;

  const ranks = useMemo(() => {
    let r = Array(DEMO_GRAPH.length).fill(1 / DEMO_GRAPH.length);
    for (let i = 0; i < iterations; i++) r = pagerankStep(DEMO_GRAPH, r, damping);
    return r;
  }, [damping, iterations]);

  const metrics: LabMetric[] = ranks.map((rank, i) => ({
    id: `n${i}`,
    label: `Node ${i}`,
    value: rank.toFixed(3),
  }));

  return (
    <MiniSimLab
      intro={<>Power iteration on a tiny graph. Edit damping and watch rank stabilize.</>}
      controls={[
        { id: "d", label: "Damping", min: 50, max: 95, value: dampingPct, valueText: `${dampingPct}%` },
        { id: "it", label: "Iterations", min: 1, max: 30, value: iterations, valueText: `${iterations} steps` },
      ]}
      onControlChange={(id, v) => (id === "d" ? setDampingPct(v) : setIterations(v))}
      metrics={metrics}
      status={`After ${iterations} iterations, top node rank ${Math.max(...ranks).toFixed(3)}.`}
    >
      <div className="minisim__bars" role="img" aria-label="PageRank bars">
        {ranks.map((r, i) => (
          <div key={i} className="minisim__bar" style={{ height: `${r * 400}px` }} title={`Node ${i}: ${r.toFixed(3)}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
