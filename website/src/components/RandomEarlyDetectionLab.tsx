import { useMemo, useState } from "react";
import {
  baseDropProbability,
  formatFill,
  formatPb,
  formatPercent,
  redZone,
} from "../lib/red-math";
import {
  BURST_ARRIVAL,
  CALM_LINK_PRESET,
  GENTLE_ARRIVAL,
  RED_GENTLE_PRESET,
  SATURATE_ARRIVAL,
  TAIL_DROP_CLIFF_PRESET,
  compareModes,
  sampleDropCurves,
  simulateRouter,
  type RedConfig,
  type RouterMode,
} from "../lib/red-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./RandomEarlyDetectionLab.css";

const PACKET_COUNT = 120;

function curvePath(
  samples: { fill: number; redPb: number; tailP: number }[],
  key: "redPb" | "tailP"
): string {
  if (samples.length === 0) return "";
  const pts = samples.map((s, i) => {
    const x = (i / (samples.length - 1)) * 100;
    const y = 100 - s[key] * 100;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  });
  return pts.join(" ");
}

export default function RandomEarlyDetectionLab() {
  const [minThPct, setMinThPct] = useState(20);
  const [maxThPct, setMaxThPct] = useState(80);
  const [pMaxPct, setPMaxPct] = useState(10);
  const [wq, setWq] = useState(0.008);
  const [avgFillPct, setAvgFillPct] = useState(55);
  const [arrivalBurst, setArrivalBurst] = useState(BURST_ARRIVAL);
  const [mode, setMode] = useState<RouterMode>("red");

  const config: RedConfig = useMemo(
    () => ({
      capacity: 50,
      minTh: minThPct / 100,
      maxTh: maxThPct / 100,
      pMax: pMaxPct / 100,
      wq,
    }),
    [minThPct, maxThPct, pMaxPct, wq]
  );

  const avgFill = avgFillPct / 100;
  const pbAtSlider = baseDropProbability(
    avgFill * config.capacity,
    config.capacity,
    config.minTh,
    config.maxTh,
    config.pMax
  );
  const zone = redZone(avgFill, config.minTh, config.maxTh);

  const curves = useMemo(() => sampleDropCurves(config), [config]);
  const sim = useMemo(
    () => simulateRouter(mode, config, PACKET_COUNT, arrivalBurst),
    [mode, config, arrivalBurst]
  );
  const comparison = useMemo(
    () => compareModes(config, PACKET_COUNT, arrivalBurst),
    [config, arrivalBurst]
  );

  const last = sim.steps[sim.steps.length - 1];
  const instantFill = last ? last.instantQ / config.capacity : 0;
  const avgFromSim = last ? last.avgQ / config.capacity : 0;

  const redAvoidsFull =
    comparison.red.hitFull === false && comparison.tail.hitFull === true;
  const redLowerMax =
    comparison.red.maxAvgQ < comparison.tail.maxAvgQ * 0.85;

  const applyCalmLink = () => {
    setMinThPct(Math.round(CALM_LINK_PRESET.minTh * 100));
    setMaxThPct(Math.round(CALM_LINK_PRESET.maxTh * 100));
    setPMaxPct(Math.round(CALM_LINK_PRESET.pMax * 100));
    setWq(CALM_LINK_PRESET.wq);
    setAvgFillPct(25);
    setArrivalBurst(GENTLE_ARRIVAL);
    setMode("red");
  };

  const applyRedGentle = () => {
    setMinThPct(Math.round(RED_GENTLE_PRESET.minTh * 100));
    setMaxThPct(Math.round(RED_GENTLE_PRESET.maxTh * 100));
    setPMaxPct(Math.round(RED_GENTLE_PRESET.pMax * 100));
    setWq(RED_GENTLE_PRESET.wq);
    setAvgFillPct(55);
    setArrivalBurst(BURST_ARRIVAL);
    setMode("red");
  };

  const applyTailDropCliff = () => {
    setMinThPct(Math.round(TAIL_DROP_CLIFF_PRESET.minTh * 100));
    setMaxThPct(Math.round(TAIL_DROP_CLIFF_PRESET.maxTh * 100));
    setPMaxPct(Math.round(TAIL_DROP_CLIFF_PRESET.pMax * 100));
    setWq(TAIL_DROP_CLIFF_PRESET.wq);
    setAvgFillPct(95);
    setArrivalBurst(SATURATE_ARRIVAL);
    setMode("tail-drop");
  };

  const metrics: LabMetric[] = [
    { id: "zone", label: "RED zone (avg fill)", value: zone },
    {
      id: "pb",
      label: "Pb at slider avg",
      value: formatPb(pbAtSlider),
      tone: zone === "prob" ? "default" : zone === "drop_all" ? "warn" : "aha",
    },
    {
      id: "instant",
      label: "Instant fill (sim)",
      value: formatFill(instantFill),
      tone: instantFill >= 1 ? "warn" : "default",
    },
    {
      id: "avg",
      label: "EWMA avg (sim)",
      value: formatFill(avgFromSim),
    },
    {
      id: "drops",
      label: `${mode} drops`,
      value: `${sim.summary.dropped} / ${sim.steps.length} (${formatPercent(sim.summary.dropped / Math.max(1, sim.steps.length))})`,
    },
    {
      id: "max-q",
      label: "Max instant queue",
      value: `${sim.summary.maxInstantQ} / ${config.capacity}`,
      tone: sim.summary.hitFull ? "warn" : "default",
    },
  ];

  if (redAvoidsFull) {
    metrics.push({
      id: "aha",
      label: "Aha — RED avoids full buffer",
      value: `Tail-drop hit capacity; RED max queue ${comparison.red.maxInstantQ}.`,
      tone: "aha",
    });
  } else if (redLowerMax && mode === "red") {
    metrics.push({
      id: "aha2",
      label: "Aha — lower EWMA",
      value: `RED avg queue ${comparison.red.maxAvgQ.toFixed(0)} vs tail ${comparison.tail.maxAvgQ.toFixed(0)}.`,
      tone: "aha",
    });
  }

  const compareLeft = `RED: ${comparison.red.dropped} drops, max queue ${comparison.red.maxInstantQ}, avg peak ${comparison.red.maxAvgQ.toFixed(0)}`;
  const compareRight = `Tail-drop: ${comparison.tail.dropped} drops, max queue ${comparison.tail.maxInstantQ}${comparison.tail.hitFull ? " (full)" : ""}, avg peak ${comparison.tail.maxAvgQ.toFixed(0)}`;

  const markerX = avgFillPct;

  return (
    <LabShell
      intro={
        <>
          <strong>Random Early Detection</strong> raises drop probability linearly between{" "}
          <em>min</em> and <em>max</em> thresholds on the <strong>EWMA average queue</strong> — before
          the buffer hits 100%. <strong>Tail-drop</strong> accepts until the queue is full, then drops
          everything (global synchronization). The chart compares both policies; the timeline is a
          deterministic packet run with the README’s Pb and Pa formulas.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="red-min"
              label="Min threshold (min_th)"
              min={10}
              max={50}
              value={minThPct}
              valueText={`${minThPct}% fill`}
              onChange={setMinThPct}
            />
            <RangeControl
              id="red-max"
              label="Max threshold (max_th)"
              min={55}
              max={95}
              value={maxThPct}
              valueText={`${maxThPct}% fill`}
              onChange={setMaxThPct}
            />
            <RangeControl
              id="red-pmax"
              label="P_max (base drop cap)"
              min={5}
              max={20}
              value={pMaxPct}
              valueText={`${pMaxPct}%`}
              onChange={setPMaxPct}
            />
            <RangeControl
              id="red-wq"
              label="EWMA weight (w_q)"
              min={1}
              max={20}
              value={Math.round(wq * 1000)}
              valueText={wq.toFixed(3)}
              onChange={(v) => setWq(v / 1000)}
            />
            <RangeControl
              id="red-fill"
              label="Avg queue fill (chart marker)"
              min={0}
              max={100}
              value={avgFillPct}
              valueText={`${avgFillPct}%`}
              onChange={setAvgFillPct}
            />
            <RangeControl
              id="red-arrival"
              label="Arrival burst (sim)"
              min={1}
              max={6}
              step={0.1}
              value={Math.round(arrivalBurst * 10)}
              valueText={arrivalBurst.toFixed(1)}
              onChange={(v) => setArrivalBurst(v / 10)}
            />
            <ScenarioPresets
              aria-label="RED scenario presets"
              presets={[
                { id: "calm", label: "Calm link", onSelect: applyCalmLink },
                { id: "gentle", label: "RED gentle", onSelect: applyRedGentle },
                { id: "cliff", label: "Tail-drop cliff", onSelect: applyTailDropCliff },
              ]}
            />
          </div>

          <div className="lab__row" role="group" aria-label="Router policy for packet timeline">
            <button
              type="button"
              className={`lab__btn ${mode === "red" ? "" : "lab__btn--ghost"}`}
              aria-pressed={mode === "red"}
              onClick={() => setMode("red")}
            >
              RED
            </button>
            <button
              type="button"
              className={`lab__btn ${mode === "tail-drop" ? "" : "lab__btn--ghost"}`}
              aria-pressed={mode === "tail-drop"}
              onClick={() => setMode("tail-drop")}
            >
              Tail-drop
            </button>
          </div>

          <div className="red-lab__curves">
            <div
              className="red-lab__chart"
              role="img"
              aria-label={`Drop probability vs queue fill: RED Pb up to ${formatPercent(config.pMax)} between ${minThPct}% and ${maxThPct}%; tail-drop at 100% only`}
            >
              <div className="red-lab__chart-inner">
                <div className="red-lab__curve" aria-hidden>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d={curvePath(curves, "tailP")}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d={curvePath(curves, "redPb")}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div className="red-lab__marker" style={{ left: `${markerX}%` }} />
              </div>
            </div>
            <div className="red-lab__legend">
              <div className="red-lab__legend-item">
                <span className="red-lab__swatch red-lab__swatch--red" />
                RED Pb
              </div>
              <div className="red-lab__legend-item">
                <span className="red-lab__swatch red-lab__swatch--tail" />
                Tail-drop
              </div>
              <span>Marker = slider avg fill</span>
            </div>
          </div>

          <p className="lab__hint">
            Blue ramp: probabilistic drops between min_th and max_th. Red step: drops only at 100%
            fill. Marker shows Pb = {formatPb(pbAtSlider)} at {avgFillPct}% avg fill.
          </p>

          <div
            className="red-lab__buffer"
            role="meter"
            aria-valuenow={Math.round(instantFill * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Simulated queue fill"
          >
            <div
              className={`red-lab__buffer-fill ${instantFill >= config.maxTh ? "red-lab__buffer-fill--warn" : ""}`}
              style={{ width: `${Math.min(100, instantFill * 100)}%` }}
            />
          </div>

          <div
            className="red-lab__timeline"
            role="img"
            aria-label={`Packet timeline: ${sim.summary.accepted} accepted, ${sim.summary.dropped} dropped`}
          >
            {sim.steps.slice(-80).map((s) => (
              <div
                key={s.index}
                className={`red-lab__pkt ${s.accepted ? "red-lab__pkt--ok" : "red-lab__pkt--drop"}`}
                style={{
                  height: `${Math.max(8, (s.instantQ / config.capacity) * 100)}%`,
                }}
                title={`q=${s.instantQ} avg=${s.avgQ.toFixed(1)} ${s.accepted ? "accept" : "drop"}`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Bar height ≈ instant queue after each packet (last 80). Green = accepted, red = dropped.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${minThPct}-${maxThPct}-${arrivalBurst}-${pMaxPct}`}
        prompt={
          <>
            With min_th <strong>{minThPct}%</strong>, max_th <strong>{maxThPct}%</strong>, and burst
            arrival <strong>{arrivalBurst.toFixed(1)}</strong> over <strong>{PACKET_COUNT}</strong>{" "}
            packets, will <strong>RED</strong> keep the buffer below full while{" "}
            <strong>tail-drop</strong> hits 100% capacity?
          </>
        }
        storageKey="random-early-detection"
        options={[
          { id: "yes", label: "Yes — RED avoids full buffer while tail-drop saturates", isCorrect: redAvoidsFull },
          { id: "no", label: "No — either both saturate or neither does", isCorrect: !redAvoidsFull },
        ]}
        revealLabel="Compare RED vs tail-drop"
      >
        <ComparePanel
          leftLabel="RED"
          rightLabel="Tail-drop"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          RED spreads drops when avg ∈ (min_th, max_th) using Pb and count-adjusted Pa — tail-drop
          defers all drops until the queue is full, which synchronizes TCP backoff.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {mode === "red" ? "RED" : "Tail-drop"} at {arrivalBurst.toFixed(1)} burst: instant fill{" "}
        {formatFill(instantFill)}, EWMA avg {formatFill(avgFromSim)}, zone {zone}. Reveal above for
        side-by-side drop counts.
      </p>
    </LabShell>
  );
}
