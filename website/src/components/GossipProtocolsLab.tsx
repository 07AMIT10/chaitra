import { useMemo, useState } from "react";
import { initGossip, gossipStep, informedPct } from "../lib/gossip-sim";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./GossipProtocolsLab.css";

export default function GossipProtocolsLab() {
  const [nodes, setNodes] = useState(16);
  const [fanout, setFanout] = useState(2);
  const [round, setRound] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const state = useMemo(() => {
    let s = initGossip(nodes);
    for (let r = 0; r < round; r++) {
      s = gossipStep(s, fanout, 42).state;
    }
    return s;
  }, [nodes, fanout, round]);

  const pct = informedPct(state);
  const converged = pct >= 100;

  const metrics: LabMetric[] = [
    { id: "nodes", label: "Cluster size", value: String(nodes) },
    { id: "fanout", label: "Fanout", value: String(fanout) },
    { id: "round", label: "Round", value: String(round) },
    { id: "informed", label: "Informed", value: `${pct.toFixed(0)}%` },
  ];
  if (converged) {
    metrics.push({
      id: "aha",
      label: "Converged",
      value: `All ${nodes} nodes informed in ${round} rounds.`,
      tone: "aha",
    });
  }

  const stepForward = () => {
    if (!converged) setRound((r) => r + 1);
  };

  const reset = () => setRound(0);

  return (
    <LabShell
      intro={
        <>
          Push gossip: each informed node contacts <strong>fanout</strong> random peers per round.
          Watch epidemic spread — same model as the README diagram.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="gossip-n"
            label="Nodes (N)"
            min={4}
            max={49}
            value={nodes}
            valueText={`${nodes} nodes`}
            onChange={(v) => {
              setNodes(v);
              setRound(0);
            }}
          />
          <RangeControl
            id="gossip-f"
            label="Fanout"
            min={1}
            max={5}
            value={fanout}
            valueText={`${fanout} peers per round`}
            onChange={(v) => {
              setFanout(v);
              setRound(0);
            }}
          />
          <div className="lab__row">
            <button type="button" className="lab__btn" onClick={stepForward} disabled={converged}>
              Step round
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={reset}>
              Reset
            </button>
          </div>
          <div
            className={`gossip-lab__grid ${reducedMotion ? "gossip-lab__grid--static" : ""}`}
            role="img"
            aria-label={`Gossip grid: ${pct.toFixed(0)}% informed`}
          >
            {state.nodes.map((informed, i) => (
              <div
                key={i}
                className={`gossip-lab__node ${informed ? "gossip-lab__node--informed" : ""}`}
                title={`Node ${i}`}
              />
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Round {round}: {state.nodes.filter(Boolean).length}/{nodes} nodes informed ({pct.toFixed(0)}%).
      </p>
    </LabShell>
  );
}
