import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { moeRoute } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

const EXPERTS = [
  [0.9, 0.1, 0.2, 0.1],
  [0.1, 0.8, 0.1, 0.2],
  [0.2, 0.1, 0.7, 0.3],
  [0.1, 0.2, 0.3, 0.9],
];

export default function MoELab() {
  const [tokenIdx, setTokenIdx] = useState(0);
  const [topK, setTopK] = useState(2);
  const tokens = useMemo(
    () => [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
    []
  );
  const token = tokens[tokenIdx];
  const routed = useMemo(() => moeRoute(token, EXPERTS, topK), [token, topK]);

  const metrics: LabMetric[] = [
    { id: "topk", label: "Top-K", value: String(topK) },
    { id: "experts", label: "Selected", value: routed.map((i) => `E${i}`).join(", ") },
  ];

  return (
    <MiniSimLab
      intro={<>Toy MoE router: token embedding dot-product with expert weights.</>}
      controls={[
        { id: "t", label: "Token", min: 0, max: 3, value: tokenIdx, valueText: `token ${tokenIdx}` },
        { id: "k", label: "Top-K experts", min: 1, max: 4, value: topK, valueText: `top ${topK}` },
      ]}
      onControlChange={(id, v) => (id === "t" ? setTokenIdx(v) : setTopK(v))}
      metrics={metrics}
      status={`Token ${tokenIdx} routed to experts ${routed.join(", ")}.`}
    >
      <div className="minisim__grid" role="img" aria-label="Expert selection">
        {EXPERTS.map((_, i) => (
          <div key={i} className={`minisim__cell ${routed.includes(i) ? "minisim__cell--on" : ""}`} title={`Expert ${i}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
