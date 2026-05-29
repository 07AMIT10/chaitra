import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { probabilisticFinality } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function ProbConsensusLab() {
  const [rounds, setRounds] = useState(6);
  const [honestPct, setHonestPct] = useState(67);
  const finality = useMemo(() => probabilisticFinality(rounds, honestPct / 100), [rounds, honestPct]);

  const metrics: LabMetric[] = [
    { id: "rounds", label: "Confirmations", value: String(rounds) },
    { id: "honest", label: "Honest hash power", value: `${honestPct}%` },
    { id: "finality", label: "P(final)", value: `${(finality * 100).toFixed(1)}%`, tone: finality > 0.95 ? "aha" : "default" },
  ];

  return (
    <MiniSimLab
      intro={<>Nakamoto-style probabilistic finality: each round reduces reversal probability.</>}
      controls={[
        { id: "r", label: "Confirmations", min: 1, max: 20, value: rounds, valueText: `${rounds} blocks deep` },
        { id: "h", label: "Honest %", min: 51, max: 99, value: honestPct, valueText: `${honestPct}% honest` },
      ]}
      onControlChange={(id, v) => (id === "r" ? setRounds(v) : setHonestPct(v))}
      metrics={metrics}
      status={`After ${rounds} confirmations, P(immutable) ≈ ${(finality * 100).toFixed(1)}%.`}
    >
      <div className="minisim__bars" role="img" aria-label="Finality probability">
        <div className="minisim__bar" style={{ height: `${finality * 100}%` }} />
      </div>
    </MiniSimLab>
  );
}
