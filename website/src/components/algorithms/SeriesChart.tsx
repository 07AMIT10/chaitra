import { useMemo } from "react";
import "../../styles/algorithms.css";

export type SeriesPoint = [number, number];

export type Series = {
  name: string;
  points: SeriesPoint[];
  color?: string;
};

export type Annotation = { x?: number; y?: number; text: string };

type Props = {
  series?: Series[];
  xLabel?: string;
  yLabel?: string;
  logY?: boolean;
  annotations?: Annotation[];
  height?: number;
  /** Optional caption shown above the plot. */
  title?: string;
  /** Compatibility: named policies for a synthetic workload plot (workstream C). */
  policies?: string[];
  workload?: string;
  n?: number;
  ops?: number;
};

const W = 640;
const EPS = 1e-9;

const PALETTE = [
  "var(--alg-accent)",
  "var(--color-accent)",
  "var(--color-drishti)",
  "var(--color-success)",
  "var(--color-error)",
  "#f778ba",
];

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  let step: number;
  if (norm <= 1) step = mag;
  else if (norm <= 2) step = 2 * mag;
  else if (norm <= 2.5) step = 2.5 * mag;
  else if (norm <= 5) step = 5 * mag;
  else step = 10 * mag;
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step * 1e-9 && out.length < 40; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out.length ? out : [min, max];
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e5 || a < 1e-3) return v.toExponential(1);
  return String(Number(v.toPrecision(4)));
}

