import { useMemo, useState } from "react";
import {
  formatDeltaT,
  formatProbability,
  formatVector,
  quorumSatisfied,
  replicationArrivalProbability,
  staleReadProbability,
} from "../lib/eventual-math";
import {
  AMAZON_CART_PRESET,
  CONCURRENT_WRITES_PRESET,
  SLOW_REPLICATION_PRESET,
  buildTimeline,
  authoritativeValue,
  presetMeta,
  snapshotAtStep,
  type EventualPresetId,
} from "../lib/eventual-sim";
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
import "./EventualConsistencyLab.css";

const DELTA_T_MIN = 0;
const DELTA_T_MAX = 2;
const LAMBDA_MIN = 0.2;
const LAMBDA_MAX = 20;

export default function EventualConsistencyLab() {
  const [preset, setPreset] = useState<EventualPresetId>("amazon-cart");
  const [step, setStep] = useState(0);
  const [deltaT, setDeltaT] = useState(0.05);
  const [lambda, setLambda] = useState(AMAZON_CART_PRESET.lambda);
  const reducedMotion = usePrefersReducedMotion();

  const meta = presetMeta(preset);
  const n = meta.n;

  const timeline = useMemo(() => buildTimeline(preset), [preset]);
  const snap = useMemo(() => snapshotAtStep(timeline, step), [timeline, step]);
  const auth = useMemo(() => authoritativeValue(timeline), [timeline]);
  const maxStep = timeline.length - 1;

  const pStale = staleReadProbability(n, lambda, deltaT);
  const pArrived = replicationArrivalProbability(lambda, deltaT);
  const w = 1;
  const r = 1;
  const strongQuorum = quorumSatisfied(n, n, 1);

  const applyAmazon = () => {
    setPreset("amazon-cart");
    setLambda(AMAZON_CART_PRESET.lambda);
    setDeltaT(0.05);
    setStep(2);
  };

  const applyConcurrent = () => {
    setPreset("concurrent-writes");
    setLambda(CONCURRENT_WRITES_PRESET.lambda);
    setDeltaT(0.02);
    setStep(2);
  };

  const applySlow = () => {
    setPreset("slow-replication");
    setLambda(SLOW_REPLICATION_PRESET.lambda);
    setDeltaT(1.2);
    setStep(2);
  };

  const resetTimeline = () => setStep(0);
  const stepForward = () => setStep((s) => Math.min(maxStep, s + 1));

  const readReplica = snap.lastRead?.from;
  const metrics: LabMetric[] = [
    { id: "preset", label: "Scenario", value: meta.label.split(" (")[0] ?? meta.label },
    { id: "step", label: "Timeline step", value: `${step} / ${maxStep}` },
    { id: "n", label: "Replicas (N)", value: String(n) },
    { id: "w-r", label: "W / R", value: `${w} / ${r} (eventual)` },
    {
      id: "p-stale",
      label: "P(stale | Δt)",
      value: formatProbability(pStale),
      tone: pStale > 0.3 ? "warn" : pStale < 0.05 ? "aha" : "default",
    },
    {
      id: "arrival",
      label: "P(repl. arrived)",
      value: formatProbability(pArrived),
    },
  ];

  if (snap.lastRead) {
    metrics.push({
      id: "read",
      label: `Read @ ${snap.lastRead.from}`,
      value: snap.lastRead.stale
        ? `${snap.lastRead.value} (stale)`
        : `${snap.lastRead.value} (fresh)`,
      tone: snap.lastRead.stale ? "warn" : "aha",
    });
  }

  if (snap.converged) {
    metrics.push({
      id: "converged",
      label: "Convergence",
      value: `All replicas agree — merged ${formatVector(snap.mergedVector ?? {})}.`,
      tone: "aha",
    });
  } else if (snap.inFlight.length > 0) {
    metrics.push({
      id: "inflight",
      label: "In flight",
      value: `${snap.inFlight.length} replication message(s) pending.`,
      tone: "default",
    });
  }

  const compareLeft = snap.lastRead ? (
    <>
      Read from replica <strong>{snap.lastRead.from}</strong> returned{" "}
      <strong>{snap.lastRead.value ?? "∅"}</strong>
      {snap.lastRead.stale ? (
        <> — <em>stale</em> (authoritative value after convergence is {auth}).</>
      ) : (
        <> — matches authoritative value <strong>{auth}</strong>.</>
      )}
    </>
  ) : (
    <>
      Step the timeline: a <strong>W=1</strong> write succeeds on the primary before async
      replication finishes. Reads with <strong>R=1</strong> can hit an outdated replica.
    </>
  );

  const compareRight = (
    <>
      Model: P(stale | Δt) = ((N−1)/N)·e<sup>−λΔt</sup> ={" "}
      <strong>{formatProbability(pStale)}</strong> at Δt = {formatDeltaT(deltaT)}, λ = {lambda}
      /s, N = {n}. Strong quorum (W+R&gt;N) would need W+R&gt;{n} — here{" "}
      {strongQuorum ? "satisfied" : "not satisfied"} for W=R=1.
      {snap.mergedVector && Object.keys(snap.mergedVector).length > 0 && (
        <>
          {" "}
          Merged vector: <strong>{formatVector(snap.mergedVector)}</strong>.
        </>
      )}
    </>
  );

  const predictStale =
    preset === "amazon-cart" || preset === "slow-replication"
      ? step <= 2
      : step >= 2 && step < 5;

  return (
    <LabShell
      intro={
        <>
          <strong>Eventual consistency</strong> (W=1, R=1): writes return immediately; replicas
          converge via async replication and <strong>version-vector</strong> max-merge. Step the
          timeline for stale reads, then convergence — same tradeoff as the README Amazon cart
          diagram.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <ScenarioPresets
              aria-label="Eventual consistency presets"
              presets={[
                { id: "cart", label: "Amazon cart", onSelect: applyAmazon },
                { id: "vv", label: "Concurrent writes", onSelect: applyConcurrent },
                { id: "slow", label: "Slow replication", onSelect: applySlow },
              ]}
            />
            <RangeControl
              id="ec-step"
              label="Timeline step"
              min={0}
              max={maxStep}
              value={step}
              valueText={`step ${step}: ${snap.label.split("—")[0]?.trim() ?? snap.label}`}
              onChange={setStep}
            />
            <RangeControl
              id="ec-dt"
              label="Δt since write (model)"
              min={DELTA_T_MIN}
              max={DELTA_T_MAX}
              step={0.01}
              value={deltaT}
              valueText={formatDeltaT(deltaT)}
              onChange={setDeltaT}
            />
            <RangeControl
              id="ec-lambda"
              label="λ (replication rate)"
              min={LAMBDA_MIN}
              max={LAMBDA_MAX}
              step={0.1}
              value={lambda}
              valueText={`${lambda.toFixed(1)}/s`}
              onChange={setLambda}
            />
          </div>

          <div className="lab__row">
            <button type="button" className="lab__btn" onClick={stepForward} disabled={step >= maxStep}>
              Step timeline
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={resetTimeline}>
              Reset
            </button>
          </div>

          <div
            className={`eventual-lab__timeline ${reducedMotion ? "eventual-lab__timeline--static" : ""}`}
            role="img"
            aria-label={`Version vector timeline: step ${step} of ${maxStep}`}
          >
            {timeline.map((f, i) => (
              <div
                key={f.tick}
                className={`eventual-lab__tick ${i <= step ? "eventual-lab__tick--active" : ""} ${f.lastRead?.stale && i === step ? "eventual-lab__tick--read" : ""}`}
                style={{ height: `${((i + 1) / timeline.length) * 100}%`, opacity: i <= step ? 1 : 0.35 }}
                title={f.label}
              />
            ))}
          </div>

          <p className="lab__hint">{snap.label}</p>

          <div
            className="eventual-lab__replicas"
            role="img"
            aria-label={`Replica states at step ${step}`}
          >
            {snap.replicas.map((rep) => {
              const isReadTarget = readReplica === rep.id;
              const isStaleTarget = isReadTarget && snap.lastRead?.stale;
              const isPrimary = rep.id === "A" && step > 0 && preset !== "concurrent-writes";
              return (
                <div
                  key={rep.id}
                  className={`eventual-lab__replica ${isPrimary ? "eventual-lab__replica--primary" : ""} ${isStaleTarget ? "eventual-lab__replica--stale" : ""} ${isReadTarget && !isStaleTarget ? "eventual-lab__replica--fresh" : ""}`}
                >
                  <div className="eventual-lab__replica-id">Replica {rep.id}</div>
                  <div className="eventual-lab__value">{rep.value ?? "—"}</div>
                  <div className="eventual-lab__vector">{formatVector(rep.vector)}</div>
                </div>
              );
            })}
          </div>

          {snap.inFlight.length > 0 && (
            <p className="eventual-lab__inflight">
              Replication in flight:{" "}
              {snap.inFlight.map((e) => `${e.from}→${e.to}`).join(", ")}
            </p>
          )}

          {snap.mergedVector && Object.keys(snap.mergedVector).length > 0 && (
            <p className="eventual-lab__merged">
              Merged vector (component-wise max): <strong>{formatVector(snap.mergedVector)}</strong>
            </p>
          )}
        </div>

        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${preset}-${step}-${deltaT}`}
        prompt={
          <>
            At step <strong>{step}</strong>
            {snap.lastRead
              ? `, replica ${snap.lastRead.from} was just read`
              : ", before the next read"}
            : will the client see a <strong>stale</strong> value? (P(stale) model ≈{" "}
            {formatProbability(pStale)} at Δt = {formatDeltaT(deltaT)}.)
          </>
        }
        storageKey="eventual-consistency"
        options={[
          { id: "stale", label: "Yes — read is likely stale", isCorrect: predictStale },
          { id: "fresh", label: "No — read is fresh or no read occurred", isCorrect: !predictStale },
        ]}
        revealLabel="Show read vs authoritative & merge"
      >
        <ComparePanel
          leftLabel="Client read (R=1)"
          rightLabel="Ground truth & model"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {predictStale
            ? "Before full replication, expect stale reads — step forward to watch vectors merge and values converge."
            : snap.converged
              ? "Replicas converged; P(stale | Δt) → 0 as Δt grows (exponential decay in the README bound)."
              : "Concurrent writes use vector clocks; max-merge resolves divergence without blocking writes."}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        Step {step}/{maxStep}: {snap.converged ? "Converged." : "Replication in progress."}{" "}
        {snap.lastRead
          ? `Last read from ${snap.lastRead.from}: ${snap.lastRead.stale ? "stale" : "fresh"}.`
          : "Use presets or step to trigger stale reads."}
      </p>
    </LabShell>
  );
}
