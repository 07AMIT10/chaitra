import { useMemo, useState } from "react";
import { mm1Sim, theoreticalWait } from "../lib/queue-sim";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./QueueingTheoryLab.css";

export default function QueueingTheoryLab() {
  const [lambda, setLambda] = useState(3);
  const [mu, setMu] = useState(5);

  const sim = useMemo(() => mm1Sim(lambda, mu, 10), [lambda, mu]);
  const rho = sim.rho;
  const theoryWait = theoreticalWait(rho, mu);
  const unstable = rho >= 1;

  const maxQ = Math.max(...sim.events.map((e) => e.queue), 1);

  const metrics: LabMetric[] = [
    { id: "lambda", label: "Arrival rate λ", value: `${lambda}/sec` },
    { id: "mu", label: "Service rate μ", value: `${mu}/sec` },
    {
      id: "rho",
      label: "Utilization ρ = λ/μ",
      value: rho.toFixed(2),
      tone: unstable ? "warn" : "default",
    },
    { id: "wait", label: "Avg wait (sim)", value: unstable ? "∞" : `${sim.avgWait.toFixed(2)}s` },
    {
      id: "theory",
      label: "Theory W (M/M/1)",
      value: unstable ? "∞" : `${theoryWait.toFixed(2)}s`,
    },
  ];

  return (
    <LabShell
      intro={
        <>
          M/M/1 queue: adjust arrival rate λ and service rate μ. When ρ = λ/μ approaches 1, wait
          times explode — Little&apos;s law in action.
        </>
      }
    >
      <div className="lab__grid">
        <div>
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
          <div className="queue-lab__chart" role="img" aria-label="Queue length over time">
            {sim.events.map((e, i) => (
              <div
                key={i}
                className="queue-lab__bar"
                style={{ height: `${(e.queue / maxQ) * 100}%` }}
                title={`t=${e.time.toFixed(1)}s queue=${e.queue}`}
              />
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        ρ = {rho.toFixed(2)}. Max queue {sim.maxQueue}.
        {unstable ? " System unstable (λ ≥ μ)." : ` Avg wait ${sim.avgWait.toFixed(2)}s.`}
      </p>
    </LabShell>
  );
}
