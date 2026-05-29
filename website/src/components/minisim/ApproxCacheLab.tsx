import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { cacheHitRatio, approximateCacheBloomBits } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function ApproxCacheLab() {
  const [items, setItems] = useState(10000);
  const [fprPct, setFprPct] = useState(1);
  const fpr = fprPct / 100;
  const bits = useMemo(() => approximateCacheBloomBits(items, fpr), [items, fpr]);
  const hitRatio = useMemo(() => cacheHitRatio(fpr, 0.02), [fpr]);

  const metrics: LabMetric[] = [
    { id: "bits", label: "Bloom bits (m)", value: String(bits) },
    { id: "hit", label: "Est. hit ratio", value: `${(hitRatio * 100).toFixed(1)}%` },
    { id: "fpr", label: "Target FP", value: `${fprPct}%` },
  ];

  return (
    <MiniSimLab
      intro={<>Link Bloom/CMS sizing to approximate cache hit ratio tradeoffs.</>}
      controls={[
        { id: "n", label: "Cache items", min: 1000, max: 50000, step: 1000, value: items, valueText: `${items} items` },
        { id: "f", label: "Bloom FP target", min: 1, max: 10, value: fprPct, valueText: `${fprPct}%` },
      ]}
      onControlChange={(id, v) => (id === "n" ? setItems(v) : setFprPct(v))}
      metrics={metrics}
      status={`${bits} bits for ${items} items at ${fprPct}% FP target.`}
    >
      <div className="minisim__bars" role="img" aria-label="Hit ratio">
        <div className="minisim__bar" style={{ height: `${hitRatio * 100}%` }} />
      </div>
    </MiniSimLab>
  );
}
