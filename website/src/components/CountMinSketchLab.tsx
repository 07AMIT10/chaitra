import { useMemo, useState } from "react";
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
  LabShell,
  MetricsAside,
  RangeControl,
  type LabMetric,
} from "./lab";
import "./CountMinSketchLab.css";

const STREAM = shuffleStream([...DEMO_FRUIT_STREAM, ...DEMO_NOISE_KEYS.map((k) => ({ key: k }))]);
const QUERY_KEYS = ["apple", "banana", "orange", "grape"];

export default function CountMinSketchLab() {
  const [streamIdx, setStreamIdx] = useState(STREAM.length - 1);
  const [epsilonPct, setEpsilonPct] = useState(1);
  const [queryKey, setQueryKey] = useState("apple");

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
              max={STREAM.length - 1}
              value={streamIdx}
              valueText={`${streamIdx + 1} / ${STREAM.length}`}
              onChange={setStreamIdx}
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
      <div className="lab__compare">
        <div>
          <strong>CMS estimate</strong>
          {estimate} for &quot;{queryKey}&quot;
        </div>
        <div>
          <strong>Ground truth</strong>
          {actual} in stream prefix
        </div>
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Processed {prefix.length} events into a {depth}×{width} matrix. Query &quot;{queryKey}&quot;:
        estimate {estimate}, actual {actual}.
      </p>
    </LabShell>
  );
}
