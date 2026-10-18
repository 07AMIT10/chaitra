import { useMemo, useState } from "react";
import "../../styles/algorithms.css";

type Props = {
  sample: () => number;
  trials?: number;
  bins?: number;
  bound?: (x: number) => number;
  xLabel?: string;
  yLabel?: string;
  caption?: string;
};

const W = 640;
const H = 260;

/** Standard-normal sampler. Used when `sample` cannot cross the island boundary. */
function defaultSample(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Standard-normal density. Default companion to defaultSample. */
function defaultBound(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Empirical histogram against a closed-form curve. Sampling only happens inside
 * the click handler, so the component is SSR-safe.
 */
export default function MonteCarloBound({
  sample,
  trials = 2000,
  bins = 30,
  bound,
  xLabel = "value",
  yLabel = "density",
  caption,
}: Props) {
  const [results, setResults] = useState<number[] | null>(null);

  const boundFn = typeof bound === "function" ? bound : defaultBound;

  const stats = useMemo(() => {
    if (!results || results.length === 0) return null;
    const N = results.length;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of results) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const mean = sum / N;
    let sq = 0;
    for (const v of results) sq += (v - mean) * (v - mean);
    const sd = Math.sqrt(sq / N);

    let lo = min;
    let hi = max;
    if (hi - lo < 1e-9) {
      lo -= 0.5;
      hi += 0.5;
    }
    const nb = Math.max(1, Math.min(200, Math.round(bins)));
    const bw = (hi - lo) / nb;
    const counts = new Array(nb).fill(0);
    for (const v of results) {
      let idx = Math.floor((v - lo) / bw);
      if (idx < 0) idx = 0;
      if (idx >= nb) idx = nb - 1;
      counts[idx] += 1;
    }
    const densities = counts.map((c) => c / (N * bw));

    const steps = 121;
    const curve: { x: number; y: number }[] = [];
    for (let s = 0; s < steps; s++) {
      const x = lo + ((hi - lo) * s) / (steps - 1);
      const y = boundFn(x);
      curve.push({ x, y: Number.isFinite(y) ? y : 0 });
    }
    const maxBound = curve.reduce((m, p) => Math.max(m, p.y), 0);
    const maxDensity = densities.reduce((m, d) => Math.max(m, d), 0);
    const yMax = Math.max(maxDensity, maxBound) * 1.15 || 1;

    return { N, mean, sd, min, max, lo, hi, bw, counts, densities, curve, yMax };
  }, [results, bins, boundFn]);

  const run = () => {
    const fn = typeof sample === "function" ? sample : defaultSample;
    const n = Math.max(1, Math.round(trials));
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = fn();
      if (Number.isFinite(v)) out.push(v);
    }
    setResults(out);
  };

  return (
    <div className="alg-mc">
      <div className="alg-mc__controls">
        <button type="button" className="alg-btn alg-btn--on" onClick={run}>
          Run {Math.max(1, Math.round(trials))} trials
        </button>
        <span className="alg-muted" style={{ fontSize: "0.8rem" }}>
          {bins} bins
        </span>
      </div>

      {!stats ? (
        <p className="alg-mc__empty">
          No samples yet — press “Run {Math.max(1, Math.round(trials))} trials”.
        </p>
      ) : (
        <>
          <svg
            className="alg-mc__svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`histogram of ${stats.N} samples with ${yLabel} curve`}
          >
            {(() => {
              const m = { l: 48, r: 14, t: 14, b: 34 };
              const pw = W - m.l - m.r;
              const ph = H - m.t - m.b;
              const sxr = (x: number) => m.l + ((x - stats.lo) / (stats.hi - stats.lo || 1)) * pw;
              const syr = (y: number) => m.t + (1 - y / stats.yMax) * ph;
              const bwPx = (pw / stats.densities.length) * 0.86;
              const off = (pw / stats.densities.length - bwPx) / 2;

              return (
                <g>
                  <line className="alg-mc__axis" x1={m.l} x2={m.l} y1={m.t} y2={m.t + ph} />
                  <line className="alg-mc__axis" x1={m.l} x2={m.l + pw} y1={m.t + ph} y2={m.t + ph} />

                  {stats.densities.map((d, i) => {
                    const x = m.l + (pw * i) / stats.densities.length + off;
                    const y = syr(d);
                    const h = Math.max(0, m.t + ph - y);
                    return <rect key={i} className="alg-mc__bar" x={x} y={y} width={bwPx} height={h} />;
                  })}

                  <path
                    className="alg-mc__bound"
                    d={stats.curve
                      .map((p, i) => `${i === 0 ? "M" : "L"} ${sxr(p.x).toFixed(2)} ${syr(p.y).toFixed(2)}`)
                      .join(" ")}
                  />

                  {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                    const x = stats.lo + (stats.hi - stats.lo) * f;
                    return (
                      <text
                        key={f}
                        className="alg-mc__tick"
                        x={sxr(x)}
                        y={m.t + ph + 14}
                        textAnchor="middle"
                      >
                        {Number(x.toPrecision(3))}
                      </text>
                    );
                  })}
                  <text className="alg-mc__tick" x={m.l - 6} y={m.t + 4} textAnchor="end">
                    {stats.yMax.toPrecision(2)}
                  </text>
                  <text className="alg-mc__tick" x={m.l - 6} y={m.t + ph} textAnchor="end">
                    0
                  </text>

                  <text className="alg-mc__tick" x={m.l + pw / 2} y={H - 4} textAnchor="middle">
                    {xLabel}
                  </text>
                  <text className="alg-mc__tick" x={12} y={m.t + ph / 2} textAnchor="middle" transform={`rotate(-90 12 ${m.t + ph / 2})`}>
                    {yLabel}
                  </text>
                </g>
              );
            })()}
          </svg>

          <div className="alg-mc__stats">
            <span>
              samples <b>{stats.N}</b>
            </span>
            <span>
              mean <b>{stats.mean.toFixed(4)}</b>
            </span>
            <span>
              sd <b>{stats.sd.toFixed(4)}</b>
            </span>
            <span>
              min <b>{stats.min.toFixed(3)}</b>
            </span>
            <span>
              max <b>{stats.max.toFixed(3)}</b>
            </span>
          </div>
          <p className="alg-caption">
            Bars are empirical density <span className="alg-mono">count / (N · binWidth)</span>; the curve is the
            bound <span className="alg-mono">{yLabel}(x)</span>.
          </p>
        </>
      )}

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
