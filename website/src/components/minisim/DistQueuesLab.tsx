import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { distributedQueueLag } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function DistQueuesLab() {
  const [partitions, setPartitions] = useState(8);
  const [skew, setSkew] = useState(3);
  const lag = useMemo(() => distributedQueueLag(partitions, skew), [partitions, skew]);

  const metrics: LabMetric[] = [
    { id: "part", label: "Partitions", value: String(partitions) },
    { id: "skew", label: "Skew factor", value: String(skew) },
    { id: "lag", label: "Max lag (units)", value: lag.toFixed(1), tone: lag > 10 ? "warn" : "default" },
  ];

  return (
    <MiniSimLab
      intro={<>Partition ordering tradeoff: skew increases tail lag across partitions.</>}
      controls={[
        { id: "p", label: "Partitions", min: 2, max: 16, value: partitions, valueText: `${partitions} partitions` },
        { id: "s", label: "Skew", min: 1, max: 10, value: skew, valueText: `skew ${skew}` },
      ]}
      onControlChange={(id, v) => (id === "p" ? setPartitions(v) : setSkew(v))}
      metrics={metrics}
      status={`Estimated max lag ${lag.toFixed(1)} with skew ${skew}.`}
    >
      <div className="minisim__bars" role="img" aria-label="Partition lag">
        {Array.from({ length: partitions }, (_, i) => (
          <div key={i} className="minisim__bar" style={{ height: `${((i + 1) / partitions) * skew * 10}%` }} />
        ))}
      </div>
    </MiniSimLab>
  );
}
