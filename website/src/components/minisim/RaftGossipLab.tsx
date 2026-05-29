import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { gossipVsRaftRound } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function RaftGossipLab() {
  const [mode, setMode] = useState<"raft" | "gossip">("raft");
  const [round, setRound] = useState(3);
  const [nodes, setNodes] = useState(7);
  const pct = useMemo(() => gossipVsRaftRound(mode, round, nodes), [mode, round, nodes]);

  const metrics: LabMetric[] = [
    { id: "mode", label: "Mode", value: mode },
    { id: "pct", label: "Nodes informed", value: `${pct.toFixed(0)}%` },
    { id: "round", label: "Round", value: String(round) },
  ];

  return (
    <MiniSimLab
      intro={<>Raft: leader replicates in one round. Gossip: epidemic spread over multiple rounds.</>}
      controls={[
        { id: "r", label: "Round", min: 0, max: 10, value: round, valueText: `round ${round}` },
        { id: "n", label: "Cluster size", min: 3, max: 20, value: nodes, valueText: `${nodes} nodes` },
      ]}
      onControlChange={(id, v) => (id === "r" ? setRound(v) : setNodes(v))}
      metrics={metrics}
      status={`${mode}: ${pct.toFixed(0)}% nodes have update after round ${round}.`}
    >
      <div className="lab__row">
        <button type="button" className={`lab__btn ${mode === "raft" ? "" : "lab__btn--ghost"}`} onClick={() => setMode("raft")}>Raft</button>
        <button type="button" className={`lab__btn ${mode === "gossip" ? "" : "lab__btn--ghost"}`} onClick={() => setMode("gossip")}>Gossip</button>
      </div>
      <div className="minisim__grid" role="img" aria-label="Cluster state">
        {Array.from({ length: nodes }, (_, i) => (
          <div key={i} className={`minisim__cell ${i / nodes < pct / 100 ? "minisim__cell--on" : ""}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
