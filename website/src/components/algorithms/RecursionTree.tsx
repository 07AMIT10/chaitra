import { useEffect, useMemo, useState } from "react";
import "../../styles/algorithms.css";

type Props = {
  a: number;
  b: number;
  d: number;
  levels?: number;
  label?: string;
  caption?: string;
};

function num(v: number): string {
  if (v === Infinity) return "∞";
  if (!Number.isFinite(v)) return "−∞";
  if (Number.isInteger(v) && Math.abs(v) < 1e12) {
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  if (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0)) return v.toExponential(3);
  return String(Number(v.toPrecision(6)));
}

type LevelRow = {
  k: number;
  nodes: number;
  size: number;
  work: number;
  total: number;
  complete: boolean;
  drawn: number;
};

/** Master-theorem recursion tree T(n) = a·T(n/b) + n^d, live from three sliders. */
export default function RecursionTree({ a: a0, b: b0, d: d0, levels = 4, label, caption }: Props) {
  const [a, setA] = useState(a0);
  const [b, setB] = useState(b0);
  const [d, setD] = useState(d0);
  const L = Math.max(1, Math.min(6, Math.round(levels)));

  useEffect(() => {
    setA(a0);
    setB(b0);
    setD(d0);
  }, [a0, b0, d0]);

  const model = useMemo(() => {
    const n = Math.pow(b, L);
    const nd = Math.pow(n, d);
    const rows: LevelRow[] = [];
    let total = 0;
    let maxTotal = 0;
    for (let k = 0; k <= L; k++) {
      const nodes = Math.pow(a, k);
      const size = n / Math.pow(b, k);
      const work = Math.pow(size, d);
      const lt = nodes * work;
      const complete = nodes <= 40;
      rows.push({ k, nodes, size, work, total: lt, complete, drawn: Math.min(nodes, 40) });
      total += lt;
      if (lt > maxTotal) maxTotal = lt;
    }
    const logba = Math.log(a) / Math.log(b);
    const r = a / Math.pow(b, d);
    const balanced = Math.abs(logba - d) < 1e-9;
    const kind: "leaf" | "balanced" | "root" = balanced ? "balanced" : logba > d ? "leaf" : "root";
    let closed: number;
    if (Math.abs(r - 1) < 1e-12) closed = nd * (L + 1);
    else closed = (nd * (Math.pow(r, L + 1) - 1)) / (r - 1);
    let dom = 0;
    for (let k = 1; k <= L; k++) if (rows[k].total > rows[dom].total + 1e-9) dom = k;
    return { n, nd, rows, total, maxTotal, logba, r, kind, closed, dom, balanced, L };
  }, [a, b, d, L]);

  const { rows, n, nd, total, maxTotal, logba, r, kind, closed, dom, L: LL } = model;

  const W = 680;
  const top = 30;
  const dy = 52;
  const H = top + LL * dy + 20;
  const padX = 44;

  const dotR = (count: number) => (count <= 6 ? 7 : count <= 14 ? 5 : count <= 24 ? 3.8 : 2.6);
  const xAt = (j: number, count: number) => padX + ((j + 0.5) * (W - 2 * padX)) / Math.max(1, count);
  const yAt = (k: number) => top + k * dy;

  const caseTitle: Record<string, string> = {
    leaf: "Leaf-dominated",
    balanced: "Balanced",
    root: "Root-dominated",
  };
  const bound =
    kind === "leaf"
      ? `T(n) = \u0398(n^{log_b a}) = \u0398(n^{${num(Number(logba.toPrecision(4)))}})`
      : kind === "balanced"
        ? "T(n) = \u0398(n^d · log n)"
        : "T(n) = \u0398(n^d)";

  const reason =
    kind === "leaf"
      ? `log_b a = ${num(Number(logba.toPrecision(4)))} > d = ${d}. Each level multiplies its work by r = a/b^d = ${num(Number(r.toPrecision(4)))} > 1, so the level totals grow geometrically and the deepest (leaf) level holds the most. The leaves dominate.`
      : kind === "balanced"
        ? `log_b a = d = ${d}. r = a/b^d = 1 exactly, so every level costs the same n^d = ${num(nd)}, and there are ${LL + 1} such levels. No level dominates — they are tied.`
        : `log_b a = ${num(Number(logba.toPrecision(4)))} < d = ${d}. r = ${num(Number(r.toPrecision(4)))} < 1, so level totals shrink geometrically and the root level n^d = ${num(nd)} outweighs all deeper levels combined (their sum is at most n^d/(1−r)). The root dominates.`;

  return (
    <div className="alg-rec">
      <div className="alg-rec__sliders">
        <label className="alg-rec__slider">
          <span>
            a = <b>{a}</b>
          </span>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={a}
            onChange={(e) => setA(parseInt(e.target.value, 10))}
            aria-label="branching factor a"
          />
        </label>
        <label className="alg-rec__slider">
          <span>
            b = <b>{b}</b>
          </span>
          <input
            type="range"
            min={2}
            max={4}
            step={1}
            value={b}
            onChange={(e) => setB(parseInt(e.target.value, 10))}
            aria-label="shrink factor b"
          />
        </label>
        <label className="alg-rec__slider">
          <span>
            d = <b>{d}</b>
          </span>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={d}
            onChange={(e) => setD(parseInt(e.target.value, 10))}
            aria-label="polynomial exponent d"
          />
        </label>
      </div>

      <p className="alg-rec__eq">
        T(n) = {a}·T(n/{b}) + n<sup>{d}</sup>
        {label != null && <> — {label}</>}
      </p>

      {rows.some((rl) => !rl.complete) && (
        <p className="alg-rec__trunc">
          Levels with more than 40 nodes are drawn as a band marked ×count rather than one dot per node.
        </p>
      )}

      <svg
        className="alg-rec__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`recursion tree for T(n) = ${a} T(n/${b}) + n^${d}`}
      >
        {rows.map((rl) => {
          if (rl.k === 0) return null;
          const prev = rows[rl.k - 1];
          if (!rl.complete || !prev.complete) return null;
          const out = [];
          for (let j = 0; j < rl.drawn; j++) {
            const p = Math.floor(j / a);
            out.push(
              <line
                key={`t${rl.k}-${j}`}
                className="alg-rec__edge"
                x1={xAt(p, prev.drawn)}
                y1={yAt(rl.k - 1)}
                x2={xAt(j, rl.drawn)}
                y2={yAt(rl.k)}
              />
            );
          }
          return <g key={`g${rl.k}`}>{out}</g>;
        })}

        {rows.map((rl) => {
          if (!rl.complete) {
            const y = yAt(rl.k);
            return (
              <g key={`band${rl.k}`}>
                <rect
                  className="alg-rec__band"
                  x={padX}
                  y={y - 9}
                  width={W - 2 * padX}
                  height={18}
                  rx={4}
                />
                <text className="alg-rec__bandtext" x={W / 2} y={y + 4} textAnchor="middle">
                  {num(rl.nodes)} nodes
                </text>
              </g>
            );
          }
          return (
            <g key={`lv${rl.k}`}>
              {Array.from({ length: rl.drawn }, (_, j) => (
                <circle
                  key={j}
                  className={`alg-rec__node${rl.k === dom ? " alg-rec__node--dom" : ""}${rl.k === LL ? " alg-rec__node--leaf" : ""}`}
                  cx={xAt(j, rl.drawn)}
                  cy={yAt(rl.k)}
                  r={dotR(rl.drawn)}
                />
              ))}
            </g>
          );
        })}

        {rows.map((rl) => (
          <text key={`lb${rl.k}`} className="alg-rec__level" x={6} y={yAt(rl.k) + 4}>
            k={rl.k}
          </text>
        ))}
      </svg>

      <div className="alg-rec__ribbon" aria-label="per-level work">
        {rows.map((rl) => (
          <div key={rl.k} className="alg-rec__ribbon-row">
            <span className="alg-rec__ribbon-k">k={rl.k}</span>
            <div className="alg-rec__ribbon-track">
              <div
                className={`alg-rec__ribbon-bar${rl.k === dom ? " alg-rec__ribbon-bar--dom" : ""}`}
                style={{ width: `${maxTotal > 0 ? Math.max(2, (rl.total / maxTotal) * 100) : 0}%` }}
              />
            </div>
            <span className="alg-rec__ribbon-txt">
              {num(rl.nodes)} nodes × {num(rl.work)} = <b>{num(rl.total)}</b>
            </span>
          </div>
        ))}
      </div>

      <div className="alg-rec__sum">
        <p>
          Geometric sum: Σ<sub>k=0…{LL}</sub> a<sup>k</sup>·(n/b<sup>k</sup>)<sup>d</sup> = n<sup>d</sup> ·
          Σ r<sup>k</sup> ={" "}
          {model.balanced ? (
            <>
              n<sup>d</sup>·(L+1) = {num(nd)} · {LL + 1}
            </>
          ) : (
            <>
              n<sup>d</sup>·(r<sup>L+1</sup>−1)/(r−1)
            </>
          )}{" "}
          = <b>{num(total)}</b>
          <span className="alg-rec__muted"> (closed form {num(closed)})</span>
        </p>
        <p className="alg-rec__muted">
          n = b<sup>L</sup> = {num(n)}, L = {LL}, log<sub>b</sub> a = {num(Number(logba.toPrecision(6)))}, d = {d},
          r = a/b<sup>d</sup> = {num(Number(r.toPrecision(6)))}.{" "}
          {model.balanced ? "Every level ties at the top." : `The heaviest level is k = ${dom}.`}
        </p>
      </div>

      <div className={`alg-rec__case alg-rec__case--${kind}`}>
        <p className="alg-rec__case-title">
          {caseTitle[kind]}: {bound}
        </p>
        <p className="alg-rec__case-reason">{reason}</p>
      </div>

      <ul className="alg-rec__legend">
        <li className={kind === "leaf" ? "alg-rec__legend-on" : undefined}>
          log<sub>b</sub> a &gt; d — leaf-dominated, T(n) = Θ(n<sup>log<sub>b</sub> a</sup>)
        </li>
        <li className={kind === "balanced" ? "alg-rec__legend-on" : undefined}>
          log<sub>b</sub> a = d — balanced, T(n) = Θ(n<sup>d</sup> log n)
        </li>
        <li className={kind === "root" ? "alg-rec__legend-on" : undefined}>
          log<sub>b</sub> a &lt; d — root-dominated, T(n) = Θ(n<sup>d</sup>)
        </li>
      </ul>

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
