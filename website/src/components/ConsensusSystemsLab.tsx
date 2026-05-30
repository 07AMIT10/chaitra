import { useMemo, useState } from "react";
import {
  formatBftBound,
  formatFaultBound,
  formatQuorum,
  maxCrashFailures,
  minNodesForByzantine,
  minNodesForCrashFaults,
  quorumIntersectionHolds,
  raftQuorum,
} from "../lib/consensus-math";
import {
  PARTITION_MAJORITY_PRESET,
  PARTITION_NO_QUORUM_PRESET,
  ZOOKEEPER_PRESET,
  type ConsensusConfig,
  partitionLabel,
  roundsToFirstCommit,
  snapshotAtRound,
} from "../lib/consensus-sim";
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
import "./ConsensusSystemsLab.css";

function configFromState(
  nodes: number,
  partitionOn: boolean,
  splitIndex: number
): ConsensusConfig {
  if (!partitionOn) return { n: nodes, partition: { mode: "none" } };
  return { n: nodes, partition: { mode: "split", splitIndex } };
}

export default function ConsensusSystemsLab() {
  const [nodes, setNodes] = useState(ZOOKEEPER_PRESET.n);
  const [partitionOn, setPartitionOn] = useState(false);
  const [splitIndex, setSplitIndex] = useState(3);
  const [round, setRound] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const config = useMemo(
    () => configFromState(nodes, partitionOn, splitIndex),
    [nodes, partitionOn, splitIndex]
  );

  const snap = useMemo(() => snapshotAtRound(config, round), [config, round]);
  const quorum = raftQuorum(nodes);
  const fCrash = maxCrashFailures(nodes);
  const firstCommitRounds = useMemo(() => roundsToFirstCommit(config), [config]);

  const applyZookeeper = () => {
    setNodes(ZOOKEEPER_PRESET.n);
    setPartitionOn(false);
    setSplitIndex(3);
    setRound(0);
  };

  const applyPartitionMajority = () => {
    setNodes(PARTITION_MAJORITY_PRESET.n);
    setPartitionOn(true);
    setSplitIndex(PARTITION_MAJORITY_PRESET.partition.mode === "split"
      ? PARTITION_MAJORITY_PRESET.partition.splitIndex
      : 3);
    setRound(0);
  };

  const applyPartitionNoQuorum = () => {
    setNodes(PARTITION_NO_QUORUM_PRESET.n);
    setPartitionOn(true);
    setSplitIndex(PARTITION_NO_QUORUM_PRESET.partition.mode === "split"
      ? PARTITION_NO_QUORUM_PRESET.partition.splitIndex
      : 2);
    setRound(0);
  };

  const stepForward = () => setRound((r) => r + 1);
  const reset = () => setRound(0);

  const logWidth = Math.max(1, round, snap.committedIndex);
  const bftN = minNodesForByzantine(1);

  const metrics: LabMetric[] = [
    { id: "n", label: "Cluster (N)", value: String(nodes) },
    { id: "q", label: "Quorum (Q)", value: formatQuorum(quorum, nodes) },
    { id: "f", label: "CFT bound", value: formatFaultBound(fCrash, nodes) },
    { id: "round", label: "Replication step", value: String(round) },
    {
      id: "committed",
      label: "Committed index",
      value: String(snap.committedIndex),
      tone: snap.committedIndex > 0 ? "default" : "default",
    },
    {
      id: "acks",
      label: "ACKs (last step)",
      value: `${snap.acksThisStep} / ${quorum} needed`,
      tone: snap.acksThisStep >= quorum ? "default" : round > 0 ? "warn" : "default",
    },
    {
      id: "partition",
      label: "Network",
      value: snap.partitionLabel,
      tone: !snap.canCommitOnMajority ? "warn" : partitionOn ? "default" : "default",
    },
  ];

  if (snap.quorumMet && round > 0) {
    metrics.push({
      id: "aha-commit",
      label: "Quorum commit",
      value: `Index ${snap.lastAppendIndex} committed with ${snap.acksThisStep} ACKs (Q=${quorum}).`,
      tone: "aha",
    });
  }
  if (partitionOn && !snap.canCommitOnMajority) {
    metrics.push({
      id: "aha-stall",
      label: "Split-brain risk",
      value: `Majority side has ${snap.majoritySideSize} nodes < Q=${quorum} — no safe commit.`,
      tone: "warn",
    });
  }
  if (partitionOn && snap.canCommitOnMajority && snap.committedIndex > 0 && round > 2) {
    const stale = snap.nodes.filter((n) => !n.reachable && n.log.length < snap.committedIndex);
    if (stale.length > 0) {
      metrics.push({
        id: "aha-stale",
        label: "Minority partition",
        value: `${stale.length} node(s) behind — minority cannot elect without overlap.`,
        tone: "aha",
      });
    }
  }

  const compareLeft =
    round === 0
      ? "Empty replicated log — leader elected at node 0."
      : `Leader log length ${snap.nodes[0]?.log.length ?? 0}; ${snap.committedIndex} committed entr${
          snap.committedIndex === 1 ? "y" : "ies"
        }.`;

  const compareRight = snap.quorumMet
    ? `Quorum ${quorum} met — intersection Q+Q>${nodes} holds (${quorumIntersectionHolds(quorum, nodes) ? "safe" : "unsafe"}).`
    : snap.canCommitOnMajority
      ? `Need ${quorum} ACKs; last step ${snap.acksThisStep}. ~${snap.messagesThisStep} AppendEntries.`
      : `Majority side size ${snap.majoritySideSize} < Q=${quorum} — commit impossible until heal.`;

  const predictThreshold = snap.canCommitOnMajority ? 2 : 4;
  const predictPrompt = (
    <>
      With <strong>N = {nodes}</strong>, quorum <strong>Q = {quorum}</strong>
      {partitionOn ? (
        <>
          , and partition <strong>{partitionLabel(config)}</strong>
        </>
      ) : null}
      , will the leader <strong>commit a log entry</strong> within <strong>{predictThreshold}</strong>{" "}
      replication steps? (Step {round}, committed index {snap.committedIndex}.)
    </>
  );

  const nodeClass = (id: number): string => {
    const node = snap.nodes[id];
    if (!node) return "";
    if (node.status === "leader") return "consensus-lab__node--leader";
    if (node.status === "replicating") return "consensus-lab__node--replicating";
    if (node.status === "committed") return "consensus-lab__node--committed";
    if (node.status === "isolated" || node.status === "stale")
      return "consensus-lab__node--isolated";
    return "";
  };

  return (
    <LabShell
      intro={
        <>
          Step through simplified <strong>Raft log replication</strong>: the leader appends an
          entry, fans out <strong>AppendEntries</strong>, and commits after quorum{" "}
          <strong>Q = ⌊N/2⌋ + 1</strong>. Inject a network partition to see majority commit vs
          minority stall.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="cs-n"
              label="Replicas (N)"
              min={3}
              max={7}
              value={nodes}
              valueText={`${nodes} nodes (N=${minNodesForCrashFaults(fCrash)})`}
              onChange={(v) => {
                setNodes(v);
                setRound(0);
              }}
            />
            <RangeControl
              id="cs-round"
              label="Replication step"
              min={0}
              max={10}
              value={round}
              valueText={`step ${round}`}
              onChange={setRound}
            />
            <label className="lab__control">
              <input
                type="checkbox"
                checked={partitionOn}
                onChange={(e) => {
                  setPartitionOn(e.target.checked);
                  setRound(0);
                }}
              />
              Network partition
            </label>
            {partitionOn && (
              <RangeControl
                id="cs-split"
                label="Split after node"
                min={1}
                max={nodes - 1}
                value={splitIndex}
                valueText={`A: 0..${splitIndex - 1}, B: ${splitIndex}..${nodes - 1}`}
                onChange={(v) => {
                  setSplitIndex(v);
                  setRound(0);
                }}
              />
            )}
            <ScenarioPresets
              aria-label="Consensus scenario presets"
              presets={[
                { id: "zk", label: "ZooKeeper (N=5)", onSelect: applyZookeeper },
                { id: "part", label: "Partition inject", onSelect: applyPartitionMajority },
                { id: "stall", label: "No quorum on A", onSelect: applyPartitionNoQuorum },
              ]}
            />
          </div>

          <div className="lab__row">
            <button type="button" className="lab__btn" onClick={stepForward}>
              Append & replicate
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={reset}>
              Reset log
            </button>
          </div>

          <p
            className={`consensus-lab__partition ${!snap.canCommitOnMajority ? "consensus-lab__partition--warn" : ""}`}
          >
            {snap.partitionLabel}
            {!snap.canCommitOnMajority
              ? " — majority side too small to form quorum."
              : partitionOn
                ? ` — leader on side A; ${snap.majoritySideSize} reachable for ACKs.`
                : ` — all ${nodes} nodes reachable.`}
          </p>

          <p className="consensus-lab__legend">
            Gold cells = committed log index; amber = pending; dashed nodes = partitioned / stale.
            BFT needs {formatBftBound(1, bftN)} for one traitor.
          </p>

          <div
            className={`consensus-lab__grid ${reducedMotion ? "consensus-lab__grid--static" : ""}`}
            role="img"
            aria-label={`Raft cluster ${nodes} nodes, ${snap.committedIndex} committed entries`}
          >
            {Array.from({ length: nodes }, (_, i) => (
              <div
                key={i}
                className={`consensus-lab__node ${nodeClass(i)}`}
                title={`Node ${i}: ${snap.nodes[i]?.status ?? "follower"}`}
              >
                {i}
              </div>
            ))}
          </div>

          <div
            className="consensus-lab__log"
            role="img"
            aria-label="Per-node replicated log timeline"
          >
            {snap.nodes.map((node) => (
              <div key={node.id} className="consensus-lab__log-row">
                <span className="consensus-lab__log-label">N{node.id}</span>
                <div className="consensus-lab__log-cells">
                  {Array.from({ length: logWidth }, (_, i) => {
                    const cell = node.log[i] ?? "empty";
                    return (
                      <div
                        key={i}
                        className={`consensus-lab__cell ${
                          cell === "committed"
                            ? "consensus-lab__cell--committed"
                            : cell === "pending"
                              ? "consensus-lab__cell--pending"
                              : ""
                        }`}
                        title={`index ${i}: ${cell}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${nodes}-${partitionOn}-${splitIndex}-${round}`}
        prompt={predictPrompt}
        revealLabel="Show quorum vs replication ground truth"
      >
        <ComparePanel
          leftLabel="Replicated log"
          rightLabel="Quorum / safety"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          CFT: tolerate <strong>f = {fCrash}</strong> crash with <strong>N = 2f+1</strong> (
          {minNodesForCrashFaults(fCrash)} nodes). First commit in this config:{" "}
          <strong>
            {firstCommitRounds < 0
              ? "never (majority < Q)"
              : firstCommitRounds > 10
                ? ">10 steps"
                : `${firstCommitRounds} step(s)`}
          </strong>
          . Last step: <strong>{snap.messagesThisStep}</strong> AppendEntries RPCs.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        Step {round}: {compareLeft}{" "}
        {snap.quorumMet
          ? "Quorum commit — safe linearizable append on majority."
          : snap.canCommitOnMajority
            ? "Awaiting more follower ACKs."
            : "Partition blocks quorum — reveal above for intersection math."}
      </p>
    </LabShell>
  );
}
