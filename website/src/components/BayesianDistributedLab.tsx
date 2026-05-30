import { useMemo, useState } from "react";
import { formatPosterior } from "../lib/bayesian-dist-math";
import {
  SINGLE_SERVER_PRESET,
  SWITCH_CONGESTION_PRESET,
  SYMPTOM_PAIR_PRESET,
  TELEMETRY_CHIPS,
  applyChipSequence,
  applyTelemetryChip,
  chipById,
  emptyClusterBelief,
  inferBelief,
  paramsFromSliders,
  switchCongestionGroundTruth,
  type ClusterBeliefState,
  type TelemetryChip,
} from "../lib/bayesian-dist-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./BayesianDistributedLab.css";

function nodeFill(probability: number, active: boolean): string {
  const p = Math.min(1, Math.max(0, probability));
  const alpha = active ? 0.35 + p * 0.55 : 0.08 + p * 0.2;
  return `color-mix(in srgb, var(--color-accent) ${Math.round(alpha * 100)}%, transparent)`;
}

function BeliefGraph({
  pSwitch,
  pServerA,
  pServerB,
  obs,
}: {
  pSwitch: number;
  pServerA: number;
  pServerB: number;
  obs: ClusterBeliefState["observations"];
}) {
  const dbActive = obs.dbTimeout === "present";
  const userActive = obs.userFail === "present";

  return (
    <div className="bayes-dist-lab__graph" role="img" aria-label="Cluster belief network">
      <svg
        className="bayes-dist-lab__graph-svg"
        viewBox="0 0 320 220"
        aria-hidden="true"
      >
        <path className="bayes-dist-lab__edge" d="M160 42 L90 98" />
        <path className="bayes-dist-lab__edge" d="M160 42 L230 98" />
        <path className="bayes-dist-lab__edge" d="M90 118 L90 168" />
        <path className="bayes-dist-lab__edge" d="M230 118 L230 168" />

        <circle
          className="bayes-dist-lab__node"
          cx={160}
          cy={32}
          r={26}
          fill={nodeFill(pSwitch, true)}
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        <text className="bayes-dist-lab__node-label" x={160} y={28}>
          Switch
        </text>
        <text className="bayes-dist-lab__node-prob" x={160} y={40}>
          {formatPosterior(pSwitch)}
        </text>

        <circle
          className="bayes-dist-lab__node"
          cx={90}
          cy={108}
          r={22}
          fill={nodeFill(pServerA, obs.serverA !== "unknown")}
          stroke="var(--color-accent)"
          strokeWidth={obs.serverA === "slow" ? 2 : 1}
        />
        <text className="bayes-dist-lab__node-label" x={90} y={104}>
          Server A
        </text>
        <text className="bayes-dist-lab__node-prob" x={90} y={116}>
          {formatPosterior(pServerA)}
        </text>

        <circle
          className="bayes-dist-lab__node"
          cx={230}
          cy={108}
          r={22}
          fill={nodeFill(pServerB, obs.serverB !== "unknown")}
          stroke="var(--color-accent)"
          strokeWidth={obs.serverB === "slow" ? 2 : 1}
        />
        <text className="bayes-dist-lab__node-label" x={230} y={104}>
          Server B
        </text>
        <text className="bayes-dist-lab__node-prob" x={230} y={116}>
          {formatPosterior(pServerB)}
        </text>

        <rect
          className="bayes-dist-lab__node"
          x={58}
          y={168}
          width={64}
          height={28}
          rx={6}
          fill={nodeFill(dbActive ? 0.85 : 0.1, dbActive)}
          stroke="var(--color-accent)"
          strokeWidth={dbActive ? 2 : 1}
        />
        <text className="bayes-dist-lab__node-label" x={90} y={186}>
          DB timeout
        </text>

        <rect
          className="bayes-dist-lab__node"
          x={198}
          y={168}
          width={64}
          height={28}
          rx={6}
          fill={nodeFill(userActive ? 0.85 : 0.1, userActive)}
          stroke="var(--color-accent)"
          strokeWidth={userActive ? 2 : 1}
        />
        <text className="bayes-dist-lab__node-label" x={230} y={186}>
          User fail
        </text>
      </svg>
    </div>
  );
}

