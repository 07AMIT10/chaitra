import { useMemo, useState } from "react";
import {
  DEFAULT_CHAIN_CONFIG,
  bloomFpEstimate,
  formatBytes,
  hllSigmaPercent,
  naiveExactMemoryBytes,
  sketchChainMemoryBytes,
} from "../lib/streaming-algo-math";
import {
  DDOS_PRESET,
  EARLY_STREAM_PRESET,
  LONG_TAIL_PRESET,
  QUERY_KEYS,
  ROUTER_TRAFFIC_STREAM,
  keyCategory,
  recentStreamKeys,
  runSketchChain,
} from "../lib/streaming-algo-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./StreamingAlgorithmsLab.css";

const STREAM_MAX = ROUTER_TRAFFIC_STREAM.length - 1;

export default function StreamingAlgorithmsLab() {
  const [streamIdx, setStreamIdx] = useState(STREAM_MAX);
  const [queryKey, setQueryKey] = useState<string>(QUERY_KEYS[0]);

  const snap = useMemo(
    () => runSketchChain(streamIdx, queryKey, DEFAULT_CHAIN_CONFIG),
    [streamIdx, queryKey]
  );

  const sketchBytes = sketchChainMemoryBytes(DEFAULT_CHAIN_CONFIG);
  const naiveBytes = naiveExactMemoryBytes(snap.distinctExact, snap.prefix.length);
  const bloomFp = bloomFpEstimate(DEFAULT_CHAIN_CONFIG, snap.bloomDistinct);
  const hllErrPct =
    snap.distinctExact > 0
      ? (Math.abs(snap.hllEstimate - snap.distinctExact) / snap.distinctExact) * 100
      : 0;
  const hllSigma = hllSigmaPercent(DEFAULT_CHAIN_CONFIG.hllB);
  const cmsOver = snap.cmsEstimate > snap.cmsActual;
  const cmsMatch = snap.cmsEstimate === snap.cmsActual;

  const applyDdos = () => {
    setStreamIdx(DDOS_PRESET.streamIdx);
    setQueryKey(DDOS_PRESET.queryKey);
  };

  const applyEarly = () => {
    setStreamIdx(EARLY_STREAM_PRESET.streamIdx);
    setQueryKey(EARLY_STREAM_PRESET.queryKey);
  };

  const applyLongTail = () => {
    setStreamIdx(LONG_TAIL_PRESET.streamIdx);
    setQueryKey(LONG_TAIL_PRESET.queryKey);
  };

  const tape = recentStreamKeys(snap.prefix);

  const metrics: LabMetric[] = [
    { id: "events", label: "Events processed", value: String(snap.prefix.length) },
    { id: "distinct", label: "Exact distinct IPs", value: String(snap.distinctExact) },
    {
      id: "sketch-mem",
      label: "Sketch RAM (fixed)",
      value: formatBytes(sketchBytes),
      tone: "aha",
    },
    {
      id: "naive-mem",
      label: "Naive map + log (est.)",
      value: formatBytes(naiveBytes),
      tone: naiveBytes > sketchBytes * 4 ? "warn" : "default",
    },
    {
      id: "cms-q",
      label: `CMS "${queryKey}"`,
      value: `${snap.cmsEstimate} est / ${snap.cmsActual} true`,
      tone: cmsOver && snap.cmsActual > 0 ? "warn" : "default",
    },
    {
      id: "hll",
      label: "HLL cardinality",
      value: `${snap.hllEstimate} vs ${snap.distinctExact}`,
    },
    {
      id: "bloom",
      label: "Bloom membership",
      value: snap.bloomPresent ? "maybe present" : "definitely not",
      tone: snap.isBloomFalsePositive ? "warn" : "default",
    },
  ];

  if (cmsOver && snap.cmsActual > 0) {
    metrics.push({
      id: "aha-cms",
      label: "Aha — CMS min bound",
      value: `Over by ${snap.cmsEstimate - snap.cmsActual}; collisions never deflate counts.`,
      tone: "aha",
    });
  }
  if (snap.isBloomFalsePositive) {
    metrics.push({
      id: "aha-bloom",
      label: "Aha — Bloom false positive",
      value: `Key never seen but all ${DEFAULT_CHAIN_CONFIG.bloomK} bits set (est. FP ≈ ${(bloomFp * 100).toFixed(2)}%).`,
      tone: "aha",
    });
  }

  return (
    <LabShell
      intro={
        <>
          One synthetic <strong>router packet stream</strong> updates three fixed-size sketches in lockstep:
          Count-Min for <strong>heavy-hitter counts</strong>, HyperLogLog for <strong>distinct IPs</strong>, and
          Bloom for <strong>seen-before membership</strong>. Same hashing recipes as the standalone sketch labs.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="stream-algo-idx"
              label="Stream position"
              min={0}
              max={STREAM_MAX}
              value={streamIdx}
              valueText={`${streamIdx + 1} / ${ROUTER_TRAFFIC_STREAM.length} packets`}
              onChange={setStreamIdx}
            />
            <ScenarioPresets
              aria-label="Traffic scenario presets"
              presets={[
                { id: "ddos", label: "DDoS heavy hitter", onSelect: applyDdos },
                { id: "early", label: "Early stream", onSelect: applyEarly },
                { id: "tail", label: "Long-tail probe", onSelect: applyLongTail },
              ]}
            />
          </div>

          <p className="lab__hint">Recent packets (newest right):</p>
          <div
            className="stream-algo-lab__tape"
            role="img"
            aria-label={`Last ${tape.length} packets in stream prefix`}
          >
            {tape.map((key, i) => (
              <span
                key={`${i}-${key}`}
                className={`stream-algo-lab__chip stream-algo-lab__chip--${keyCategory(key)}`}
                title={key}
              >
                {key.replace("10.0.0.", "·").replace("noise_", "n")}
              </span>
            ))}
          </div>

          <div className="stream-algo-lab__keys" role="group" aria-label="Query IP">
            {QUERY_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className="stream-algo-lab__key-btn"
                aria-pressed={queryKey === k}
                onClick={() => setQueryKey(k)}
              >
                {k} ({snap.truth.get(k) ?? 0})
              </button>
            ))}
          </div>

          <div className="stream-algo-lab__sketches">
            <section className="stream-algo-lab__sketch" aria-labelledby="sketch-cms">
              <h3 id="sketch-cms">Count-Min Sketch</h3>
              <div
                className={`stream-algo-lab__metric-row${cmsOver && snap.cmsActual > 0 ? " stream-algo-lab__metric-row--warn" : cmsMatch ? " stream-algo-lab__metric-row--match" : ""}`}
              >
                <span>Estimate</span>
                <span>{snap.cmsEstimate}</span>
              </div>
              <div className="stream-algo-lab__metric-row">
                <span>Ground truth</span>
                <span>{snap.cmsActual}</span>
              </div>
              <p className="lab__hint">Frequency / DDoS thresholding</p>
            </section>

            <section className="stream-algo-lab__sketch" aria-labelledby="sketch-hll">
              <h3 id="sketch-hll">HyperLogLog</h3>
              <div className="stream-algo-lab__metric-row">
                <span>Estimate</span>
                <span>{snap.hllEstimate}</span>
              </div>
              <div className="stream-algo-lab__metric-row">
                <span>Exact distinct</span>
                <span>{snap.distinctExact}</span>
              </div>
              <p className="lab__hint">
                Error {hllErrPct.toFixed(1)}% (σ ≈ ±{hllSigma.toFixed(1)}%)
              </p>
            </section>

            <section className="stream-algo-lab__sketch" aria-labelledby="sketch-bloom">
              <h3 id="sketch-bloom">Bloom filter</h3>
              <div
                className={`stream-algo-lab__metric-row${snap.isBloomFalsePositive ? " stream-algo-lab__metric-row--warn" : snap.bloomPresent && snap.exactSeen ? " stream-algo-lab__metric-row--match" : ""}`}
              >
                <span>Sketch says</span>
                <span>{snap.bloomPresent ? "maybe in set" : "not in set"}</span>
              </div>
              <div className="stream-algo-lab__metric-row">
                <span>Exact seen</span>
                <span>{snap.exactSeen ? "yes" : "no"}</span>
              </div>
              <p className="lab__hint">{snap.bloomDistinct} IPs in filter · m={DEFAULT_CHAIN_CONFIG.bloomM}</p>
            </section>
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${queryKey}-${streamIdx}`}
        prompt={
          <>
            For &quot;{queryKey}&quot; after {snap.prefix.length} packets: will the CMS estimate be{" "}
            <strong>≥</strong> the true count, and can Bloom report &quot;maybe present&quot; for a key that
            never appeared?
          </>
        }
        revealLabel="Show sketch vs ground truth"
      >
        <ComparePanel
          leftLabel="Sketch chain"
          rightLabel="Ground truth (prefix)"
          left={`CMS ${snap.cmsEstimate} · HLL ${snap.hllEstimate} distinct · Bloom ${snap.bloomPresent ? "maybe" : "no"}`}
          right={`Count ${snap.cmsActual} · Distinct ${snap.distinctExact} · Seen ${snap.exactSeen ? "yes" : "no"}`}
        />
        <p className="lab__status" role="note">
          CMS never underestimates (min across rows). Bloom has no false negatives for keys inserted into the
          filter; false positives are possible when probing absent keys at fill ≈{" "}
          {((snap.bloomDistinct / DEFAULT_CHAIN_CONFIG.bloomM) * 100).toFixed(0)}%.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {snap.prefix.length} packets · {snap.distinctExact} unique IPs · sketch RAM {formatBytes(sketchBytes)}{" "}
        vs naive ~{formatBytes(naiveBytes)}.
      </p>
    </LabShell>
  );
}
