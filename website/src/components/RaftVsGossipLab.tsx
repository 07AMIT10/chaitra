import { useMemo, useState } from "react";
import {
  formatMessageComplexity,
  formatPercent,
  gossipConvergenceRoundsEstimate,
  gossipMessagesPerTick,
  gossipRoundsToFullSpread,
  maxFailuresTolerated,
  raftMessagesPerWrite,
  raftQuorum,
  raftRoundsToFullCommit,
} from "../lib/raft-gossip-math";
import {
  CASSANDRA_PRESET,
  ETCD_PRESET,
  RAFT_BOTTLENECK_PRESET,
  type ConsensusMode,
  snapshotAtRound,
} from "../lib/raft-gossip-sim";
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
import "./RaftVsGossipLab.css";

const SEED = 42;

export default function RaftVsGossipLab() {
  const [mode, setMode] = useState<ConsensusMode>("raft");
  const [nodes, setNodes] = useState(7);
  const [fanout, setFanout] = useState(3);
  const [round, setRound] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const snap = useMemo(
    () => snapshotAtRound(mode, nodes, round, fanout, SEED),
    [mode, nodes, round, fanout]
  );

  const quorum = raftQuorum(nodes);
  const pct = (snap.committedOrInformed / nodes) * 100;
  const fullSpread =
    mode === "raft" ? round >= raftRoundsToFullCommit(nodes) : pct >= 100;
  const gossipFullRounds = useMemo(
    () => gossipRoundsToFullSpread(nodes, fanout, SEED),
    [nodes, fanout]
  );
  const gossipEst = gossipConvergenceRoundsEstimate(nodes, fanout);
  const raftMsgs = raftMessagesPerWrite(nodes);
  const gossipMsgs =
    round > 0 ? gossipMessagesPerTick(snap.committedOrInformed, fanout) : 0;

  const applyEtcd = () => {
    setMode(ETCD_PRESET.mode);
    setNodes(ETCD_PRESET.n);
    setFanout(ETCD_PRESET.fanout);
    setRound(0);
  };

  const applyCassandra = () => {
    setMode(CASSANDRA_PRESET.mode);
    setNodes(CASSANDRA_PRESET.n);
    setFanout(CASSANDRA_PRESET.fanout);
    setRound(0);
  };

  const applyRaftBottleneck = () => {
    setMode(RAFT_BOTTLENECK_PRESET.mode);
    setNodes(RAFT_BOTTLENECK_PRESET.n);
    setFanout(RAFT_BOTTLENECK_PRESET.fanout);
    setRound(1);
  };

  const switchMode = (next: ConsensusMode) => {
    setMode(next);
    setRound(0);
  };

  const stepForward = () => setRound((r) => r + 1);
  const reset = () => setRound(0);

  const metrics: LabMetric[] = [
    { id: "mode", label: "Protocol", value: mode === "raft" ? "Raft (CP)" : "Gossip (AP)" },
    { id: "nodes", label: "Cluster (N)", value: String(nodes) },
    { id: "round", label: "Step", value: String(round) },
    {
      id: "progress",
      label: mode === "raft" ? "Committed / leader" : "Informed",
      value: `${snap.committedOrInformed}/${nodes} (${formatPercent(pct)})`,
    },
    {
      id: "quorum",
      label: mode === "raft" ? "Quorum" : "Full spread",
      value:
        mode === "raft"
          ? `${quorum} needed (f≤${maxFailuresTolerated(nodes)})`
          : fullSpread
            ? "100%"
            : "partial",
      tone: mode === "raft" && !snap.quorumMet && round > 0 ? "warn" : "default",
    },
    {
      id: "msgs",
      label: "Message load",
      value: formatMessageComplexity(mode, nodes, fanout),
      tone: mode === "raft" && nodes >= 12 ? "warn" : "default",
    },
  ];

  if (mode === "raft" && snap.quorumMet && !fullSpread) {
    metrics.push({
      id: "aha-quorum",
      label: "Linearizable",
      value: `Quorum committed in ${round} step(s); followers still catching up.`,
      tone: "aha",
    });
  }
  if (mode === "gossip" && fullSpread) {
    metrics.push({
      id: "aha-gossip",
      label: "Eventual",
      value: `All ${nodes} nodes informed in ${round} steps (sim: ${gossipFullRounds}).`,
      tone: "aha",
    });
  }

  const compareLeft =
    mode === "raft"
      ? `${snap.committedOrInformed} nodes with entry (${formatPercent(pct)})`
      : `${snap.committedOrInformed} infected (${formatPercent(pct)})`;

  const compareRight =
    mode === "raft"
      ? snap.quorumMet
        ? `Quorum ${quorum}/${nodes} — ~${raftMsgs} msgs/write (O(N))`
        : `Need ${quorum} for commit — leader replicates AppendEntries`
      : fullSpread
        ? `${round} steps to full spread (deterministic seed ${SEED})`
        : `~${gossipEst} rounds O(log N) heuristic vs ${gossipFullRounds} in sim`;

  const predictThreshold =
    mode === "raft" ? 2 : Math.max(3, Math.floor(gossipEst * 0.85));

  const predictPrompt =
    mode === "raft" ? (
      <>
        With <strong>N = {nodes}</strong> Raft replicas, will a client see a{" "}
        <strong>quorum commit</strong> within <strong>{predictThreshold}</strong> lab steps after a
        write? (Current step: {round}, {snap.committedOrInformed}/{nodes} with the entry.)
      </>
    ) : (
      <>
        With <strong>N = {nodes}</strong> and fanout <strong>{fanout}</strong>, will all nodes be
        informed within <strong>{predictThreshold}</strong> steps? (Current step: {round},{" "}
        {snap.committedOrInformed}/{nodes} infected.)
      </>
    );

  const nodeClass = (i: number): string => {
    if (mode === "gossip" && snap.gossipNodes) {
      return snap.gossipNodes[i] ? "raft-gossip-lab__node--informed" : "";
    }
    if (mode === "raft" && snap.raftNodes) {
      const status = snap.raftNodes[i];
      if (status === "leader") return "raft-gossip-lab__node--leader";
      if (status === "replicating") return "raft-gossip-lab__node--replicating";
      if (status === "committed") return "raft-gossip-lab__node--committed";
    }
    return "";
  };

  return (
    <LabShell
      intro={
        <>
          Same <strong>{nodes}-node</strong> topology — toggle <strong>Raft</strong> (leader +
          quorum replication) vs <strong>gossip</strong> (epidemic fan-out). Step replication or
          infection rounds and compare message complexity and time to consistency.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="raft-gossip-lab__mode" role="group" aria-label="Consensus protocol">
            <button
              type="button"
              className={`lab__btn ${mode === "raft" ? "lab__btn--active" : "lab__btn--ghost"}`}
              aria-pressed={mode === "raft"}
              onClick={() => switchMode("raft")}
            >
              Raft
            </button>
            <button
              type="button"
              className={`lab__btn ${mode === "gossip" ? "lab__btn--active" : "lab__btn--ghost"}`}
              aria-pressed={mode === "gossip"}
              onClick={() => switchMode("gossip")}
            >
              Gossip
            </button>
          </div>

          <div className="lab__controls-panel">
            <RangeControl
              id="rg-n"
              label="Cluster size (N)"
              min={3}
              max={49}
              value={nodes}
              valueText={`${nodes} nodes`}
              onChange={(v) => {
                setNodes(v);
                setRound(0);
              }}
            />
            {mode === "gossip" && (
              <RangeControl
                id="rg-f"
                label="Fanout"
                min={1}
                max={5}
                value={fanout}
                valueText={`${fanout} peers per tick`}
                onChange={(v) => {
                  setFanout(v);
                  setRound(0);
                }}
              />
            )}
            <ScenarioPresets
              aria-label="Raft vs gossip scenario presets"
              presets={[
                { id: "etcd", label: "Etcd (N=5)", onSelect: applyEtcd },
                { id: "cass", label: "Cassandra scale", onSelect: applyCassandra },
                { id: "bottleneck", label: "Raft O(N) load", onSelect: applyRaftBottleneck },
              ]}
            />
          </div>

          <div className="lab__row">
            <button type="button" className="lab__btn" onClick={stepForward}>
              Step {mode === "raft" ? "replication" : "gossip tick"}
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={reset}>
              Reset
            </button>
          </div>

          <p className="raft-gossip-lab__legend">
            {mode === "raft"
              ? "Gold = committed; ring = leader; amber = awaiting AppendEntries ACK."
              : "Gold = infected; muted = still susceptible (eventual consistency)."}
          </p>

          <div
            className={`raft-gossip-lab__grid ${reducedMotion ? "raft-gossip-lab__grid--static" : ""}`}
            role="img"
            aria-label={
              mode === "raft"
                ? `Raft cluster: ${snap.committedOrInformed} of ${nodes} nodes committed or leader`
                : `Gossip grid: ${snap.committedOrInformed} of ${nodes} nodes informed`
            }
          >
            {Array.from({ length: nodes }, (_, i) => (
              <div
                key={i}
                className={`raft-gossip-lab__node ${nodeClass(i)}`}
                title={
                  mode === "raft"
                    ? `Node ${i}: ${snap.raftNodes?.[i] ?? "follower"}`
                    : snap.gossipNodes?.[i]
                      ? `Node ${i}: informed`
                      : `Node ${i}: susceptible`
                }
              />
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${mode}-${nodes}-${fanout}-${round}`}
        prompt={predictPrompt}
        revealLabel="Show protocol vs ground truth"
      >
        <ComparePanel
          leftLabel={mode === "raft" ? "Replication state" : "Infected (I)"}
          rightLabel={mode === "raft" ? "Quorum / messages" : "Convergence"}
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {mode === "raft" ? (
            <>
              Raft commits after <strong>quorum {quorum}</strong> ACKs (~1 RTT); full cluster catch-up
              in <strong>{raftRoundsToFullCommit(nodes)}</strong> toy steps. Last step sent{" "}
              <strong>{snap.messagesThisStep}</strong> AppendEntries (≈{raftMsgs} per write at
              saturation).
            </>
          ) : (
            <>
              Gossip needs <strong>{gossipFullRounds}</strong> rounds for 100% (seed {SEED}); O(log N)
              estimate ≈ {gossipEst}. Last tick ≈ <strong>{gossipMsgs}</strong> messages.
            </>
          )}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {mode === "raft" ? "Raft" : "Gossip"} step {round}: {compareLeft}.{" "}
        {mode === "raft" && snap.quorumMet
          ? "Quorum commit reached — strong consistency for reads on majority."
          : mode === "gossip" && fullSpread
            ? "Full epidemic spread — eventual consistency."
            : "Reveal above for ground-truth comparison."}
      </p>
    </LabShell>
  );
}