/** Hand-rolled SVG line chart: axes, ticks, legend, optional log-y, annotations. */
export default function SeriesChart({
  series,
  xLabel,
  yLabel,
  logY = false,
  annotations,
  height = 320,
  title,
  policies,
  workload,
  n,
  ops,
}: Props) {
  const chart = useMemo(() => {
    const clean = (series ?? [])
      .map((s, si) => ({
        name: s.name,
        color: s.color ?? PALETTE[si % PALETTE.length],
        points: (s.points ?? [])
          .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
          .map((p) => [p[0], logY ? Math.log10(Math.max(p[1], EPS)) : p[1]] as SeriesPoint),
      }))
      .filter((s) => s.points.length > 0);

    if (clean.length === 0) return { empty: true as const };

    const xs: number[] = [];
    const ys: number[] = [];
    for (const s of clean) for (const p of s.points) {
      xs.push(p[0]);
      ys.push(p[1]);
    }

    let xMin = Math.min(...xs);
    let xMax = Math.max(...xs);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);

    const padX = (xMax - xMin) * 0.05 || (Math.abs(xMax) || 1) * 0.1;
    const padY = (yMax - yMin) * 0.08 || (Math.abs(yMax) || 1) * 0.1;
    xMin -= padX;
    xMax += padX;
    if (logY) {
      yMin = Math.floor(yMin);
      yMax = Math.ceil(yMax);
      if (yMin === yMax) yMax = yMin + 1;
    } else {
      yMin -= padY;
      yMax += padY;
    }

    const m = { l: 52, r: 14, t: 16, b: 40 };
    const plotW = W - m.l - m.r;
    const plotH = Math.max(80, height - m.t - m.b);

    const sx = (x: number) => m.l + ((x - xMin) / (xMax - xMin || 1)) * plotW;
    const sy = (y: number) => m.t + (1 - (y - yMin) / (yMax - yMin || 1)) * plotH;

    const xTicks = niceTicks(xMin, xMax, 6);
    let yTicks: number[];
    let yTickLabels: { v: number; label: string }[];
    if (logY) {
      const e0 = Math.ceil(yMin);
      const e1 = Math.floor(yMax);
      const raw: number[] = [];
      for (let e = e0; e <= e1 && raw.length < 12; e++) raw.push(e);
      yTicks = raw.length >= 2 ? raw : niceTicks(yMin, yMax, 5);
      yTickLabels = yTicks.map((v) =>
        raw.length >= 2 ? { v, label: `1e${v}` } : { v, label: fmt(Math.pow(10, v)) }
      );
    } else {
      yTicks = niceTicks(yMin, yMax, 5);
      yTickLabels = yTicks.map((v) => ({ v, label: fmt(v) }));
    }

    const paths = clean.map((s) => ({
      name: s.name,
      color: s.color,
      d: s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p[0]).toFixed(2)} ${sy(p[1]).toFixed(2)}`).join(" "),
      dots: s.points.map((p) => ({ cx: sx(p[0]), cy: sy(p[1]) })),
    }));

    const annos = (annotations ?? []).map((a) => ({
      ...a,
      px: a.x != null && Number.isFinite(a.x) ? sx(a.x) : undefined,
      py: a.y != null && Number.isFinite(a.y) ? sy(logY ? Math.log10(Math.max(a.y, EPS)) : a.y) : undefined,
    }));

    return { empty: false as const, paths, xTicks, yTickLabels, sx, sy };
  }, [series, logY, annotations, height]);

  if (chart.empty) {
    return (
      <div className="alg-chart">
        {title != null && <p className="alg-caption">{title}</p>}
        <p className="alg-chart__empty">
          No series supplied. Pass{" "}
          <span className="alg-mono">
            series: {"{"} name, points: [x, y][] {"}"}[]
          </span>{" "}
          to plot.
          {policies && policies.length > 0 && <> Policies: {policies.join(", ")}.</>}
          {workload != null && <> Workload: {workload}.</>}
          {n != null && <> n = {n}.</>}
          {ops != null && <> ops = {ops}.</>}
        </p>
      </div>
    );
  }

  const m = { l: 52, r: 14, t: 16, b: 40 };
  const plotW = W - m.l - m.r;
  const plotH = Math.max(80, height - m.t - m.b);

  return (
    <div className="alg-chart">
      {title != null && <p className="alg-caption">{title}</p>}
      <svg
        className="alg-chart__svg"
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={yLabel ? `${yLabel} versus ${xLabel ?? "x"}` : "chart"}
      >
        {chart.yTickLabels.map((t) => (
          <g key={`y${t.v}`}>
            <line className="alg-chart__grid" x1={m.l} x2={m.l + plotW} y1={chart.sy(t.v)} y2={chart.sy(t.v)} />
            <text className="alg-chart__tick-label" x={m.l - 6} y={chart.sy(t.v) + 3} textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}
        {chart.xTicks.map((v) => (
          <g key={`x${v}`}>
            <line className="alg-chart__grid" y1={m.t} y2={m.t + plotH} x1={chart.sx(v)} x2={chart.sx(v)} />
            <text className="alg-chart__tick-label" x={chart.sx(v)} y={m.t + plotH + 14} textAnchor="middle">
              {fmt(v)}
            </text>
          </g>
        ))}

        <line className="alg-chart__axis" x1={m.l} x2={m.l} y1={m.t} y2={m.t + plotH} />
        <line className="alg-chart__axis" x1={m.l} x2={m.l + plotW} y1={m.t + plotH} y2={m.t + plotH} />

        {chart.paths.map((p) => (
          <g key={p.name}>
            <path className="alg-chart__line" d={p.d} stroke={p.color} />
            {p.dots.map((d, i) => (
              <circle key={i} className="alg-chart__dot" cx={d.cx} cy={d.cy} r={1.8} fill={p.color} />
            ))}
          </g>
        ))}

        {(annotations ?? []).map((a, i) => {
            const px = a.x != null && Number.isFinite(a.x) ? chart.sx(a.x) : null;
            const py = a.y != null && Number.isFinite(a.y) ? chart.sy(logY ? Math.log10(Math.max(a.y, EPS)) : a.y) : null;
            return (
              <g key={i}>
                {px != null && <line className="alg-chart__anno" x1={px} x2={px} y1={m.t} y2={m.t + plotH} />}
                {py != null && <line className="alg-chart__anno" x1={m.l} x2={m.l + plotW} y1={py} y2={py} />}
                <text
                  className="alg-chart__anno-text"
                  x={(px ?? m.l) + 6}
                  y={(py ?? m.t) + (py != null ? -6 : 14)}
                >
                  {a.text}
                </text>
              </g>
            );
          })}

        {xLabel != null && (
          <text className="alg-chart__axis-label" x={m.l + plotW / 2} y={height - 6} textAnchor="middle">
            {xLabel}
          </text>
        )}
        {yLabel != null && (
          <text
            className="alg-chart__axis-label"
            x={14}
            y={m.t + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${m.t + plotH / 2})`}
          >
            {yLabel}
          </text>
        )}
      </svg>

      <div className="alg-chart__legend">
        {chart.paths.map((p) => (
          <span key={p.name} className="alg-chart__swatch">
            <i style={{ backgroundColor: p.color }} aria-hidden="true" />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
