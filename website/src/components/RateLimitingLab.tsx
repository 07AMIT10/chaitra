import { useMemo, useState } from "react";
import { acceptRate, simulateBurst } from "../lib/rate-limit-sim";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./RateLimitingLab.css";

export default function RateLimitingLab() {
  const [capacity, setCapacity] = useState(10);
  const [refillRate, setRefillRate] = useState(5);
  const [requestRate, setRequestRate] = useState(20);

  const results = useMemo(
    () => simulateBurst(capacity, refillRate, requestRate, 3),
    [capacity, refillRate, requestRate]
  );
  const accepted = acceptRate(results);
  const dropped = 1 - accepted;

  const metrics: LabMetric[] = [
    { id: "cap", label: "Bucket capacity", value: String(capacity) },
    { id: "refill", label: "Refill rate", value: `${refillRate}/sec` },
    { id: "req", label: "Request rate", value: `${requestRate}/sec` },
    { id: "accept", label: "Accepted", value: `${(accepted * 100).toFixed(0)}%` },
    {
      id: "drop",
      label: "Dropped (429)",
      value: `${(dropped * 100).toFixed(0)}%`,
      tone: dropped > 0.5 ? "warn" : "default",
    },
  ];

  return (
    <LabShell
      intro={
        <>
          Token bucket refills at a steady rate. Burst traffic drains tokens; excess requests get
          dropped — the classic rate limiter pattern from the README.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="rl-cap"
            label="Bucket capacity"
            min={5}
            max={50}
            value={capacity}
            valueText={`${capacity} tokens`}
            onChange={setCapacity}
          />
          <RangeControl
            id="rl-refill"
            label="Refill rate (tokens/sec)"
            min={1}
            max={20}
            value={refillRate}
            valueText={`${refillRate} tokens per second`}
            onChange={setRefillRate}
          />
          <RangeControl
            id="rl-req"
            label="Request rate (req/sec)"
            min={5}
            max={50}
            value={requestRate}
            valueText={`${requestRate} requests per second`}
            onChange={setRequestRate}
          />
          <div className="rl-lab__chart" role="img" aria-label="Accept vs drop over time">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rl-lab__bar ${r.allowed ? "rl-lab__bar--ok" : "rl-lab__bar--drop"}`}
                title={`t=${r.time.toFixed(2)}s ${r.allowed ? "200" : "429"}`}
              />
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        {requestRate} req/s against {refillRate} token/sec refill. {(accepted * 100).toFixed(0)}%
        accepted, {(dropped * 100).toFixed(0)}% dropped.
      </p>
    </LabShell>
  );
}
