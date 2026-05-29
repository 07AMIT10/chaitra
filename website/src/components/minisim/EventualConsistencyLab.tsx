import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { versionVectorMerge } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function EventualConsistencyLab() {
  const [step, setStep] = useState(0);
  const timeline = useMemo(() => {
    const states = [
      { A: { n1: 1, n2: 0 }, B: { n1: 0, n2: 1 } },
      { A: { n1: 2, n2: 0 }, B: { n1: 0, n2: 1 } },
      { A: { n1: 2, n2: 0 }, B: { n1: 0, n2: 2 } },
      { merged: versionVectorMerge({ n1: 2, n2: 0 }, { n1: 0, n2: 2 }) },
    ];
    return states.slice(0, step + 1);
  }, [step]);

  const current = timeline[timeline.length - 1];
  const merged = "merged" in current ? current.merged : null;

  const metrics: LabMetric[] = [
    { id: "step", label: "Timeline step", value: String(step) },
    ...(merged
      ? [{ id: "merged", label: "Merged vector", value: JSON.stringify(merged), tone: "aha" as const }]
      : [
          { id: "a", label: "Replica A", value: JSON.stringify(current.A) },
          { id: "b", label: "Replica B", value: JSON.stringify(current.B) },
        ]),
  ];

  return (
    <MiniSimLab
      intro={<>Version vectors track per-replica counters. Merge takes component-wise max.</>}
      controls={[{ id: "s", label: "Timeline step", min: 0, max: 3, value: step, valueText: `step ${step}` }]}
      onControlChange={(_, v) => setStep(v)}
      metrics={metrics}
      status={merged ? "Replicas converged via max-merge." : "Concurrent writes — stale reads possible."}
    >
      <div className="minisim__line" role="img" aria-label="Version vector timeline">
        {timeline.map((_, i) => (
          <div key={i} className="minisim__tick" style={{ height: `${((i + 1) / 4) * 100}%`, opacity: i <= step ? 1 : 0.3 }} />
        ))}
      </div>
    </MiniSimLab>
  );
}
