import { useEffect, useMemo, useState } from "react";
import { formatWindowLabel, formatWatermark } from "../lib/streaming-analytics-math";
import {
  CLICKSTREAM,
  DEFAULT_STREAM_CONFIG,
  PRE_CLOSE_PRESET,
  STREAM_MAX,
  TIGHT_WATERMARK_PRESET,
  TUNNEL_LATE_PRESET,
  ingestProgressPct,
  recentEventsTape,
  runStreamingAnalytics,
  type StreamingAnalyticsConfig,
} from "../lib/streaming-analytics-sim";
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
import "./StreamingAnalyticsLab.css";

const EVENT_TIME_MAX = 36;
const LATENESS_MAX = 8;

export default function StreamingAnalyticsLab() {
  const [streamIdx, setStreamIdx] = useState(STREAM_MAX);
  const [windowSize, setWindowSize] = useState(DEFAULT_STREAM_CONFIG.windowSize);
  const [allowedLateness, setAllowedLateness] = useState(DEFAULT_STREAM_CONFIG.allowedLateness);
  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setStreamIdx((idx) => {
        if (idx >= STREAM_MAX) {
          setIsPlaying(false);
          return STREAM_MAX;
        }
        return idx + 1;
      });
    }, 350);
    return () => clearInterval(id);
  }, [isPlaying]);

  const config: StreamingAnalyticsConfig = useMemo(
    () => ({ windowSize, allowedLateness }),
    [windowSize, allowedLateness]
  );

  const snap = useMemo(() => runStreamingAnalytics(streamIdx, config), [streamIdx, config]);
  const tape = recentEventsTape(snap.processed);

  const firstWindow = snap.windows[0];
  const firstMiss =
    firstWindow &&
    firstWindow.status === "closed" &&
    firstWindow.emittedSum !== null &&
    firstWindow.emittedSum !== firstWindow.exactSum;

  const applyTunnelLate = () => {
    setStreamIdx(TUNNEL_LATE_PRESET.streamIdx);
    setAllowedLateness(TUNNEL_LATE_PRESET.allowedLateness);
    setWindowSize(TUNNEL_LATE_PRESET.windowSize);
  };

  const applyTightWatermark = () => {
    setStreamIdx(TIGHT_WATERMARK_PRESET.streamIdx);
    setAllowedLateness(TIGHT_WATERMARK_PRESET.allowedLateness);
    setWindowSize(TIGHT_WATERMARK_PRESET.windowSize);
  };

  const applyPreClose = () => {
    setStreamIdx(PRE_CLOSE_PRESET.streamIdx);
    setAllowedLateness(PRE_CLOSE_PRESET.allowedLateness);
    setWindowSize(PRE_CLOSE_PRESET.windowSize);
  };

  const metrics: LabMetric[] = [
    {
      id: "ingest",
      label: "Ingest progress",
      value: `${snap.processed.length} / ${CLICKSTREAM.length}`,
    },
    {
      id: "wm",
      label: "Watermark",
      value: formatWatermark(snap.watermark),
      tone: "aha",
    },
    {
      id: "lateness",
      label: "Allowed lateness Δ",
      value: `${allowedLateness} t`,
    },
    {
      id: "window",
      label: "Tumbling window",
      value: formatWindowLabel(0, windowSize),
    },
    {
      id: "late",
      label: "Late events dropped",
      value: String(snap.totalLateDropped),
      tone: snap.totalLateDropped > 0 ? "warn" : "default",
    },
  ];

  if (firstMiss && firstWindow) {
    metrics.push({
      id: "aha-w0",
      label: "Aha — closed window gap",
      value: `Emitted ${firstWindow.emittedSum} vs exact ${firstWindow.exactSum} (Δt tunnel)`,
      tone: "aha",
    });
  }

  const compareLeft =
    firstWindow?.emittedSum !== null
      ? `Window [0,${windowSize}) emitted ${firstWindow.emittedSum}`
      : `Window [0,${windowSize}) partial ${firstWindow?.partialSum ?? 0}`;
  const compareRight = `Hindsight exact ${firstWindow?.exactSum ?? 0}`;

  const pct = (t: number) => `${(t / EVENT_TIME_MAX) * 100}%`;
  const wmLeft = pct(Math.min(snap.watermark, EVENT_TIME_MAX));
  const droppedSet = useMemo(() => new Set(snap.droppedIds), [snap.droppedIds]);

  return (
    <LabShell
      intro={
        <>
          Scrub <strong>ingest progress</strong> through a synthetic mobile clickstream processed in{" "}
          <strong>receive order</strong>. <strong>Tumbling event-time windows</strong> accumulate
          revenue-like totals; the <strong>watermark</strong> closes a window when{" "}
          <code>max(event time) − Δ</code> passes its end. Late tunnel events after close are{" "}
          <strong>dropped</strong> — compare emitted totals to hindsight ground truth.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="stream-analytics-idx"
              label="Ingest progress"
              min={0}
              max={STREAM_MAX}
              value={streamIdx}
              valueText={`${ingestProgressPct(streamIdx).toFixed(0)}% · ${snap.processed.length} events`}
              onChange={setStreamIdx}
            />
            <RangeControl
              id="stream-analytics-lateness"
              label="Allowed lateness Δ"
              min={0}
              max={LATENESS_MAX}
              value={allowedLateness}
              valueText={`${allowedLateness} event-time units`}
              onChange={setAllowedLateness}
            />
            <RangeControl
              id="stream-analytics-window"
              label="Window width"
              min={5}
              max={15}
              value={windowSize}
              valueText={formatWindowLabel(0, windowSize)}
              onChange={setWindowSize}
            />
            <ScenarioPresets
              aria-label="Streaming scenario presets"
              presets={[
                { id: "tunnel", label: "Tunnel late (wide Δ)", onSelect: applyTunnelLate },
                { id: "tight", label: "Tight watermark", onSelect: applyTightWatermark },
                { id: "pre", label: "Before window close", onSelect: () => { setIsPlaying(false); applyPreClose(); } },
              ]}
            />
            <button
              type="button"
              className="lab__btn"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause streaming analytics playback" : "Play streaming analytics playback"}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
          </div>

          <p className="lab__hint">Event-time timeline (dots = processed events; vertical line = watermark):</p>
          <div className="stream-analytics-lab__timeline-wrap">
            <div
              className={`stream-analytics-lab__timeline ${reducedMotion ? "stream-analytics-lab__timeline--static" : ""}`}
              role="img"
              aria-label={`Event-time timeline with watermark at ${snap.watermark}`}
            >
              <div className="stream-analytics-lab__windows">
                {snap.windows.map((w) => {
                  const miss =
                    w.status === "closed" && w.emittedSum !== null && w.emittedSum !== w.exactSum;
                  return (
                    <div
                      key={w.start}
                      className={`stream-analytics-lab__window-band stream-analytics-lab__window-band--${w.status}${miss ? " stream-analytics-lab__window-band--warn" : ""}`}
                      style={{ flex: windowSize }}
                    >
                      <span>
                        {formatWindowLabel(w.start, w.end)}
                        {w.status === "closed" ? " ✓" : " …"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="stream-analytics-lab__wm-line" style={{ left: wmLeft }} aria-hidden />
              <span className="stream-analytics-lab__wm-label" style={{ left: wmLeft }}>
                {formatWatermark(snap.watermark)}
              </span>
              <div className="stream-analytics-lab__events">
                {snap.processed.map((ev) => {
                  const delay = ev.ingestTime - ev.eventTime;
                  const dropped = droppedSet.has(ev.id);
                  const cls = dropped
                    ? "stream-analytics-lab__evt--dropped"
                    : delay >= 3
                      ? "stream-analytics-lab__evt--late"
                      : "stream-analytics-lab__evt--ontime";
                  return (
                    <span
                      key={ev.id}
                      className={`stream-analytics-lab__evt ${cls}`}
                      style={{
                        left: pct(ev.eventTime),
                        ["--delay-px" as string]: `${Math.min(24, delay * 4)}px`,
                      }}
                      title={`${ev.id} E=${ev.eventTime} I=${ev.ingestTime} v=${ev.value} (${ev.label})`}
                    />
                  );
                })}
              </div>
              <div className="stream-analytics-lab__axis">Event time →</div>
            </div>
          </div>

          <p className="lab__hint">Recent ingest order (newest right):</p>
          <div className="stream-analytics-lab__tape" role="list" aria-label="Recent events in ingest order">
            {tape.map((ev) => {
              const delay = ev.ingestTime - ev.eventTime;
              return (
                <span
                  key={ev.id}
                  role="listitem"
                  className={`stream-analytics-lab__chip${delay >= 3 ? " stream-analytics-lab__chip--late" : ""}`}
                  title={`event t=${ev.eventTime} ingest t=${ev.ingestTime}`}
                >
                  {ev.id}+{ev.value}
                </span>
              );
            })}
          </div>

          <div className="stream-analytics-lab__windows-grid">
            {snap.windows.map((w) => {
              const miss = w.status === "closed" && w.emittedSum !== null && w.emittedSum !== w.exactSum;
              return (
                <article
                  key={w.start}
                  className={`stream-analytics-lab__win-card${miss ? " stream-analytics-lab__win-card--closed-miss" : ""}`}
                >
                  <h4>{formatWindowLabel(w.start, w.end)}</h4>
                  <div className="stream-analytics-lab__row">
                    <span>Partial (open)</span>
                    <span>{w.partialSum}</span>
                  </div>
                  <div className="stream-analytics-lab__row">
                    <span>Emitted</span>
                    <span>{w.emittedSum ?? "—"}</span>
                  </div>
                  <div className="stream-analytics-lab__row">
                    <span>Exact (hindsight)</span>
                    <span>{w.exactSum}</span>
                  </div>
                  {w.lateDropped > 0 && (
                    <div className="stream-analytics-lab__row">
                      <span>Late dropped</span>
                      <span>{w.lateDropped}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${streamIdx}-${allowedLateness}-${windowSize}`}
        prompt={
          <>
            After the full stream with Δ=<strong>{allowedLateness}</strong>, will the emitted total for
            window <strong>[0, {windowSize})</strong> match the hindsight exact sum, or will tunnel
            events that arrive <strong>after</strong> the watermark closes the window be dropped?
          </>
        }
        storageKey="streaming-analytics"
        options={[
          { id: "match", label: "Yes — the emitted total matches the exact sum (no tunnel events dropped)", isCorrect: !firstMiss },
          { id: "dropped", label: "No — some tunnel events arrived after watermark close and were dropped", isCorrect: firstMiss },
        ]}
        revealLabel="Compare emitted vs exact"
      >
        <ComparePanel
          leftLabel="Engine (watermark close)"
          rightLabel="Ground truth (all event times)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Watermark W = max(event time seen) − Δ. Wider Δ waits longer before closing (more complete,
          higher latency). Tighter Δ emits faster but drops more late tunnel traffic — README bound{" "}
          P(delay &gt; Δ) &lt; ε.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {snap.processed.length} events ingested · watermark {snap.watermark} · {snap.totalLateDropped}{" "}
        late dropped ({snap.totalLateValue} value lost).
      </p>
    </LabShell>
  );
}
