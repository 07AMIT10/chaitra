import { useMemo, useState } from "react";
import {
  formatQueueMetric,
  formatRate,
  formatRho,
  theoreticalQueueLength,
  theoreticalWait,
  utilization,
} from "../lib/queue-math";
import { mm1Sim, mm1SimAverage } from "../lib/queue-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./QueueingTheoryLab.css";

const SIM_DURATION = 20;
const SIM_TRIALS = 8;

export default function QueueingTheoryLab() {
  const [lambda, setLambda] = useState(4);
  const [mu, setMu] = useState(6);

  const rho = utilization(lambda, mu);
  const unstable = rho >= 1;
  const theoryLq = theoreticalQueueLength(rho);
  const theoryWq = theoreticalWait(rho, mu);

  const chartSim = useMemo(() => mm1Sim(lambda, mu, SIM_DURATION), [lambda, mu]);
  const avgSim = useMemo(
    () => mm1SimAverage(lambda, mu, SIM_DURATION, SIM_TRIALS),
    [lambda, mu]
  );

  const maxQ = Math.max(...chartSim.events.map((e) => e.queue), 1);
  const queueExplodes = unstable || chartSim.maxQueue >= 15;
  const waitClose =
    !unstable &&
    Number.isFinite(theoryWq) &&
    Math.abs(avgSim.avgWait - theoryWq) / Math.max(theoryWq, 0.01) < 0.35;

  const applyStableRho = () => {
    setLambda(4);
    setMu(6);
  };

  const applyOverloaded = () => {
    setLambda(9);
    setMu(5);
  };

  const applyLightTraffic = () => {
    setLambda(1);
    setMu(10);
  };

  const metrics: LabMetric[] = [
    { id: "lambda", label: "Arrival rate λ", value: formatRate(lambda) },
    { id: "mu", label: "Service rate μ", value: formatRate(mu) },
    {
      id: "rho",
      label: "Utilization ρ = λ/μ",
      value: formatRho(rho),
      tone: unstable ? "warn" : rho >= 0.85 ? "warn" : "default",
    },
    {
      id: "lq-theory",
      label: "L_q (theory)",
      value: formatQueueMetric(theoryLq, " items"),
    },
    {
      id: "lq-sim",
      label: `L_q (sim, ${SIM_TRIALS} runs)`,
      value: formatQueueMetric(avgSim.avgQueue, " items"),
    },
    {
      id: "wq-theory",
      label: "W_q (theory)",
      value: formatQueueMetric(theoryWq, "s"),
    },
    {
      id: "wq-sim",
      label: `W_q (sim, ${SIM_TRIALS} runs)`,
      value: formatQueueMetric(avgSim.avgWait, "s"),
      tone: waitClose && !unstable ? "aha" : unstable ? "warn" : "default",
    },
  ];
  if (waitClose && !unstable && rho >= 0.5) {
    metrics.push({
      id: "aha",
      label: "Theory ↔ sim",
      value: `W_q within ~35% of ρ/(μ(1−ρ)) at ρ=${formatRho(rho)}.`,
      tone: "aha",
    });
  }

  const compareLeft = unstable
    ? `Theory: unstable (ρ=${formatRho(rho)} ≥ 1) — L_q and W_q → ∞`
    : `Theory: L_q=${formatQueueMetric(theoryLq)} · W_q=${formatQueueMetric(theoryWq, "s")}`;
  const compareRight = unstable
    ? `Sim: max queue ${chartSim.maxQueue} (grows without bound)`
    : `Sim (${SIM_TRIALS}×${SIM_DURATION}s): L_q≈${formatQueueMetric(avgSim.avgQueue)} · W_q≈${formatQueueMetric(avgSim.avgWait, "s")}`;

  return (
    <LabShell
      intro={
        <>
          <strong>M/M/1 queue</strong>: Poisson arrivals (λ) and exponential service (μ) on one
          server. The chart is one discrete-event run; metrics average {SIM_TRIALS} runs against
          README formulas L_q = ρ²/(1−ρ) and W_q = ρ/(μ(1−ρ)).
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="q-lambda"
              label="Arrival rate λ"
              min={1}
              max={10}
              value={lambda}
              valueText={`${lambda} arrivals per second`}
              onChange={setLambda}
            />
            <RangeControl
              id="q-mu"
              label="Service rate μ"
              min={2}
              max={15}
              value={mu}
              valueText={`${mu} services per second`}
              onChange={setMu}
            />
            <ScenarioPresets
              aria-label="M/M/1 queue scenario presets"
              presets={[
                { id: "stable", label: "Stable ρ≈0.67", onSelect: applyStableRho },
                { id: "overload", label: "Overloaded ρ>1", onSelect: applyOverloaded },
                { id: "light", label: "Light traffic", onSelect: applyLightTraffic },
              ]}
            />
          </div>
          <div
            className="queue-lab__chart"
            role="img"
            aria-label={`Queue length over ${SIM_DURATION} seconds; max ${chartSim.maxQueue}`}
          >
            {chartSim.events.map((e, i) => (
              <div
                key={i}
                className="queue-lab__bar"
                style={{ height: `${(e.queue / maxQ) * 100}%` }}
                title={`t=${e.time.toFixed(1)}s queue=${e.queue}`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Bar height = customers waiting. Near ρ→1 the hockey-stick curve steepens; at ρ≥1 the
            system is unstable.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${lambda}-${mu}`}
        prompt={
          <>
            With λ=<strong>{lambda}</strong>/sec and μ=<strong>{mu}</strong>/sec (ρ=
            <strong>{formatRho(rho)}</strong>), will the queue{" "}
            <strong>explode</strong> (unbounded growth)?
          </>
        }
        revealLabel="Show theory vs simulation"
      >
        <ComparePanel
          leftLabel="M/M/1 theory"
          rightLabel={`Simulation (${SIM_TRIALS} runs)`}
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {unstable
            ? `ρ ≥ 1: arrivals outpace service — theory predicts infinite backlog; sim max queue ${chartSim.maxQueue} in ${SIM_DURATION}s.`
            : queueExplodes
              ? `ρ < 1 but bursty: short run peaked at ${chartSim.maxQueue} — try Stable ρ or raise μ.`
              : waitClose
                ? `Stable load: simulated W_q tracks ρ/(μ(1−ρ)); L_q tracks ρ²/(1−ρ).`
                : `Stable ρ=${formatRho(rho)}: run longer or increase trials for tighter W_q match.`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        ρ = {formatRho(rho)} · chart max queue {chartSim.maxQueue}.{" "}
        {unstable
          ? "System unstable (λ ≥ μ)."
          : `Avg wait (sim) ${formatQueueMetric(avgSim.avgWait, "s")} vs theory ${formatQueueMetric(theoryWq, "s")}.`}
      </p>
    </LabShell>
  );
}
