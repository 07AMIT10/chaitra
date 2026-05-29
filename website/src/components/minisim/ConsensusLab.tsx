import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { consensusLogEntries } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function ConsensusLab() {
  const [round, setRound] = useState(3);
  const [replicas, setReplicas] = useState(3);
  const entries = useMemo(() => consensusLogEntries(round, replicas), [round, replicas]);
  const quorum = Math.floor(replicas / 2) + 1;

  const metrics: LabMetric[] = [
    { id: "entries", label: "Log entries", value: String(entries) },
    { id: "quorum", label: "Quorum", value: String(quorum) },
    { id: "replicas", label: "Replicas", value: String(replicas) },
  ];

  return (
    <MiniSimLab
      intro={<>Simplified Raft: leader appends entries; quorum of {quorum} must ack.</>}
      controls={[
        { id: "r", label: "Replication rounds", min: 1, max: 10, value: round, valueText: `${round} rounds` },
        { id: "n", label: "Replicas", min: 3, max: 7, value: replicas, valueText: `${replicas} replicas` },
      ]}
      onControlChange={(id, v) => (id === "r" ? setRound(v) : setReplicas(v))}
      metrics={metrics}
      status={`${entries} log entries replicated across ${replicas} nodes.`}
    >
      <div className="minisim__line" role="img" aria-label="Log growth">
        {Array.from({ length: entries }, (_, i) => (
          <div key={i} className="minisim__tick" style={{ height: `${((i + 1) / entries) * 100}%` }} />
        ))}
      </div>
    </MiniSimLab>
  );
}
