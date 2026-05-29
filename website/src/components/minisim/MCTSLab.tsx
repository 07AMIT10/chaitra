import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { mctsTreeDepth, mctsValue } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function MCTSLab() {
  const [exploration, setExploration] = useState(14);
  const [visits, setVisits] = useState(10);
  const c = exploration / 10;
  const ucb = mctsValue(c, 3, visits, 20);
  const depth = mctsTreeDepth(8, c);

  const metrics: LabMetric[] = [
    { id: "c", label: "Exploration c", value: c.toFixed(2) },
    { id: "ucb", label: "UCB score", value: ucb === Infinity ? "∞" : ucb.toFixed(3) },
    { id: "depth", label: "Tree depth", value: String(depth) },
  ];

  return (
    <MiniSimLab
      intro={<>MCTS balances exploitation (wins/visits) with exploration (√ln N / visits).</>}
      controls={[
        { id: "c", label: "Exploration ×10", min: 5, max: 30, value: exploration, valueText: `c = ${c.toFixed(2)}` },
        { id: "v", label: "Node visits", min: 1, max: 50, value: visits, valueText: `${visits} visits` },
      ]}
      onControlChange={(id, v) => (id === "c" ? setExploration(v) : setVisits(v))}
      metrics={metrics}
      status={`UCB = ${ucb === Infinity ? "∞ (unvisited)" : ucb.toFixed(3)}. Higher c → more exploration.`}
    >
      <div className="minisim__bars" role="img" aria-label="MCTS tree depth">
        {Array.from({ length: depth }, (_, i) => (
          <div key={i} className="minisim__bar" style={{ height: `${((depth - i) / depth) * 100}%` }} />
        ))}
      </div>
    </MiniSimLab>
  );
}
