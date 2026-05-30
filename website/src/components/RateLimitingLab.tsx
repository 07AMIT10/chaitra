import { useEffect, useMemo, useState } from "react";
import { formatPercent, tokenBucketAcceptBound } from "../lib/rate-limit-math";
import { acceptRate, simulateBurst, summarizeResults } from "../lib/rate-limit-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./RateLimitingLab.css";

const DURATION_SEC = 3;

export default function RateLimitingLab() {
  const [capacity, setCapacity] = useState(10);
  const [refillRate, setRefillRate] = useState(5);
  const [requestRate, setRequestRate] = useState(20);
  const [initialTokens, setInitialTokens] = useState<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const effectiveInitial = initialTokens ?? capacity;

  const results = useMemo(
    () =>
      simulateBurst(capacity, refillRate, requestRate, DURATION_SEC, {
        initialTokens: effectiveInitial,
      }),
    [capacity, refillRate, requestRate, effectiveInitial]
  );

  const { accepted, dropped, total } = summarizeResults(results);

  useEffect(() => {
    setVisibleCount(results.length);
  }, [results]);

  useEffect(() => {
    if (!isPlaying) return;
    setVisibleCount(1);
    const id = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= results.length) {
          setIsPlaying(false);
          return results.length;
        }
        return c + 2;
      });
    }, 70);
    return () => clearInterval(id);
  }, [isPlaying, results.length]);

  const visibleResults = results.slice(0, visibleCount);
  const acceptedFrac = acceptRate(results);
  const bound = tokenBucketAcceptBound(capacity, refillRate, requestRate, DURATION_SEC);
  const overload = requestRate > refillRate + 0.5;
  const burstDrain = effectiveInitial < capacity && overload;

  const applyBurstTraffic = () => {
    setCapacity(10);
    setRefillRate(5);
    setRequestRate(40);
    setInitialTokens(undefined);
  };

  const applySteadyRate = () => {
    setCapacity(10);
    setRefillRate(5);
    setRequestRate(5);
    setInitialTokens(undefined);
  };

  const applyEmptyBucket = () => {
    setCapacity(10);
    setRefillRate(5);
    setRequestRate(20);
    setInitialTokens(0);
  };

  const metrics: LabMetric[] = [
    { id: "cap", label: "Bucket capacity", value: String(capacity) },
    { id: "refill", label: "Refill rate", value: `${refillRate}/sec` },
    { id: "req", label: "Request rate", value: `${requestRate}/sec` },
    {
      id: "tokens",
      label: "Starting tokens",
      value: effectiveInitial === capacity ? "Full" : String(effectiveInitial),
      tone: burstDrain ? "warn" : "default",
    },
    { id: "window", label: "Simulated requests", value: String(total) },
    {
      id: "bound",
      label: "Budget bound (approx)",
      value: formatPercent(bound),
      tone: "default",
    },
  ];
  if (overload && acceptedFrac < 0.5) {
    metrics.push({
      id: "aha",
      label: "Aha — bucket drained",
      value: `Offered ${requestRate}/s vs ${refillRate}/s refill — excess gets 429.`,
      tone: "aha",
    });
  }

  const compareLeft = `${accepted} accepted (200 OK) — ${formatPercent(acceptedFrac)}`;
  const compareRight = `${dropped} dropped (429) — ${formatPercent(1 - acceptedFrac)}`;

  return (
    <LabShell
      intro={
        <>
          Deterministic <strong>token bucket</strong> refills at a steady rate; burst traffic drains
          tokens and excess requests get HTTP 429. The timeline below is the exact discrete simulator
          used in the lab — probabilistic edge drops from the README use the same overload intuition
          with random rejection instead of counters.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="rl-cap"
              label="Bucket capacity"
              min={5}
              max={50}
              value={capacity}
              valueText={`${capacity} tokens`}
              onChange={(v) => {
                setCapacity(v);
                setInitialTokens(undefined);
              }}
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
            <ScenarioPresets
              aria-label="Rate limit scenario presets"
              presets={[
                { id: "burst", label: "Burst traffic", onSelect: applyBurstTraffic },
                { id: "steady", label: "Steady rate", onSelect: applySteadyRate },
                { id: "empty", label: "Empty bucket start", onSelect: applyEmptyBucket },
              ]}
            />
            <button
              type="button"
              className="lab__btn"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause rate limit timeline playback" : "Play rate limit timeline playback"}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play timeline"}
            </button>
          </div>
          <svg
            className="rl-lab__chart"
            viewBox={`0 0 ${Math.max(visibleResults.length * 4, 40)} 100`}
            role="img"
            aria-label={`Accept vs drop timeline: ${accepted} accepted, ${dropped} dropped over ${DURATION_SEC} seconds`}
          >
            {visibleResults.map((r, i) => {
              const h = Math.max(12, (r.tokens / capacity) * 80);
              return (
                <rect
                  key={i}
                  x={i * 4}
                  y={100 - h}
                  width={3}
                  height={h}
                  fill={r.allowed ? "var(--color-success)" : "var(--color-error)"}
                >
                  <title>{`t=${r.time.toFixed(2)}s ${r.allowed ? "200" : "429"} · ${r.tokens.toFixed(1)} tokens left`}</title>
                </rect>
              );
            })}
          </svg>
          <p className="lab__hint">
            Bar height ≈ tokens remaining after each request. Green = accepted, red = HTTP 429.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${capacity}-${refillRate}-${requestRate}-${effectiveInitial}`}
        prompt={
          <>
            With capacity <strong>{capacity}</strong>, refill <strong>{refillRate}/s</strong>, request
            rate <strong>{requestRate}/s</strong>
            {effectiveInitial < capacity ? (
              <>
                , and an <strong>empty bucket</strong>
              </>
            ) : null}{" "}
            over {DURATION_SEC}s ({total} requests), will <strong>more than half</strong> be dropped
            (429)?
          </>
        }
        storageKey="rate-limit"
        options={[
          { id: "yes", label: "Yes — more than half dropped", isCorrect: dropped > accepted },
          { id: "no", label: "No — most requests accepted", isCorrect: dropped <= accepted },
        ]}
        revealLabel="Show accepted vs dropped"
      >
        <ComparePanel
          leftLabel="Accepted (200)"
          rightLabel="Dropped (429)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Token budget ≈ {capacity} + {refillRate}×{DURATION_SEC} ={" "}
          {capacity + refillRate * DURATION_SEC} tokens vs {total} offered — simulated accept rate{" "}
          {formatPercent(acceptedFrac)} (budget bound ≈ {formatPercent(bound)}).
          {burstDrain && " Starting empty delays early accepts until refill catches up."}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {requestRate} req/s against {refillRate} token/s refill, {effectiveInitial === capacity ? "full" : effectiveInitial}{" "}
        starting tokens. Reveal above for accept vs drop counts.
      </p>
    </LabShell>
  );
}
