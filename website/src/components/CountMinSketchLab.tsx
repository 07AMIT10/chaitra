import { useEffect, useMemo, useState } from "react";
import { cmsDimensions, errorBound } from "../lib/cms-math";
import { CountMinSketch } from "../lib/cms-sim";
import {
  DEMO_FRUIT_STREAM,
  DEMO_NOISE_KEYS,
  shuffleStream,
  truthFromStream,
} from "../lib/sketches";
import { CmsHeatmap } from "./lab/CmsHeatmap";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./CountMinSketchLab.css";

const STREAM = shuffleStream([...DEMO_FRUIT_STREAM, ...DEMO_NOISE_KEYS.map((k) => ({ key: k }))]);
const QUERY_KEYS = ["apple", "banana", "orange", "grape"];
const STREAM_MAX = STREAM.length - 1;

export default function CountMinSketchLab() {
  const [streamIdx, setStreamIdx] = useState(STREAM_MAX);
  const [epsilonPct, setEpsilonPct] = useState(1);
  const [queryKey, setQueryKey] = useState("apple");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStreamIdx((prev) => {
        if (prev >= STREAM_MAX) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const epsilon = epsilonPct / 100;
  const { width, depth } = cmsDimensions(epsilon, 0.05);

  const prefix = useMemo(() => STREAM.slice(0, streamIdx + 1), [streamIdx]);
  const truth = useMemo(() => truthFromStream(prefix), [prefix]);

  const sketch = useMemo(() => {
    const cms = new CountMinSketch(epsilon, 0.05);
    cms.ingest(prefix);
    return cms;
  }, [prefix, epsilon]);

  const estimate = sketch.getCount(queryKey);
  const actual = truth.get(queryKey) ?? 0;
  const overestimate = estimate > actual;
  const matches = estimate === actual;

  const applyStartOfStream = () => {
    setStreamIdx(0);
    setEpsilonPct(1);
    setQueryKey("apple");
  };

  const applyHeavyTail = () => {
    setStreamIdx(STREAM_MAX);
    setEpsilonPct(1);
    setQueryKey("apple");
  };

  const applyCollisionHunt = () => {
    setEpsilonPct(10);
    setStreamIdx(STREAM_MAX);
    setQueryKey("apple");
  };

  const metrics: LabMetric[] = [
    { id: "depth", label: "Depth (rows)", value: String(depth) },
    { id: "width", label: "Width (columns)", value: String(width) },
    { id: "stream", label: "Events processed", value: String(prefix.length) },
    {
      id: "query",
      label: `Estimate for "${queryKey}"`,
      value: String(estimate),
      tone: overestimate && actual > 0 ? "warn" : "default",
    },
    { id: "actual", label: "True count", value: String(actual) },
  ];
  if (overestimate && actual > 0) {
    metrics.push({
      id: "aha",
      label: "Aha — collision inflation",
      value: `CMS overestimates by ${estimate - actual} (min-of-rows bound).`,
      tone: "aha",
    });
  }

  const compareLeft =
    estimate === actual
      ? `${estimate} for "${queryKey}" (matches stream prefix)`
      : `${estimate} for "${queryKey}"${overestimate ? " — overestimate" : ""}`;

  const compareRight = `${actual} in stream prefix`;

  return (
    <LabShell
      intro={
        <>
          Count-Min Sketch returns the <strong>minimum</strong> across hash rows — collisions can
          only inflate estimates, never deflate them. Same SHA-256 recipe as{" "}
          <code>count_min_sketch.py</code>.
        </>
      }
    >
      <div className="lab__grid">
        <div className="cms-lab__main">
          <div className="lab__controls-panel">
            <RangeControl
              id="cms-epsilon"
              label="Error margin ε"
              min={1}
              max={10}
              value={epsilonPct}
              valueText={`${epsilonPct}%`}
              onChange={setEpsilonPct}
              hint={errorBound(epsilon)}
            />
            <RangeControl
              id="cms-stream"
              label="Stream position"
              min={0}
              max={STREAM_MAX}
              value={streamIdx}
              valueText={`${streamIdx + 1} / ${STREAM.length}`}
              onChange={(val) => {
                setIsPlaying(false);
                setStreamIdx(val);
              }}
            />
            <div className="lab__media-controls">
              <button
                type="button"
                className="lab__btn lab__btn--ghost"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause Count-Min Sketch stream" : "Play Count-Min Sketch stream"}
                style={{ flex: 1, minHeight: "36px" }}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                type="button"
                className="lab__btn lab__btn--ghost"
                onClick={() => {
                  setIsPlaying(false);
                  setStreamIdx(0);
                }}
                style={{ minHeight: "36px" }}
              >
                ⏮ Reset
              </button>
            </div>
            <ScenarioPresets
              aria-label="Stream scenario presets"
              presets={[
                { id: "start", label: "Start of stream", onSelect: applyStartOfStream },
                { id: "tail", label: "Heavy tail", onSelect: applyHeavyTail },
                {
                  id: "collision",
                  label: "Collision hunt",
                  onSelect: applyCollisionHunt,
                },
              ]}
            />
          </div>
          <CmsHeatmap table={sketch.table} width={width} depth={depth} />
          <div className="cms-lab__chips" role="group" aria-label="Query keys">
            {QUERY_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className="cms-lab__chip"
                aria-pressed={queryKey === k}
                onClick={() => setQueryKey(k)}
              >
                {k} ({truth.get(k) ?? 0})
              </button>
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${queryKey}-${streamIdx}-${epsilonPct}`}
        prompt={
          <>
            Before revealing: for &quot;{queryKey}&quot; after {prefix.length} events, will the CMS
            estimate <strong>overestimate</strong> or <strong>match</strong> the ground truth?
          </>
        }
        storageKey="cms"
        options={[
          { id: "match", label: "Match ground truth", isCorrect: matches },
          { id: "overestimate", label: "Overestimate (due to collision noise)", isCorrect: overestimate },
        ]}
        revealLabel="Show estimate vs truth"
      >
        <ComparePanel
          leftLabel="CMS estimate"
          rightLabel="Ground truth"
          left={compareLeft}
          right={compareRight}
        />
        {matches && actual > 0 && (
          <p className="lab__status" role="note">
            Minimum across rows cancels collision noise for this key — estimate matches the prefix.
          </p>
        )}
        {overestimate && actual > 0 && (
          <p className="lab__status" role="note">
            Shared buckets inflated at least one row; the min is still ≥ the true count.
          </p>
        )}
        {actual === 0 && (
          <p className="lab__status" role="note">
            Key not in prefix — estimate is {estimate} (never below true count).
          </p>
        )}
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        Processed {prefix.length} events into a {depth}×{width} matrix. Query &quot;{queryKey}&quot;:
        estimate {estimate}, actual {actual}.
      </p>
    </LabShell>
  );
}
