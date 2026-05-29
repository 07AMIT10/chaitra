import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { tokenRoutingLoad } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function TokenRoutingLab() {
  const [experts, setExperts] = useState(4);
  const [tokens, setTokens] = useState(100);
  const [topK, setTopK] = useState(2);
  const loads = useMemo(() => tokenRoutingLoad(experts, tokens, topK), [experts, tokens, topK]);
  const maxLoad = Math.max(...loads, 1);

  const metrics: LabMetric[] = loads.map((l, i) => ({
    id: `e${i}`,
    label: `Expert ${i}`,
    value: String(l),
    tone: l === maxLoad && maxLoad > tokens / experts * 1.5 ? "warn" : "default",
  }));

  return (
    <MiniSimLab
      intro={<>Top-K routing load distribution across experts.</>}
      controls={[
        { id: "e", label: "Experts", min: 2, max: 8, value: experts, valueText: `${experts} experts` },
        { id: "t", label: "Tokens", min: 20, max: 500, step: 10, value: tokens, valueText: `${tokens} tokens` },
        { id: "k", label: "Top-K", min: 1, max: 4, value: topK, valueText: `top ${topK}` },
      ]}
      onControlChange={(id, v) => (id === "e" ? setExperts(v) : id === "t" ? setTokens(v) : setTopK(v))}
      metrics={metrics.slice(0, 4)}
      status={`Max load ${maxLoad} vs avg ${(tokens * topK / experts).toFixed(0)}.`}
    >
      <div className="minisim__bars" role="img" aria-label="Expert loads">
        {loads.map((l, i) => (
          <div key={i} className="minisim__bar" style={{ height: `${(l / maxLoad) * 100}%` }} title={`Expert ${i}: ${l}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