export default function BayesianDistributedLab() {
  const [priorPct, setPriorPct] = useState(5);
  const [pSlowSwitchPct, setPSlowSwitchPct] = useState(92);
  const [pSlowHealthyPct, setPSlowHealthyPct] = useState(6);
  const [belief, setBelief] = useState<ClusterBeliefState>(() => emptyClusterBelief());

  const params = useMemo(
    () => paramsFromSliders(priorPct, pSlowSwitchPct, pSlowHealthyPct),
    [priorPct, pSlowSwitchPct, pSlowHealthyPct]
  );

  const current = useMemo(
    () => inferBelief(params, belief.observations),
    [params, belief.observations]
  );

  const groundTruth = useMemo(() => switchCongestionGroundTruth(params), [params]);

  const bothSlow =
    belief.observations.serverA === "slow" && belief.observations.serverB === "slow";
  const symptomPair =
    belief.observations.dbTimeout === "present" &&
    belief.observations.userFail === "present";
  const showAha = bothSlow || symptomPair;

  const syncPrior = (pct: number) => {
    setPriorPct(pct);
    setBelief(emptyClusterBelief());
  };

  const applyPreset = (
    preset: {
      priorPct: number;
      pSlowSwitchPct: number;
      pSlowHealthyPct: number;
      chipIds: readonly string[];
    },
    setSliders: () => void
  ) => {
    setSliders();
    const p = paramsFromSliders(
      preset.priorPct,
      preset.pSlowSwitchPct,
      preset.pSlowHealthyPct
    );
    const chips = preset.chipIds
      .map((id) => chipById(id))
      .filter((c): c is TelemetryChip => c !== undefined);
    setBelief(applyChipSequence(p, chips));
    setPriorPct(preset.priorPct);
    setPSlowSwitchPct(preset.pSlowSwitchPct);
    setPSlowHealthyPct(preset.pSlowHealthyPct);
  };

  const applySwitchCongestion = () =>
    applyPreset(SWITCH_CONGESTION_PRESET, () => {});

  const applySymptomPair = () =>
    applyPreset(SYMPTOM_PAIR_PRESET, () => {});

  const applySingleServer = () =>
    applyPreset(SINGLE_SERVER_PRESET, () => {});

  const addChip = (chip: TelemetryChip) => {
    setBelief((b) => applyTelemetryChip(b, params, chip));
  };

  const resetTelemetry = () => {
    setBelief(emptyClusterBelief());
  };

  const metrics: LabMetric[] = [
    {
      id: "p-switch",
      label: "P(switch faulty)",
      value: formatPosterior(current.pSwitch),
      tone: current.pSwitch >= 0.5 ? "aha" : "default",
    },
    {
      id: "p-a",
      label: "P(Server A failed)",
      value: formatPosterior(current.pServerA),
    },
    {
      id: "p-b",
      label: "P(Server B failed)",
      value: formatPosterior(current.pServerB),
    },
    {
      id: "naive",
      label: "Naive sequential P(S)",
      value: formatPosterior(current.pSwitchNaive),
      tone:
        Math.abs(current.pSwitchNaive - current.pSwitch) > 0.15 ? "warn" : "default",
    },
    {
      id: "chips",
      label: "Telemetry applied",
      value: String(belief.steps.length),
    },
  ];

  if (showAha && current.pSwitch >= 0.5 && current.pServerA < 0.5) {
    metrics.push({
      id: "aha-switch",
      label: "Aha — shared root cause",
      value: "Both alarms fire but P(A dead) stays low — don't reboot.",
      tone: "aha",
    });
  }
  if (showAha && current.pSwitch >= 0.85) {
    metrics.push({
      id: "aha-route",
      label: "Recommended action",
      value: "Route traffic away from switch, not individual servers.",
      tone: "aha",
    });
  }

  const compareLeft = bothSlow || symptomPair
    ? `Deterministic ops: reboot Server A on first alarm`
    : `Naive sequential: ${formatPosterior(current.pSwitchNaive)} switch fault`;
  const compareRight = bothSlow || symptomPair
    ? `Bayesian joint: ${formatPosterior(current.pSwitch)} switch fault, P(A)=${formatPosterior(current.pServerA)}`
    : `Joint network: ${formatPosterior(current.pSwitch)}`;

  const predictPrompt =
    bothSlow || symptomPair ? (
      <>
        Both servers show <strong>500ms latency</strong> (or DB timeout + user fail). Would you{" "}
        <strong>reboot Server A</strong>?
      </>
    ) : (
      <>
        Prior switch fault <strong>{priorPct}%</strong>. After the next telemetry chip, will{" "}
        <strong>P(switch faulty)</strong> exceed <strong>50%</strong>?
      </>
    );

  return (
    <LabShell
      intro={
        <>
          <strong>Bayesian distributed systems</strong> maintain a belief network over noisy cluster
          telemetry. When <em>both</em> servers look sick, joint inference points to a shared switch
          fault — not two independent dead machines. The graph shows posterior mass on each node;
          compare deterministic reboots vs routing around the switch.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="bd-prior"
              label="Prior P(switch faulty)"
              min={1}
              max={30}
              value={priorPct}
              valueText={`${priorPct}%`}
              onChange={syncPrior}
            />
            <RangeControl
              id="bd-slow-switch"
              label="P(slow | switch faulty)"
              min={50}
              max={99}
              value={pSlowSwitchPct}
              valueText={`${pSlowSwitchPct}%`}
              onChange={setPSlowSwitchPct}
            />
            <RangeControl
              id="bd-slow-healthy"
              label="P(slow | healthy switch)"
              min={1}
              max={25}
              value={pSlowHealthyPct}
              valueText={`${pSlowHealthyPct}%`}
              onChange={setPSlowHealthyPct}
            />
            <ScenarioPresets
              aria-label="Cluster telemetry scenario presets"
              presets={[
                { id: "both", label: "Both servers slow", onSelect: applySwitchCongestion },
                { id: "symptoms", label: "DB + user fail", onSelect: applySymptomPair },
                { id: "single", label: "Single server alarm", onSelect: applySingleServer },
              ]}
            />
          </div>

          <BeliefGraph
            pSwitch={current.pSwitch}
            pServerA={current.pServerA}
            pServerB={current.pServerB}
            obs={belief.observations}
          />

          <p className="lab__hint">
            Node fill = posterior probability. Solid border = active telemetry alarm.
          </p>

          <div className="bayes-dist-lab__chips" role="group" aria-label="Telemetry chips">
            {TELEMETRY_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="bayes-dist-lab__chip"
                onClick={() => addChip(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="bayes-dist-lab__actions">
            <button type="button" className="bayes-dist-lab__reset" onClick={resetTelemetry}>
              Reset telemetry
            </button>
          </div>

          <div className="bayes-dist-lab__timeline" aria-label="Telemetry update chain">
            {belief.steps.length === 0 ? (
              <span className="lab__hint">No telemetry yet — click a chip or preset.</span>
            ) : (
              belief.steps.map((step, i) => (
                <span key={`${step.chip.id}-${i}`} className="bayes-dist-lab__step">
                  {i > 0 && <span className="bayes-dist-lab__step-arrow">→</span>}
                  <span>{step.chip.shortLabel}</span>
                  <span className="bayes-dist-lab__step-arrow">:</span>
                  <span>{formatPosterior(step.pSwitch)}</span>
                </span>
              ))
            )}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${priorPct}-${belief.steps.length}-${current.pSwitch}`}
        prompt={predictPrompt}
        storageKey="bayesian-distributed"
        options={
          bothSlow || symptomPair ? [
            { id: "no", label: "No — shared switch fault is likely, Server A is probably fine", isCorrect: current.pServerA < 0.5 },
            { id: "yes", label: "Yes — Server A is highly likely to have failed", isCorrect: current.pServerA >= 0.5 },
          ] : [
            { id: "yes", label: "Yes — P(switch faulty) > 50%", isCorrect: current.pSwitch > 0.5 },
            { id: "no", label: "No — P(switch faulty) is ≤ 50%", isCorrect: current.pSwitch <= 0.5 },
          ]
        }
        revealLabel="Show reboot vs route decision"
      >
        <ComparePanel
          leftLabel="Deterministic / naive"
          rightLabel="Bayesian joint network"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {bothSlow || symptomPair
            ? `README ground truth: P(switch) ≈ ${formatPosterior(groundTruth.jointPosterior)} with symptom pair; P(A failed) ≈ ${formatPosterior(groundTruth.pServerA)} — hold the reboot.`
            : `Single-alarm mode: joint ${formatPosterior(current.pSwitch)} vs naive ${formatPosterior(current.pSwitchNaive)}.`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        P(switch faulty) = {formatPosterior(current.pSwitch)} after {belief.steps.length} telemetry
        update{belief.steps.length === 1 ? "" : "s"}.
        {bothSlow
          ? " Both servers slow — correlated evidence favors shared switch fault."
          : ""}
      </p>
    </LabShell>
  );
}
