import { useMemo, useState } from "react";
import { hllStandardError } from "../lib/hll-math";
import { HyperLogLog, exactDistinct } from "../lib/hll-sim";
import { distinctKeys, shuffleStream } from "../lib/sketches";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./HyperLogLogLab.css";

function buildStream(n: number): { key: string }[] {
  const keys = Array.from({ length: n }, (_, i) => `user_${i % Math.ceil(n * 0.7)}`);
  return shuffleStream(keys.map((key) => ({ key })));
}

export default function HyperLogLogLab() {
  const [b, setB] = useState(8);
  const [streamSize, setStreamSize] = useState(500);

  const stream = useMemo(() => buildStream(streamSize), [streamSize]);
  const hll = useMemo(() => {
    const h = new HyperLogLog(b);
    h.ingest(stream);
    return h;
  }, [b, stream]);

  const exact = exactDistinct(stream);
  const estimate = hll.count();
  const errPct = exact > 0 ? (Math.abs(exact - estimate) / exact) * 100 : 0;
  const stdErr = hllStandardError(b) * 100;

  const metrics: LabMetric[] = [
    { id: "b", label: "Register bits (b)", value: String(b) },
    { id: "m", label: "Buckets (m = 2^b)", value: String(hll.m) },
    { id: "exact", label: "Exact distinct", value: String(exact) },
    { id: "est", label: "HLL estimate", value: String(estimate) },
    {
      id: "err",
      label: "Error",
      value: `${errPct.toFixed(1)}%`,
      tone: errPct > stdErr * 2 ? "warn" : "default",
    },
    { id: "stderr", label: "Expected σ", value: `±${stdErr.toFixed(1)}%` },
  ];

  const maxReg = Math.max(...hll.registers, 1);

  return (
    <LabShell
      intro={
        <>
          HyperLogLog tracks the longest run of leading zeros per bucket. Harmonic mean of registers
          estimates cardinality — same SHA-256 recipe as <code>hyperloglog.py</code>.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="hll-b"
            label="Precision (b bits)"
            min={4}
            max={12}
            value={b}
            valueText={`${b} bits, ${1 << b} buckets`}
            onChange={setB}
          />
          <RangeControl
            id="hll-stream"
            label="Stream size"
            min={50}
            max={2000}
            step={50}
            value={streamSize}
            valueText={`${streamSize} events, ${exact} distinct keys`}
            onChange={setStreamSize}
          />
          <div
            className="hll-lab__chart"
            role="img"
            aria-label={`HLL register chart with ${hll.m} buckets`}
          >
            {hll.registers.map((val, i) => (
              <div
                key={i}
                className="hll-lab__bar"
                style={{ height: `${(val / maxReg) * 100}%` }}
                title={`bucket ${i}: ${val}`}
              />
            ))}
          </div>
          <p className="lab__hint">
            Distinct keys in stream: {distinctKeys(stream).slice(0, 5).join(", ")}
            {distinctKeys(stream).length > 5 ? "…" : ""}
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <div className="lab__compare">
        <div>
          <strong>HLL estimate</strong>
          {estimate}
        </div>
        <div>
          <strong>Exact distinct count</strong>
          {exact}
        </div>
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        {hll.m} registers, {exact} unique keys. Estimate {estimate} (error {errPct.toFixed(1)}%).
      </p>
    </LabShell>
  );
}
