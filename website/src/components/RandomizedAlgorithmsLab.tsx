import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  formatPercent,
  formatRa,
  lasVegasExpectedComparisons,
  monteCarloAnyHitSuccess,
} from "../lib/randomized-algorithms-math";
import {
  ADVERSARIAL_PRESET,
  BALANCED_PRESET,
  DEFAULT_K,
  MC_MANY_PROBES_PRESET,
  SORTED_PRESET,
  SHUFFLED_PRESET,
  deterministicQuickselect,
  getArrayPreset,
  groundTruthKth,
  lasVegasQuickselect,
  monteCarloKthGuess,
  type ArrayPresetId,
} from "../lib/randomized-algorithms-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./RandomizedAlgorithmsLab.css";

export default function RandomizedAlgorithmsLab() {
  const [presetId, setPresetId] = useState<ArrayPresetId>("sorted");
  const [k, setK] = useState(DEFAULT_K);
  const [seed, setSeed] = useState(42);
  const [mcProbes, setMcProbes] = useState(4);
  const reducedMotion = usePrefersReducedMotion();

  const preset = useMemo(() => getArrayPreset(presetId), [presetId]);
  const values = preset.values;
  const n = values.length;

  const truth = useMemo(() => groundTruthKth(values, k), [values, k]);
  const lv = useMemo(() => lasVegasQuickselect(values, k, seed), [values, k, seed]);
  const mc = useMemo(() => monteCarloKthGuess(values, k, mcProbes, seed + 17), [values, k, mcProbes, seed]);
  const det = useMemo(() => deterministicQuickselect(values, k), [values, k]);

  const mcTheory = monteCarloAnyHitSuccess(n, mcProbes);
  const lvTheory = lasVegasExpectedComparisons(n);

  const maxCost = Math.max(lv.comparisons, mc.reads, det.comparisons, lvTheory, 1);

  const applyAdversarial = () => {
    setPresetId(ADVERSARIAL_PRESET.presetId);
    setK(ADVERSARIAL_PRESET.k);
    setSeed(ADVERSARIAL_PRESET.seed);
    setMcProbes(ADVERSARIAL_PRESET.mcProbes);
  };

  const applyBalanced = () => {
    setPresetId(BALANCED_PRESET.presetId);
    setK(BALANCED_PRESET.k);
    setSeed(BALANCED_PRESET.seed);
    setMcProbes(BALANCED_PRESET.mcProbes);
  };

  const applyMcMany = () => {
    setPresetId(MC_MANY_PROBES_PRESET.presetId);
    setK(MC_MANY_PROBES_PRESET.k);
    setSeed(MC_MANY_PROBES_PRESET.seed);
    setMcProbes(MC_MANY_PROBES_PRESET.mcProbes);
  };

  const sortedRanks = useMemo(() => {
    const order = [...values]
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v - b.v);
    return new Map(order.map((o, rank) => [o.v, rank + 1]));
  }, [values]);

  const metrics: LabMetric[] = [
    { id: "data", label: "Array", value: preset.label },
    { id: "k", label: "k (order stat)", value: String(k) },
    { id: "truth", label: "Exact k-th", value: String(truth) },
    {
      id: "lv-val",
      label: "Las Vegas answer",
      value: String(lv.value),
      tone: lv.correct ? "aha" : "warn",
    },
    {
      id: "lv-cmp",
      label: "LV comparisons",
      value: formatRa(lv.comparisons),
    },
    {
      id: "mc-val",
      label: "Monte Carlo guess",
      value: String(mc.guess),
      tone: mc.correct ? "aha" : "warn",
    },
    {
      id: "mc-reads",
      label: "MC reads (fixed)",
      value: formatRa(mc.reads),
    },
    {
      id: "det-cmp",
      label: "Det. first-pivot cmp",
      value: formatRa(det.comparisons),
      tone: det.comparisons > lvTheory * 3 ? "warn" : "default",
    },
  ];

  if (lv.correct && det.comparisons > lv.comparisons * 2) {
    metrics.push({
      id: "aha",
      label: "Aha — Las Vegas",
      value: `Same correct ${truth}, but random pivot used ${lv.comparisons} vs ${det.comparisons} comparisons.`,
      tone: "aha",
    });
  }
  if (!mc.correct && mcProbes <= 2) {
    metrics.push({
      id: "mc-warn",
      label: "MC trade-off",
      value: `Wrong guess with only ${mc.reads} reads — theory P(hit)≈${formatPercent(mcTheory)}.`,
      tone: "warn",
    });
  }

  const compareLeft = `Las Vegas: ${lv.value} · ${lv.comparisons} comparisons · always correct`;
  const compareRight = `Monte Carlo: ${mc.guess} · ${mc.reads} fixed reads · ${
    mc.correct ? "correct" : "wrong"
  } (theory P(hit)≈${formatPercent(mcTheory)})`;

  const detBeatsLv = det.comparisons > lv.comparisons;
  const predictKey = `${presetId}-${k}-${seed}-${mcProbes}`;

  return (
    <LabShell
      intro={
        <>
          Same toy problem — find the <strong>k-th smallest</strong> in a 12-element array.{" "}
          <strong>Las Vegas</strong> randomized quickselect is always correct but comparisons vary;{" "}
          <strong>Monte Carlo</strong> uses a fixed number of random probes and may guess wrong. Compare
          both against the <strong>exact order statistic</strong> and a <strong>first-pivot</strong>{" "}
          deterministic baseline on sorted input.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <div className="lab__row" role="group" aria-label="Array preset">
              <button
                type="button"
                className={`lab__btn ${presetId === "sorted" ? "" : "lab__btn--ghost"}`}
                aria-pressed={presetId === "sorted"}
                onClick={() => setPresetId("sorted")}
              >
                {SORTED_PRESET.label}
              </button>
              <button
                type="button"
                className={`lab__btn ${presetId === "shuffled" ? "" : "lab__btn--ghost"}`}
                aria-pressed={presetId === "shuffled"}
                onClick={() => setPresetId("shuffled")}
              >
                {SHUFFLED_PRESET.label}
              </button>
            </div>
            <RangeControl
              id="ra-k"
              label="k (1 = minimum)"
              min={1}
              max={n}
              value={k}
              valueText={`k = ${k}`}
              onChange={setK}
            />
            <RangeControl
              id="ra-seed"
              label="RNG seed (Las Vegas / MC)"
              min={1}
              max={200}
              value={seed}
              valueText={`seed ${seed}`}
              onChange={setSeed}
            />
            <RangeControl
              id="ra-probes"
              label="Monte Carlo probes (fixed reads)"
              min={1}
              max={12}
              value={mcProbes}
              valueText={`${mcProbes} probes`}
              onChange={setMcProbes}
            />
            <ScenarioPresets
              aria-label="Randomized algorithms scenario presets"
              presets={[
                { id: "adv", label: "Adversarial sorted", onSelect: applyAdversarial },
                { id: "bal", label: "Shuffled (balanced)", onSelect: applyBalanced },
                { id: "mc", label: "MC many probes", onSelect: applyMcMany },
              ]}
            />
          </div>

          <p className="ra-lab__legend">
            Highlighted cell = value at rank <strong>{k}</strong> in the sorted array (exact answer{" "}
            <strong>{truth}</strong>).
          </p>
          <div
            className="ra-lab__array"
            role="img"
            aria-label={`Array with k-th smallest value ${truth}`}
          >
            {values.map((v) => {
              const rank = sortedRanks.get(v);
              const isTarget = rank === k;
              return (
                <span
                  key={v}
                  className={`ra-lab__cell${isTarget ? " ra-lab__cell--target" : ""}`}
                  title={rank !== undefined ? `rank ${rank}` : undefined}
                >
                  {v}
                </span>
              );
            })}
          </div>

          <div
            className={`ra-lab__bars${reducedMotion ? " ra-lab__scatter--static" : ""}`}
            role="img"
            aria-label="Comparison cost: Las Vegas comparisons, Monte Carlo fixed reads, deterministic comparisons"
          >
            <div className="ra-lab__bar-col">
              <div className="ra-lab__bar-track">
                <div
                  className="ra-lab__bar ra-lab__bar--lv"
                  style={{ height: `${(lv.comparisons / maxCost) * 100}%` }}
                />
              </div>
              <span>Las Vegas</span>
              <span>{lv.comparisons} cmp</span>
            </div>
            <div className="ra-lab__bar-col">
              <div className="ra-lab__bar-track">
                <div
                  className="ra-lab__bar ra-lab__bar--mc"
                  style={{ height: `${(mc.reads / maxCost) * 100}%` }}
                />
              </div>
              <span>Monte Carlo</span>
              <span>{mc.reads} reads</span>
            </div>
            <div className="ra-lab__bar-col">
              <div className="ra-lab__bar-track">
                <div
                  className="ra-lab__bar ra-lab__bar--det"
                  style={{ height: `${(det.comparisons / maxCost) * 100}%` }}
                />
              </div>
              <span>Det. 1st pivot</span>
              <span>{det.comparisons} cmp</span>
            </div>
          </div>

          <ComparePanel
            leftLabel="Las Vegas (randomized quickselect)"
            rightLabel="Monte Carlo (fixed probes)"
            left={compareLeft}
            right={compareRight}
          />

          <PredictReveal
            key={predictKey}
            prompt={
              <>
                On <strong>{preset.label}</strong> with k={k}, will deterministic first-pivot quickselect
                use <em>more</em> comparisons than Las Vegas? (Expected LV ≈ {formatRa(lvTheory)}.)
              </>
            }
            revealLabel="Reveal comparison counts"
          >
            <p>
              Deterministic: <strong>{det.comparisons}</strong> comparisons · Las Vegas:{" "}
              <strong>{lv.comparisons}</strong> · Exact k-th: <strong>{truth}</strong>.
              {detBeatsLv
                ? " First pivot pays the README’s adversarial Θ(n²) cost on sorted input."
                : " On this draw, random pivot did not beat first-pivot (try another seed or sorted preset)."}
            </p>
          </PredictReveal>

          <p className="lab__status" aria-live="polite">
            Ground truth k-th = {truth}. LV always returns {lv.value}. MC returned {mc.guess} (
            {mc.correct ? "correct" : "incorrect"}) with {mc.reads} reads; theory P(at least one probe
            hits rank k) ≈ {formatPercent(mcTheory)}.
          </p>
        </div>

        <MetricsAside metrics={metrics} />
      </div>
    </LabShell>
  );
}
