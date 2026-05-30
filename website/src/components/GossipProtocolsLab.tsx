import { useMemo, useState } from "react";
import {
  expectedNewInfections,
  informedCount,
  logConvergenceRoundsEstimate,
  roundsToConvergence,
  susceptibleCount,
} from "../lib/gossip-math";
import { gossipStep, initGossip, informedPct } from "../lib/gossip-sim";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./GossipProtocolsLab.css";

const SEED = 42;

export default function GossipProtocolsLab() {
  const [nodes, setNodes] = useState(16);
  const [fanout, setFanout] = useState(2);
  const [round, setRound] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const state = useMemo(() => {
    let s = initGossip(nodes);
    for (let r = 0; r < round; r++) {
      s = gossipStep(s, fanout, SEED).state;
    }
    return s;
  }, [nodes, fanout, round]);

  const infected = informedCount(state);
  const susceptible = susceptibleCount(state);
  const pct = informedPct(state);
  const converged = pct >= 100;
  const convergenceRounds = useMemo(
    () => roundsToConvergence(nodes, fanout, SEED),
    [nodes, fanout]
  );
  const estRounds = logConvergenceRoundsEstimate(nodes, fanout);
  const expectedDelta = expectedNewInfections(nodes, infected, fanout);

  const applyFullMeshSlow = () => {
    setNodes(49);
    setFanout(1);
    setRound(0);
  };

  const applyHighFanout = () => {
    setNodes(16);
    setFanout(5);
    setRound(0);
  };

  const applySingleSeed = () => {
    setNodes(25);
    setFanout(2);
    setRound(0);
  };

  const metrics: LabMetric[] = [
    { id: "nodes", label: "Cluster size (N)", value: String(nodes) },
    { id: "fanout", label: "Fanout", value: String(fanout) },
    { id: "round", label: "Round", value: String(round) },
    { id: "infected", label: "Infected", value: `${infected} (${pct.toFixed(0)}%)` },
    { id: "susceptible", label: "Susceptible", value: String(susceptible) },
    {
      id: "edelta",
      label: "E[ΔI] next tick",
      value: converged ? "0" : expectedDelta.toFixed(1),
    },
  ];
  if (converged) {
    metrics.push({
      id: "aha",
      label: "Converged",
      value: `All ${nodes} nodes informed in ${round} rounds (sim needs ${convergenceRounds}).`,
      tone: "aha",
    });
  } else if (round > 0 && infected > 1) {
    metrics.push({
      id: "bound",
      label: "O(log N) hint",
      value: `~${estRounds} rounds heuristic vs ${convergenceRounds} in this run.`,
      tone: "default",
    });
  }

  const stepForward = () => {
    if (!converged) setRound((r) => r + 1);
  };

  const reset = () => setRound(0);

  const compareLeft = `${infected} infected (${pct.toFixed(0)}%)`;
  const compareRight = converged
    ? `${round} rounds to full spread (deterministic seed ${SEED})`
    : `${susceptible} susceptible — E[ΔI] ≈ ${expectedDelta.toFixed(1)} next tick`;

  const predictThreshold = Math.max(3, Math.floor(estRounds * 0.85));

  return (
    <LabShell
      intro={
        <>
          <strong>Push gossip</strong>: each informed node contacts <strong>fanout</strong> random
          peers per round. Step the epidemic on the peer grid — same push model as the README
          diagram and Cassandra membership spread.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
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
            <ScenarioPresets
              aria-label="Gossip scenario presets"
              presets={[
                { id: "slow", label: "Full mesh slow", onSelect: applyFullMeshSlow },
                { id: "fanout", label: "High fanout", onSelect: applyHighFanout },
                { id: "seed", label: "Single seed", onSelect: applySingleSeed },
              ]}
            />
          </div>
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
            aria-label={`Gossip grid: ${infected} infected, ${susceptible} susceptible`}
          >
            {state.nodes.map((informed, i) => (
              <div
                key={i}
                className={`gossip-lab__node ${informed ? "gossip-lab__node--informed" : ""}`}
                title={informed ? `Node ${i}: infected` : `Node ${i}: susceptible`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Accent nodes know the gossip; muted nodes are susceptible. One seed at node 0 each reset.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${nodes}-${fanout}-${round}`}
        prompt={
          <>
            With <strong>N = {nodes}</strong>, fanout <strong>{fanout}</strong>, and a single seed,
            will all nodes be infected within <strong>{predictThreshold}</strong> rounds? (Current
            round: {round}, {infected}/{nodes} infected.)
          </>
        }
        storageKey="gossip"
        options={[
          { id: "yes", label: `Yes — converges within ${predictThreshold} rounds`, isCorrect: convergenceRounds <= predictThreshold },
          { id: "no", label: `No — needs more than ${predictThreshold} rounds`, isCorrect: convergenceRounds > predictThreshold },
        ]}
        revealLabel="Show infected vs susceptible & convergence"
      >
        <ComparePanel
          leftLabel="Infected (I)"
          rightLabel={converged ? "Rounds to convergence" : "Susceptible (S)"}
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Deterministic run (seed {SEED}) reaches 100% in{" "}
          <strong>{convergenceRounds}</strong> rounds; O(log N) heuristic ≈ {estRounds}.{" "}
          {round >= convergenceRounds
            ? "You have reached full spread."
            : round === 0
              ? "Step rounds or use presets to watch the epidemic curve."
              : `At round ${round}, ${susceptible} node${susceptible === 1 ? "" : "s"} still susceptible.`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        Round {round}: {infected}/{nodes} infected, {susceptible} susceptible.{" "}
        {converged ? "Epidemic converged." : "Reveal above for convergence stats."}
      </p>
    </LabShell>
  );
}
