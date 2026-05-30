import { useMemo, useState } from "react";
import {
  diskReadSavingsPercent,
  expectedAbsentLookupCost,
  falsePositiveFromBitsPerItem,
  formatBitsPerItem,
  formatHitRatio,
  formatMicroseconds,
  formatPercent,
} from "../lib/approx-cache-math";
import {
  CACHE_LOOSE_CMS_PRESET,
  CACHE_SCAN_TRACE,
  CACHE_TIGHT_CMS_PRESET,
  compareAdmissionModes,
  LSM_SWEET_SPOT_PRESET,
  LSM_WASTED_FP_PRESET,
  simulateAbsentLsmLookup,
} from "../lib/approx-cache-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./ApproximateMemoryCacheLab.css";

const RAM_US = 1;
const DISK_US = 10_000;

function sstOutcome(
  tableIndex: number,
  bloomFpr: number
): { skipped: boolean; label: string } {
  const seed = (tableIndex * 17 + 3) % 100;
  const threshold = bloomFpr * 100;
  if (seed >= threshold) {
    return { skipped: true, label: "Bloom: definitely no — skip disk" };
  }
  return {
    skipped: false,
    label: `Bloom: probably yes — disk read (false positive ~${formatPercent(bloomFpr)})`,
  };
}

export default function ApproximateMemoryCacheLab() {
  const [bitsPerItem, setBitsPerItem] = useState(10);
  const [sstCount, setSstCount] = useState(8);
  const [cmsEpsilonPct, setCmsEpsilonPct] = useState(2);
  const [capacity, setCapacity] = useState(8);

  const cmsEpsilon = cmsEpsilonPct / 100;
  const bloomFpr = falsePositiveFromBitsPerItem(bitsPerItem);

  const lsm = useMemo(
    () => simulateAbsentLsmLookup(sstCount, bitsPerItem, RAM_US, DISK_US),
    [sstCount, bitsPerItem]
  );

  const admission = useMemo(
    () => compareAdmissionModes(CACHE_SCAN_TRACE, capacity, cmsEpsilon),
    [capacity, cmsEpsilon]
  );

  const perTableCost = expectedAbsentLookupCost(RAM_US, DISK_US, bloomFpr);
  const sketchWins = admission.sketch.hits >= admission.exact.hits;
  const sketchLoses = admission.sketch.hits < admission.exact.hits;
  const lsmSavingsStrong = lsm.savingsPct >= 85 && bloomFpr <= 0.02;

  const sstRows = useMemo(() => {
    return Array.from({ length: sstCount }, (_, i) => {
      const outcome = sstOutcome(i, bloomFpr);
      return { index: sstCount - i, ...outcome };
    });
  }, [sstCount, bloomFpr]);

  const applyLsmSweetSpot = () => {
    setSstCount(LSM_SWEET_SPOT_PRESET.sstCount);
    setBitsPerItem(LSM_SWEET_SPOT_PRESET.bitsPerItem);
    setCmsEpsilonPct(Math.round(LSM_SWEET_SPOT_PRESET.cmsEpsilon * 100));
    setCapacity(LSM_SWEET_SPOT_PRESET.capacity);
  };

  const applyWastedFp = () => {
    setSstCount(LSM_WASTED_FP_PRESET.sstCount);
    setBitsPerItem(LSM_WASTED_FP_PRESET.bitsPerItem);
    setCmsEpsilonPct(Math.round(LSM_WASTED_FP_PRESET.cmsEpsilon * 100));
    setCapacity(LSM_WASTED_FP_PRESET.capacity);
  };

  const applyTightCms = () => {
    setSstCount(CACHE_TIGHT_CMS_PRESET.sstCount);
    setBitsPerItem(CACHE_TIGHT_CMS_PRESET.bitsPerItem);
    setCmsEpsilonPct(Math.round(CACHE_TIGHT_CMS_PRESET.cmsEpsilon * 100));
    setCapacity(CACHE_TIGHT_CMS_PRESET.capacity);
  };

  const applyLooseCms = () => {
    setSstCount(CACHE_LOOSE_CMS_PRESET.sstCount);
    setBitsPerItem(CACHE_LOOSE_CMS_PRESET.bitsPerItem);
    setCmsEpsilonPct(Math.round(CACHE_LOOSE_CMS_PRESET.cmsEpsilon * 100));
    setCapacity(CACHE_LOOSE_CMS_PRESET.capacity);
  };

  const metrics: LabMetric[] = [
    {
      id: "bits",
      label: "Bloom bits / item",
      value: formatBitsPerItem(bitsPerItem),
    },
    {
      id: "fpr",
      label: "Bloom FP rate P",
      value: formatPercent(bloomFpr),
      tone: bloomFpr > 0.05 ? "warn" : "default",
    },
    {
      id: "lsm-cost",
      label: "Absent-key cost (Bloom)",
      value: formatMicroseconds(lsm.bloomCost),
      tone: lsmSavingsStrong ? "aha" : "default",
    },
    {
      id: "savings",
      label: "vs read-all-disk",
      value: `${lsm.savingsPct.toFixed(0)}% cheaper`,
    },
    {
      id: "cms",
      label: "CMS ε",
      value: cmsEpsilon.toFixed(2),
    },
    {
      id: "hit-exact",
      label: "Hits (exact freq)",
      value: formatHitRatio(admission.exact.hits, admission.exact.accesses),
    },
    {
      id: "hit-sketch",
      label: "Hits (CMS sketch)",
      value: formatHitRatio(admission.sketch.hits, admission.sketch.accesses),
      tone: sketchLoses ? "warn" : sketchWins ? "default" : "default",
    },
  ];

  if (sketchLoses) {
    metrics.push({
      id: "aha-sketch",
      label: "Aha — sketch tax",
      value: `CMS lost ${admission.exact.hits - admission.sketch.hits} hits vs oracle (${admission.sketch.rejected} bad rejects).`,
      tone: "warn",
    });
  } else if (lsmSavingsStrong) {
    metrics.push({
      id: "aha-lsm",
      label: "Aha — Bloom in RAM",
      value: `${formatBitsPerItem(bitsPerItem)} → ${diskReadSavingsPercent(bloomFpr).toFixed(0)}% disk reads skipped on absent keys.`,
      tone: "aha",
    });
  }

  const compareLeft = `Exact frequency: ${formatHitRatio(admission.exact.hits, admission.exact.accesses)} (${admission.exact.hits}/${admission.exact.accesses}, ${admission.exact.rejected} rejects)`;
  const compareRight = `CMS ε=${cmsEpsilon}: ${formatHitRatio(admission.sketch.hits, admission.sketch.accesses)} (${admission.sketch.hits}/${admission.sketch.accesses}, ${admission.sketch.rejected} rejects)`;

  const naiveH = 100;
  const bloomH =
    lsm.naiveCost > 0 ? Math.min(100, (lsm.bloomCost / lsm.naiveCost) * 100) : 0;
  const exactH = admission.exactRatio * 100;
  const sketchH = admission.sketchRatio * 100;

  return (
    <LabShell
      intro={
        <>
          Approximate caches trade <strong>exact metadata</strong> for compact sketches. Tune{" "}
          <strong>Bloom bits per item</strong> (LSM absent-key probes: E[Cost] = R<sub>m</sub> + P·R
          <sub>d</sub>) and <strong>CMS ε</strong> (admission frequencies) — then compare oracle
          hit ratio vs sketch-backed admission on the cache-scan trace.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="approx-bits"
              label="Bloom bits per item (m/n)"
              min={4}
              max={16}
              value={bitsPerItem}
              valueText={formatBitsPerItem(bitsPerItem)}
              onChange={setBitsPerItem}
            />
            <RangeControl
              id="approx-sst"
              label="SSTables on disk"
              min={2}
              max={16}
              value={sstCount}
              valueText={`${sstCount} files`}
              onChange={setSstCount}
            />
            <RangeControl
              id="approx-cms"
              label="CMS ε (frequency error)"
              min={1}
              max={15}
              value={cmsEpsilonPct}
              valueText={cmsEpsilon.toFixed(2)}
              onChange={setCmsEpsilonPct}
            />
            <RangeControl
              id="approx-cap"
              label="Cache capacity (admission)"
              min={4}
              max={12}
              value={capacity}
              valueText={`${capacity} slots`}
              onChange={setCapacity}
            />
            <ScenarioPresets
              aria-label="Approximate cache scenario presets"
              presets={[
                { id: "lsm", label: "LSM sweet spot", onSelect: applyLsmSweetSpot },
                { id: "fp", label: "Wasted FP reads", onSelect: applyWastedFp },
                { id: "tight", label: "Tight CMS", onSelect: applyTightCms },
                { id: "loose", label: "Loose CMS", onSelect: applyLooseCms },
              ]}
            />
          </div>

          <h3>LSM absent-key probe</h3>
          <div
            className="approx-lab__lsm"
            role="img"
            aria-label={`${sstCount} SSTables: Bloom filters at ${formatBitsPerItem(bitsPerItem)}, false positive ${formatPercent(bloomFpr)}`}
          >
            {sstRows.map((row) => (
              <div
                key={row.index}
                className={`approx-lab__sst ${row.skipped ? "approx-lab__sst--skip" : "approx-lab__sst--fp"}`}
              >
                <span className="approx-lab__sst-label">SST {row.index}</span>
                <span className="approx-lab__sst-detail">{row.label}</span>
                <span className="approx-lab__sst-cost">
                  {row.skipped ? formatMicroseconds(RAM_US) : formatMicroseconds(RAM_US + DISK_US)}
                </span>
              </div>
            ))}
          </div>

          <div className="approx-lab__cost-compare">
            <div className="approx-lab__cost-box">
              Read every file
              <strong>{formatMicroseconds(lsm.naiveCost)}</strong>
            </div>
            <div className="approx-lab__cost-box">
              Bloom per file
              <strong>{formatMicroseconds(lsm.bloomCost)}</strong>
              <span> ~{perTableCost.toFixed(0)} µs / table</span>
            </div>
          </div>

          <h3>Cache admission hit ratio</h3>
          <div
            className="approx-lab__bars"
            role="img"
            aria-label={`Hit ratio: exact ${formatHitRatio(admission.exact.hits, admission.exact.accesses)}, CMS ${formatHitRatio(admission.sketch.hits, admission.sketch.accesses)}`}
          >
            <div className="approx-lab__bar-col">
              <div className="approx-lab__bar-track">
                <div
                  className="approx-lab__bar-fill approx-lab__bar-fill--exact"
                  style={{ height: `${exactH}%` }}
                />
              </div>
              <span>Exact freq</span>
            </div>
            <div className="approx-lab__bar-col">
              <div className="approx-lab__bar-track">
                <div
                  className="approx-lab__bar-fill approx-lab__bar-fill--sketch"
                  style={{ height: `${sketchH}%` }}
                />
              </div>
              <span>CMS sketch</span>
            </div>
          </div>

          <div className="approx-lab__bars">
            <div className="approx-lab__bar-col">
              <div className="approx-lab__bar-track">
                <div
                  className="approx-lab__bar-fill approx-lab__bar-fill--naive"
                  style={{ height: `${naiveH}%` }}
                />
              </div>
              <span>LSM naive</span>
            </div>
            <div className="approx-lab__bar-col">
              <div className="approx-lab__bar-track">
                <div
                  className="approx-lab__bar-fill approx-lab__bar-fill--bloom"
                  style={{ height: `${bloomH}%` }}
                />
              </div>
              <span>LSM + Bloom</span>
            </div>
          </div>

          <p className="lab__hint">
            Green SST rows: Bloom says “no” — skip disk. Red rows: false positive wastes a read (~
            {formatPercent(bloomFpr)} per table). Cache bars replay the{" "}
            <strong>cache-scan</strong> trace ({CACHE_SCAN_TRACE.length} accesses, capacity{" "}
            {capacity}).
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${bitsPerItem}-${sstCount}-${cmsEpsilonPct}-${capacity}`}
        prompt={
          <>
            With <strong>{formatBitsPerItem(bitsPerItem)}</strong> Bloom filters across{" "}
            <strong>{sstCount}</strong> SSTables and CMS ε=<strong>{cmsEpsilon}</strong>, will{" "}
            <strong>sketch-backed admission</strong> match the <strong>exact-frequency</strong> hit
            ratio on the cache-scan trace?
          </>
        }
        revealLabel="Compare oracle vs sketch"
      >
        <ComparePanel
          leftLabel="Exact frequency (ground truth)"
          rightLabel="CMS approximate admission"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {sketchLoses
            ? `Looser CMS over-estimates frequencies — sketch rejected ${admission.sketch.rejected - admission.exact.rejected} extra keys, costing ${admission.exact.hits - admission.sketch.hits} hits.`
            : admission.deltaHits === 0
              ? "On this trace, sketch admission matched the oracle — try Loose CMS or lower capacity to see frequency error bite."
              : `Sketch matched oracle hits; Bloom still saves ~${lsm.savingsPct.toFixed(0)}% LSM cost on absent keys.`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        P ≈ (0.6185)^{bitsPerItem} = {formatPercent(bloomFpr)}. Expected absent-key cost:{" "}
        {formatMicroseconds(lsm.bloomCost)} vs {formatMicroseconds(lsm.naiveCost)} naive. Cache:{" "}
        exact {formatHitRatio(admission.exact.hits, admission.exact.accesses)}, CMS{" "}
        {formatHitRatio(admission.sketch.hits, admission.sketch.accesses)}.
      </p>
    </LabShell>
  );
}
