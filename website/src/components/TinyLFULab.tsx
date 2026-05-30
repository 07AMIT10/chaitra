import { useEffect, useMemo, useState } from "react";
import { formatHitRatio } from "../lib/tinylfu-math";
import {
  CACHE_SCAN_TRACE,
  HOT_COLD_TRACE,
  replayTrace,
  TinyLFUCache,
  type AccessResult,
} from "../lib/tinylfu-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./TinyLFULab.css";

type TraceId = "scan" | "hot-cold";

const TRACES: Record<TraceId, readonly string[]> = {
  scan: CACHE_SCAN_TRACE,
  "hot-cold": HOT_COLD_TRACE,
};

function replayToStep(trace: readonly string[], capacity: number, step: number, admission: boolean) {
  const cache = new TinyLFUCache(capacity);
  const slice = trace.slice(0, step + 1);
  let last: AccessResult = "miss-admit";
  for (const key of slice) {
    last = cache.access(key, admission);
  }
  return { cache, slice, last };
}

export default function TinyLFULab() {
  const [traceId, setTraceId] = useState<TraceId>("scan");
  const [capacity, setCapacity] = useState(8);
  const [step, setStep] = useState(CACHE_SCAN_TRACE.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);

  const trace = TRACES[traceId];
  const maxStep = trace.length - 1;
  const safeStep = Math.min(step, maxStep);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= maxStep) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, maxStep]);

  const withAdmit = useMemo(
    () => replayTrace(trace, capacity, true),
    [trace, capacity]
  );
  const withoutAdmit = useMemo(
    () => replayTrace(trace, capacity, false),
    [trace, capacity]
  );

  const active = useMemo(
    () => replayToStep(trace, capacity, safeStep, true),
    [trace, capacity, safeStep]
  );

  const currentKey = trace[safeStep];
  const tlfuWins = withAdmit.hits > withoutAdmit.hits;
  const tie = withAdmit.hits === withoutAdmit.hits;

  const applyCacheScan = () => {
    setTraceId("scan");
    setCapacity(8);
    setStep(CACHE_SCAN_TRACE.length - 1);
  };

  const applyHotCold = () => {
    setTraceId("hot-cold");
    setCapacity(6);
    setStep(HOT_COLD_TRACE.length - 1);
  };

  const applyEarlyTrace = () => {
    setTraceId("scan");
    setCapacity(8);
    setStep(15);
  };

  const metrics: LabMetric[] = [
    { id: "cap", label: "Cache capacity", value: String(capacity) },
    {
      id: "step",
      label: "Trace position",
      value: `${safeStep + 1}/${trace.length}`,
    },
    {
      id: "cms",
      label: `CMS f("${currentKey}")`,
      value: String(active.cache.cms.getCount(currentKey)),
    },
    {
      id: "hits-tlfu",
      label: "Hits (TinyLFU)",
      value: `${withAdmit.hits} (${formatHitRatio(withAdmit.hits, trace.length)})`,
      tone: tlfuWins ? "aha" : "default",
    },
    {
      id: "hits-lru",
      label: "Hits (LRU only)",
      value: `${withoutAdmit.hits} (${formatHitRatio(withoutAdmit.hits, trace.length)})`,
    },
    {
      id: "rejected",
      label: "Rejected admissions",
      value: String(withAdmit.rejected.length),
      tone: withAdmit.rejected.length > 0 ? "default" : "default",
    },
  ];
  if (tlfuWins) {
    metrics.push({
      id: "aha",
      label: "Aha — admission guard",
      value: `TinyLFU +${withAdmit.hits - withoutAdmit.hits} hits by blocking low-frequency newcomers.`,
      tone: "aha",
    });
  }

  const compareLeft = `${formatHitRatio(withAdmit.hits, trace.length)} (${withAdmit.hits}/${trace.length} hits, ${withAdmit.rejected.length} rejected)`;
  const compareRight = `${formatHitRatio(withoutAdmit.hits, trace.length)} (${withoutAdmit.hits}/${trace.length} hits, LRU admits all newcomers)`;

  const lastLabel =
    active.last === "hit"
      ? "hit"
      : active.last === "miss-reject"
        ? "miss — rejected by TinyLFU"
        : "miss — admitted";

  return (
    <LabShell
      intro={
        <>
          TinyLFU uses a Count-Min Sketch to estimate frequency before admitting a newcomer on a full
          cache. Replay the trace and compare <strong>hit ratio</strong> with admission on vs LRU-only
          eviction.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="tlfu-cap"
              label="Cache capacity"
              min={4}
              max={12}
              value={capacity}
              valueText={`${capacity} slots`}
              onChange={setCapacity}
            />
            <RangeControl
              id="tlfu-step"
              label="Access trace step"
              min={0}
              max={maxStep}
              value={safeStep}
              valueText={`${safeStep + 1} of ${trace.length} — key "${currentKey}"`}
              onChange={(val) => {
                setIsPlaying(false);
                setStep(val);
              }}
            />
            <div className="lab__media-controls">
              <button
                type="button"
                className="lab__btn lab__btn--ghost"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause TinyLFU access stream" : "Play TinyLFU access stream"}
                style={{ flex: 1, minHeight: "36px" }}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                type="button"
                className="lab__btn lab__btn--ghost"
                onClick={() => {
                  setIsPlaying(false);
                  setStep(0);
                }}
                style={{ minHeight: "36px" }}
              >
                ⏮ Reset
              </button>
            </div>
            <ScenarioPresets
              aria-label="Cache trace scenario presets"
              presets={[
                { id: "scan", label: "Cache scan", onSelect: applyCacheScan },
                { id: "hot", label: "Hot vs cold", onSelect: applyHotCold },
                { id: "early", label: "Mid-scan only", onSelect: applyEarlyTrace },
              ]}
            />
          </div>

          <div
            className="tlfu-lab__trace"
            role="img"
            aria-label={`Access trace through step ${safeStep + 1}`}
          >
            {trace.map((k, i) => (
              <span
                key={`${k}-${i}`}
                className={`tlfu-lab__trace-key${i === safeStep ? " tlfu-lab__trace-key--current" : ""}${i < safeStep ? " tlfu-lab__trace-key--past" : ""}`}
                title={i === safeStep ? `Current: ${k}` : undefined}
              >
                {k}
              </span>
            ))}
          </div>

          <div className="tlfu-lab__cache" role="list" aria-label="Cache contents (LRU order, victim first)">
            {[...active.cache.window.keys()].map((k, i) => (
              <span
                key={k}
                className={`tlfu-lab__key${i === 0 && active.cache.window.size >= capacity ? " tlfu-lab__key--victim" : ""}`}
                role="listitem"
              >
                {k}
                <span className="tlfu-lab__freq">f̂={active.cache.cms.getCount(k)}</span>
              </span>
            ))}
          </div>
          <p className="lab__hint">
            Step {safeStep + 1}: <strong>{currentKey}</strong> → {lastLabel}. Victim (LRU):{" "}
            {active.cache.window.size >= capacity
              ? [...active.cache.window.keys()][0] ?? "—"
              : "—"}
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${traceId}-${capacity}-${trace.length}`}
        prompt={
          <>
            After the full <strong>{traceId === "scan" ? "cache scan" : "hot vs cold"}</strong> trace
            ({trace.length} accesses, capacity {capacity}), will{" "}
            <strong>TinyLFU admission</strong> achieve a higher hit ratio than{" "}
            <strong>LRU-only</strong>?
          </>
        }
        storageKey="tinylfu"
        options={[
          { id: "tlfu-wins", label: "TinyLFU achieves higher hit ratio", isCorrect: tlfuWins },
          { id: "lru-ties-wins", label: "LRU ties or beats TinyLFU", isCorrect: !tlfuWins },
        ]}
        revealLabel="Show hit ratio comparison"
      >
        <ComparePanel
          leftLabel="TinyLFU + CMS admission"
          rightLabel="LRU only (no admission)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {tlfuWins
            ? `TinyLFU wins by ${withAdmit.hits - withoutAdmit.hits} hits — sketch frequencies blocked ${withAdmit.rejected.length} low-value admissions.`
            : tie
              ? "Same hit ratio on this trace — try Cache scan or lower capacity to see admission matter."
              : `LRU-only matched or beat TinyLFU on this trace (${withoutAdmit.hits} vs ${withAdmit.hits} hits).`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {active.cache.window.size}/{capacity} slots after {safeStep + 1} accesses. Full trace: TinyLFU{" "}
        {formatHitRatio(withAdmit.hits, trace.length)}, LRU-only{" "}
        {formatHitRatio(withoutAdmit.hits, trace.length)}.
      </p>
    </LabShell>
  );
}
