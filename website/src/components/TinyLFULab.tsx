import { useMemo, useState } from "react";
import { DEMO_TRACE, TinyLFUCache } from "../lib/tinylfu-sim";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./TinyLFULab.css";

export default function TinyLFULab() {
  const [capacity, setCapacity] = useState(8);
  const [step, setStep] = useState(DEMO_TRACE.length - 1);
  const [useAdmission, setUseAdmission] = useState(true);

  const replay = useMemo(() => {
    const withAdmit = new TinyLFUCache(capacity);
    const without = new TinyLFUCache(capacity);
    const trace = DEMO_TRACE.slice(0, step + 1);
    for (const key of trace) {
      withAdmit.access(key, true);
      without.access(key, false);
    }
    return { withAdmit, without, trace };
  }, [capacity, step, useAdmission]);

  const cache = useAdmission ? replay.withAdmit : replay.without;
  const hits = replay.trace.filter((k) => cache.window.has(k)).length;

  const metrics: LabMetric[] = [
    { id: "cap", label: "Cache capacity", value: String(capacity) },
    { id: "step", label: "Trace position", value: `${step + 1}/${DEMO_TRACE.length}` },
    { id: "admitted", label: "Admitted keys", value: String(cache.window.size) },
    { id: "rejected", label: "Rejected (TinyLFU)", value: String(cache.rejected.length) },
  ];

  return (
    <LabShell
      intro={
        <>
          TinyLFU uses a Count-Min Sketch to estimate frequency before admitting a new key. Compare
          admission on vs off on the same access trace.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="tlfu-cap"
            label="Cache capacity"
            min={4}
            max={16}
            value={capacity}
            valueText={`${capacity} slots`}
            onChange={setCapacity}
          />
          <RangeControl
            id="tlfu-step"
            label="Access trace step"
            min={0}
            max={DEMO_TRACE.length - 1}
            value={step}
            valueText={`${step + 1} of ${DEMO_TRACE.length} accesses`}
            onChange={setStep}
          />
          <div className="lab__row">
            <button
              type="button"
              className={`lab__btn ${useAdmission ? "" : "lab__btn--ghost"}`}
              onClick={() => setUseAdmission(true)}
            >
              TinyLFU on
            </button>
            <button
              type="button"
              className={`lab__btn ${!useAdmission ? "" : "lab__btn--ghost"}`}
              onClick={() => setUseAdmission(false)}
            >
              LRU only
            </button>
          </div>
          <div className="tlfu-lab__cache" role="list" aria-label="Cache contents">
            {[...cache.window.keys()].map((k) => (
              <span key={k} className="tlfu-lab__key" role="listitem">
                {k} (f={cache.cms.getCount(k)})
              </span>
            ))}
          </div>
          <p className="lab__hint">Current key: {DEMO_TRACE[step]}</p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <div className="lab__compare">
        <div>
          <strong>With TinyLFU</strong>
          {replay.withAdmit.rejected.length} rejected
        </div>
        <div>
          <strong>LRU only</strong>
          {replay.without.rejected.length} rejected
        </div>
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        {useAdmission ? "TinyLFU admission" : "LRU only"}: {cache.window.size}/{capacity} slots
        filled after {step + 1} accesses.
      </p>
    </LabShell>
  );
}
