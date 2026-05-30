import { useMemo, useState } from "react";
import {
  formatLag,
  formatRate,
  formatRatio,
  formatRho,
  littlesLaw,
  utilizationMc,
} from "../lib/dist-queues-math";
import {
  BALANCED_HASH_PRESET,
  CLICKSTREAM_PRESET,
  HOT_USER_PRESET,
  compareRoutingModes,
  simulateRouting,
  type RoutingMode,
} from "../lib/dist-queues-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./DistributedQueuesLab.css";

const PARTITION_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#a855f7",
];

export default function DistributedQueuesLab() {
  const [partitions, setPartitions] = useState(8);
  const [messageCount, setMessageCount] = useState(320);
  const [skew, setSkew] = useState(7);
  const [mode, setMode] = useState<RoutingMode>("hash");
  const [lambda, setLambda] = useState(10000);
  const [avgWait, setAvgWait] = useState(0.5);
  const [workers, setWorkers] = useState(4);
  const [mu, setMu] = useState(3500);

  const sim = useMemo(
    () => simulateRouting(partitions, messageCount, skew, mode),
    [partitions, messageCount, skew, mode]
  );
  const comparison = useMemo(
    () => compareRoutingModes(partitions, messageCount, skew),
    [partitions, messageCount, skew]
  );

  const rho = utilizationMc(lambda, workers, mu);
  const L = littlesLaw(lambda, avgWait);
  const maxLoad = Math.max(...sim.loads, 1);
  const hotPartition = sim.loads.indexOf(sim.maxLoad);

  const hashHotter =
    comparison.hash.imbalance > comparison.random.imbalance * 1.4 && skew >= 5;
  const randomMoreViolations =
    comparison.random.userOrderViolations > comparison.hash.userOrderViolations + 5;

  const applyHotUser = () => {
    setPartitions(HOT_USER_PRESET.partitions);
    setMessageCount(HOT_USER_PRESET.messages);
    setSkew(HOT_USER_PRESET.skew);
    setMode(HOT_USER_PRESET.mode);
  };

  const applyClickstream = () => {
    setPartitions(CLICKSTREAM_PRESET.partitions);
    setMessageCount(CLICKSTREAM_PRESET.messages);
    setSkew(CLICKSTREAM_PRESET.skew);
    setMode(CLICKSTREAM_PRESET.mode);
  };

  const applyBalancedHash = () => {
    setPartitions(BALANCED_HASH_PRESET.partitions);
    setMessageCount(BALANCED_HASH_PRESET.messages);
    setSkew(BALANCED_HASH_PRESET.skew);
    setMode(BALANCED_HASH_PRESET.mode);
  };

  const metrics: LabMetric[] = [
    { id: "parts", label: "Partitions", value: String(partitions) },
    { id: "msgs", label: "Messages", value: String(messageCount) },
    { id: "skew", label: "Traffic skew", value: String(skew) },
    {
      id: "max",
      label: "Max partition load",
      value: String(sim.maxLoad),
      tone: sim.imbalance >= 2 ? "warn" : "default",
    },
    {
      id: "imb",
      label: "Imbalance (max/mean)",
      value: formatRatio(sim.imbalance),
      tone: sim.imbalance >= 2 ? "warn" : "default",
    },
    {
      id: "lag",
      label: "Max lag vs mean",
      value: formatLag(sim.lag),
      tone: sim.lag > messageCount / partitions ? "warn" : "default",
    },
    {
      id: "viol",
      label: "User-order violations",
      value: String(sim.userOrderViolations),
      tone: sim.userOrderViolations > 0 && mode === "random" ? "aha" : "default",
    },
    {
      id: "little",
      label: "Little's law L = λW",
      value: `${L.toLocaleString()} msgs`,
    },
    {
      id: "rho",
      label: `ρ = λ/(c·μ)`,
      value: formatRho(rho),
      tone: rho >= 0.85 ? "warn" : "default",
    },
  ];

  if (hashHotter && mode === "hash") {
    metrics.push({
      id: "aha-hot",
      label: "Aha — hot partition",
      value: `Hash imbalance ${formatRatio(comparison.hash.imbalance)} vs random ${formatRatio(comparison.random.imbalance)}.`,
      tone: "aha",
    });
  } else if (randomMoreViolations && mode === "random") {
    metrics.push({
      id: "aha-order",
      label: "Aha — ordering tradeoff",
      value: `Random: ${comparison.random.userOrderViolations} user-order breaks vs hash ${comparison.hash.userOrderViolations}.`,
      tone: "aha",
    });
  }

  const compareLeft = `Hash: max load ${comparison.hash.maxLoad}, imbalance ${formatRatio(comparison.hash.imbalance)}, ${comparison.hash.userOrderViolations} order violations`;
  const compareRight = `Random: max load ${comparison.random.maxLoad}, imbalance ${formatRatio(comparison.random.imbalance)}, ${comparison.random.userOrderViolations} order violations`;

  return (
    <LabShell
      intro={
        <>
          <strong>Partition routing tradeoff</strong>: <em>hash(userId)</em> keeps per-user order
          on one partition but risks <strong>hot partitions</strong> when traffic skews to a few
          keys. <em>Random</em> routing spreads load evenly but breaks user order when consumers
          merge partitions round-robin. Bars show one deterministic run; metrics include README{" "}
          <strong>Little&apos;s law</strong> and M/M/c utilization ρ.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="distq-parts"
              label="Partitions"
              min={3}
              max={12}
              value={partitions}
              valueText={`${partitions} partitions`}
              onChange={setPartitions}
            />
            <RangeControl
              id="distq-msgs"
              label="Messages"
              min={100}
              max={500}
              step={20}
              value={messageCount}
              valueText={`${messageCount} messages`}
              onChange={setMessageCount}
            />
            <RangeControl
              id="distq-skew"
              label="Traffic skew (hot user)"
              min={1}
              max={10}
              value={skew}
              valueText={`skew ${skew}`}
              onChange={setSkew}
            />
            <RangeControl
              id="distq-lambda"
              label="Arrival rate λ (Little's law)"
              min={1000}
              max={20000}
              step={500}
              value={lambda}
              valueText={formatRate(lambda)}
              onChange={setLambda}
            />
            <RangeControl
              id="distq-w"
              label="Avg time in system W (sec)"
              min={1}
              max={20}
              value={Math.round(avgWait * 10)}
              valueText={`${avgWait.toFixed(1)}s`}
              onChange={(v) => setAvgWait(v / 10)}
            />
            <RangeControl
              id="distq-c"
              label="Consumer workers (c)"
              min={1}
              max={8}
              value={workers}
              valueText={`${workers} workers`}
              onChange={setWorkers}
            />
            <RangeControl
              id="distq-mu"
              label="Service rate μ per worker"
              min={1000}
              max={5000}
              step={250}
              value={mu}
              valueText={formatRate(mu)}
              onChange={setMu}
            />
            <ScenarioPresets
              aria-label="Distributed queue routing presets"
              presets={[
                { id: "hot", label: "Hot user (hash)", onSelect: applyHotUser },
                { id: "click", label: "Clickstream (random)", onSelect: applyClickstream },
                { id: "balanced", label: "Balanced hash", onSelect: applyBalancedHash },
              ]}
            />
          </div>

          <div className="lab__row" role="group" aria-label="Producer routing strategy">
            <button
              type="button"
              className={`lab__btn ${mode === "hash" ? "" : "lab__btn--ghost"}`}
              aria-pressed={mode === "hash"}
              onClick={() => setMode("hash")}
            >
              Hash (keyed)
            </button>
            <button
              type="button"
              className={`lab__btn ${mode === "random" ? "" : "lab__btn--ghost"}`}
              aria-pressed={mode === "random"}
              onClick={() => setMode("random")}
            >
              Random
            </button>
          </div>

          <div
            className="distq-lab__chart"
            role="img"
            aria-label={`Partition loads: max ${sim.maxLoad} on partition ${hotPartition}, imbalance ${formatRatio(sim.imbalance)}, ${mode} routing`}
          >
            {sim.loads.map((load, i) => (
              <div
                key={i}
                className={`distq-lab__bar ${i === hotPartition && sim.imbalance >= 1.5 ? "distq-lab__bar--hot" : ""}`}
                style={{
                  height: `${(load / maxLoad) * 100}%`,
                  background:
                    PARTITION_COLORS[i % PARTITION_COLORS.length],
                }}
                title={`partition ${i}: ${load} messages`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Bar height = messages per partition (seed 42). Orange = hottest partition. Toggle hash vs
            random to see load spread vs per-user ordering in metrics.
          </p>

          <div
            className="distq-lab__strip"
            role="img"
            aria-label={`Recent messages colored by partition, ${mode} routing`}
          >
            {sim.messages.slice(-120).map((m) => (
              <div
                key={m.seq}
                className="distq-lab__msg"
                style={{
                  background: PARTITION_COLORS[m.partition % PARTITION_COLORS.length],
                }}
                title={`seq ${m.seq} user ${m.userId} → p${m.partition}`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Strip = last 120 messages in produce order (color = partition). Same user can land on
            different partitions under random routing.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${partitions}-${messageCount}-${skew}`}
        prompt={
          <>
            With <strong>{partitions}</strong> partitions, <strong>{messageCount}</strong> messages,
            and skew <strong>{skew}</strong>, will <strong>hash routing</strong> create a hotter
            partition than <strong>random</strong>, while random causes more{" "}
            <strong>user-order violations</strong> after round-robin consumption?
          </>
        }
        revealLabel="Compare hash vs random routing"
      >
        <ComparePanel
          leftLabel="Hash (keyed)"
          rightLabel="Random (probabilistic)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Hash preserves per-user FIFO on one partition but concentrates skewed keys. Random
          balances partitions at the cost of global per-user order when consumers merge streams.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {mode === "hash" ? "Hash" : "Random"} routing · partition {hotPartition} peak {sim.maxLoad}{" "}
        · L = λW ≈ {L.toLocaleString()} at {formatRate(lambda)} · ρ = {formatRho(rho)}. Reveal above
        for hash vs random on the same traffic skew.
      </p>
    </LabShell>
  );
}
