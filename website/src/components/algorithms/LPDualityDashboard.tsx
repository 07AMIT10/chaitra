import { useEffect, useId, useMemo, useState } from "react";
import PaceControls from "./PaceControls";
import SeriesChart from "./SeriesChart";
import "../../styles/algorithms.css";

type LPNode = { id: string; x: number; y: number; label?: string };
type LPEdge = { from: string; to: string; capacity: number };

type Res = { i: number; dir: 1 | -1; u: string; v: string; cap: number };

type Snap = {
  flow: number[];
  primal: number;
  dual: number;
  residual: Res[];
  path: Res[] | null;
  bottleneck: number;
  reach: boolean[];
  cut: { edges: number[]; cap: number } | null;
  iteration: number;
};

type Props = {
  nodes: LPNode[];
  edges: LPEdge[];
  source: string;
  sink: string;
  caption?: string;
  height?: number;
};

const EPS = 1e-9;
const fmt = (x: number) => {
  if (x === Infinity) return "∞";
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return String(Number(x.toFixed(3)));
};

function simulate(
  nodes: LPNode[],
  edges: LPEdge[],
  source: string,
  sink: string
): { snaps: Snap[]; order: string[]; ok: boolean } {
  const order = nodes.map((n) => n.id);
  const flow = new Array(edges.length).fill(0);
  const snaps: Snap[] = [];
  if (!order.includes(source) || !order.includes(sink)) {
    return { snaps: [], order, ok: false };
  }

  const residual = (): Res[] => {
    const out: Res[] = [];
    edges.forEach((e, i) => {
      const f = flow[i];
      if (e.capacity - f > EPS) out.push({ i, dir: 1, u: e.from, v: e.to, cap: e.capacity - f });
      if (f > EPS) out.push({ i, dir: -1, u: e.to, v: e.from, cap: f });
    });
    return out;
  };

  const reachFromSource = (res: Res[]): boolean[] => {
    const adj = new Map<string, Res[]>();
    order.forEach((id) => adj.set(id, []));
    res.forEach((r) => adj.get(r.u)?.push(r));
    const seen = new Map<string, boolean>();
    order.forEach((id) => seen.set(id, false));
    seen.set(source, true);
    const q = [source];
    for (let h = 0; h < q.length; h++) {
      for (const r of adj.get(q[h]) ?? []) {
        if (!seen.get(r.v)) {
          seen.set(r.v, true);
          q.push(r.v);
        }
      }
    }
    return order.map((id) => !!seen.get(id));
  };

  const cutCap = (reach: boolean[]) => {
    let cap = 0;
    const idxEdges: number[] = [];
    edges.forEach((e, i) => {
      const ui = order.indexOf(e.from);
      const vi = order.indexOf(e.to);
      if (reach[ui] && !reach[vi] && e.capacity > EPS) {
        cap += e.capacity;
        idxEdges.push(i);
      }
    });
    return { cap, edges: idxEdges };
  };

  const bfsPath = (res: Res[]): Res[] | null => {
    const adj = new Map<string, Res[]>();
    order.forEach((id) => adj.set(id, []));
    res.forEach((r) => adj.get(r.u)?.push(r));
    const seen = new Set<string>([source]);
    const prev = new Map<string, Res>();
    const q = [source];
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      if (u === sink) break;
      for (const r of adj.get(u) ?? []) {
        if (!seen.has(r.v)) {
          seen.add(r.v);
          prev.set(r.v, r);
          q.push(r.v);
        }
      }
    }
    if (!seen.has(sink)) return null;
    const path: Res[] = [];
    let cur = sink;
    while (cur !== source) {
      const r = prev.get(cur);
      if (!r) return null;
      path.push(r);
      cur = r.u;
    }
    return path.reverse();
  };

  // dual starts as the best of the two trivial cuts: {source} and V \ {sink}
  const onlySource = order.map((id) => id === source);
  const onlySink = order.map((id) => id !== sink);
  let dual = Math.min(cutCap(onlySource).cap, cutCap(onlySink).cap);
  let primal = 0;

  const record = (path: Res[] | null, bottleneck: number): void => {
    const res = residual();
    const reach = reachFromSource(res);
    let cut: Snap["cut"] = null;
    if (!reach[order.indexOf(sink)]) {
      const c = cutCap(reach);
      cut = c;
      if (c.cap < dual) dual = c.cap;
    }
    snaps.push({
      flow: flow.slice(),
      primal,
      dual,
      residual: res,
      path,
      bottleneck,
      reach,
      cut,
      iteration: snaps.length,
    });
  };

  record(null, 0);
  for (let guard = 0; guard < 2000; guard++) {
    const res = residual();
    const path = bfsPath(res);
    if (!path || path.length === 0) break;
    const delta = Math.min(...path.map((r) => r.cap));
    if (!(delta > EPS)) break;
    for (const r of path) flow[r.i] += r.dir * delta;
    primal += delta;
    record(path, delta);
  }
  return { snaps, order, ok: true };
}

/** Max-flow / min-cut as LP duality: primal and dual converging, gap closing to zero. */
export default function LPDualityDashboard({
  nodes,
  edges,
  source,
  sink,
  caption,
  height = 360,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const sim = useMemo(() => simulate(nodes, edges, source, sink), [nodes, edges, source, sink]);
  const snaps = sim.snaps;
  const count = Math.max(1, snaps.length);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showFlow, setShowFlow] = useState(false);
  const last = count - 1;
  const current = Math.min(Math.max(step, 0), last);
  const snap = snaps[current];

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [sim]);

  useEffect(() => {
    if (!playing) return;
    if (current >= last) {
      setPlaying(false);
      return;
    }
    const period = Math.max(200, 900 / Math.max(1, speed));
    const id = setInterval(() => setStep((s) => (s >= last ? s : s + 1)), period);
    return () => clearInterval(id);
  }, [playing, speed, last, current]);

  const layout = useMemo(() => {
    if (nodes.length === 0) return null;
    const pad = 34;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const dataW = maxX - minX;
    const dataH = maxY - minY;
    const availW = 660 - 2 * pad;
    const availH = height - 2 * pad;
    const cand: number[] = [];
    if (dataW > 1e-6) cand.push(availW / dataW);
    if (dataH > 1e-6) cand.push(availH / dataH);
    const scale = cand.length ? Math.min(...cand) : 1;
    const offX = pad + (availW - dataW * scale) / 2 - minX * scale;
    const offY = pad + (availH - dataH * scale) / 2 - minY * scale;
    const pos = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => pos.set(n.id, { x: n.x * scale + offX, y: n.y * scale + offY }));

    // residual arcs need curvature whenever two share the same unordered pair
    const groups = new Map<string, number[]>();
    const res = snap?.residual ?? [];
    res.forEach((r, k) => {
      const key = [r.u, r.v].sort().join("|");
      const a = groups.get(key) ?? [];
      a.push(k);
      groups.set(key, a);
    });
    const geometry = (u: string, v: string, offset: number) => {
      const a = pos.get(u) ?? { x: 0, y: 0 };
      const b = pos.get(v) ?? { x: 0, y: 0 };
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const r = 16;
      const sx = a.x + ux * r;
      const sy = a.y + uy * r;
      const ex = b.x - ux * r;
      const ey = b.y - uy * r;
      const cx = (sx + ex) / 2 + nx * offset * 2;
      const cy = (sy + ey) / 2 + ny * offset * 2;
      return {
        d: offset === 0 ? `M ${sx} ${sy} L ${ex} ${ey}` : `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
        lx: offset === 0 ? (sx + ex) / 2 + nx * 9 : 0.25 * sx + 0.5 * cx + 0.25 * ex + nx * 9,
        ly: offset === 0 ? (sy + ey) / 2 + ny * 9 + 3 : 0.25 * sy + 0.5 * cy + 0.25 * ey + ny * 9 + 3,
      };
    };
    return { pos, groups, geometry, W: 660, H: height };
  }, [nodes, snap, height]);

  if (!snap || !layout) {
    return (
      <div className="alg-lp">
        <p className="alg-caption">
          {sim.ok ? "No network supplied." : `source "${source}" or sink "${sink}" is not one of the node ids.`}
        </p>
        {caption != null && <p className="alg-caption">{caption}</p>}
      </div>
    );
  }

  const pathSet = new Set((snap.path ?? []).map((r) => `${r.i}:${r.dir}`));
  const cutSet = new Set(snap.cut?.edges ?? []);
  const gap = snap.dual - snap.primal;
  const done = snap.cut != null && current === last;
  const label = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;

  const series = [
    {
      name: "primal (flow value)",
      points: snaps.slice(0, current + 1).map((s, i) => [i, s.primal] as [number, number]),
      color: "var(--color-accent)",
    },
    {
      name: "dual (best cut capacity)",
      points: snaps.slice(0, current + 1).map((s, i) => [i, s.dual] as [number, number]),
      color: "var(--color-drishti)",
    },
    {
      name: "duality gap",
      points: snaps.slice(0, current + 1).map((s, i) => [i, s.dual - s.primal] as [number, number]),
      color: "var(--color-success)",
    },
  ];

  const residualArcs = snap.residual;
  const offsetOf = (k: number, u: string, v: string) => {
    const a = layout.groups.get([u, v].sort().join("|")) ?? [k];
    if (a.length === 1) return 0;
    return (a.indexOf(k) - (a.length - 1) / 2) * 12;
  };

  return (
    <div className="alg-lp">
      <div className="alg-lp__bar">
        <PaceControls
          index={current}
          count={count}
          playing={playing}
          speed={speed}
          onIndex={(i) => {
            setPlaying(false);
            setStep(i);
          }}
          onPlayPause={() => setPlaying((p) => !p)}
          onReset={() => {
            setPlaying(false);
            setStep(0);
          }}
          onSpeed={setSpeed}
        />
        <button type="button" className="alg-btn" aria-pressed={showFlow} onClick={() => setShowFlow((s) => !s)}>
          {showFlow ? "Show residual" : "Show flow"}
        </button>
        <span className="alg-lp__iter">
          {snap.iteration === 0 ? "initial" : `after augmentation ${snap.iteration}`}
        </span>
      </div>

      <svg
        className="alg-lp__svg"
        viewBox={`0 0 ${layout.W} ${layout.H}`}
        role="img"
        aria-label="residual network for max flow"
      >
        <defs>
          <marker
            id={`${uid}-arrow`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L10,5 L0,9 z" fill="context-stroke" />
          </marker>
        </defs>

        {!showFlow &&
          residualArcs.map((r, k) => {
            const g = layout.geometry(r.u, r.v, offsetOf(k, r.u, r.v));
            const onPath = pathSet.has(`${r.i}:${r.dir}`);
            const cls = `alg-lp__edge ${r.dir === 1 ? "alg-lp__edge--fwd" : "alg-lp__edge--bwd"}${
              onPath ? " alg-lp__edge--path" : ""
            }`;
            return (
              <g key={`r${k}`}>
                <path className={cls} d={g.d} markerEnd={`url(#${uid}-arrow)`} />
                <text className="alg-lp__elabel" x={g.lx} y={g.ly}>
                  {fmt(r.cap)}
                </text>
              </g>
            );
          })}

        {showFlow &&
          edges.map((e, i) => {
            const g = layout.geometry(e.from, e.to, 0);
            const f = snap.flow[i];
            const saturated = e.capacity > EPS && Math.abs(f - e.capacity) < 1e-9;
            const onPath = (snap.path ?? []).some((r) => r.i === i);
            const isCut = cutSet.has(i);
            const cls = `alg-lp__edge ${f > EPS ? "alg-lp__edge--flow" : "alg-lp__edge--idle"}${
              saturated ? " alg-lp__edge--sat" : ""
            }${onPath ? " alg-lp__edge--path" : ""}${isCut && done ? " alg-lp__edge--cut" : ""}`;
            return (
              <g key={`e${i}`}>
                <path className={cls} d={g.d} markerEnd={`url(#${uid}-arrow)`} />
                <text className="alg-lp__elabel" x={g.lx} y={g.ly}>
                  {f > EPS ? `${fmt(f)}/${fmt(e.capacity)}` : `0/${fmt(e.capacity)}`}
                </text>
              </g>
            );
          })}

        {nodes.map((n) => {
          const p = layout.pos.get(n.id)!;
          const inS = snap.reach[sim.order.indexOf(n.id)];
          const cls = [
            "alg-lp__node",
            n.id === source ? "alg-lp__node--s" : "",
            n.id === sink ? "alg-lp__node--t" : "",
            snap.cut != null ? (inS ? "alg-lp__node--ins" : "alg-lp__node--outt") : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <g key={n.id} className={cls}>
              <circle cx={p.x} cy={p.y} r={16} />
              <text className="alg-lp__nlabel" x={p.x} y={p.y + 4}>
                {label(n.id)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="alg-lp__status">
        <p className="alg-lp__line">
          {snap.path == null ? (
            <>initial state: no flow, the residual graph is the capacitated network itself</>
          ) : snap.path.length ? (
            <>
              augment along <span className="alg-mono">{snap.path.map((r) => `${r.u}→${r.v}`).join(" ")}</span> · bottleneck{" "}
              <b>{fmt(snap.bottleneck)}</b>
            </>
          ) : (
            <>no augmenting path</>
          )}
        </p>
      </div>

      <div className="alg-lp__cards">
        <div className="alg-lp__card alg-lp__card--primal">
          <span className="alg-lp__card-label">primal · flow value</span>
          <span className="alg-lp__card-num">{fmt(snap.primal)}</span>
        </div>
        <div className="alg-lp__card alg-lp__card--dual">
          <span className="alg-lp__card-label">dual · best cut capacity</span>
          <span className="alg-lp__card-num">{fmt(snap.dual)}</span>
        </div>
        <div className={`alg-lp__card${gap <= 1e-9 ? " alg-lp__card--closed" : ""}`}>
          <span className="alg-lp__card-label">gap (dual − primal)</span>
          <span className="alg-lp__card-num">{fmt(gap)}</span>
        </div>
      </div>

      {done && (
        <p className="alg-lp__conclusion">
          No augmenting path remains, so the reachable set S = {"{"}
          {sim.order.filter((id, i) => snap.reach[i]).map(label).join(", ")}
          {"}"} defines a cut of capacity {fmt(snap.dual)}. Max-flow = min-cut ={" "}
          <b>{fmt(snap.primal)}</b> (Ford–Fulkerson 1956; Edmonds–Karp 1972 uses BFS to pick shortest augmenting
          paths).
        </p>
      )}

      <div className="alg-lp__tablewrap">
        <table className="alg-lp__table">
          <thead>
            <tr>
              <th scope="col">edge</th>
              <th scope="col">capacity</th>
              <th scope="col">flow</th>
              <th scope="col">residual (fwd / bwd)</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((e, i) => (
              <tr key={i} className={done && cutSet.has(i) ? "alg-lp__row--cut" : undefined}>
                <td>
                  {label(e.from)} → {label(e.to)}
                </td>
                <td>{fmt(e.capacity)}</td>
                <td>{fmt(snap.flow[i])}</td>
                <td>
                  {fmt(e.capacity - snap.flow[i])} / {fmt(snap.flow[i])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SeriesChart
        series={series}
        xLabel="augmentation number"
        yLabel="objective value"
        height={230}
        title={`weak duality: primal ≤ dual at every iteration (gap on the same axis)`}
      />

      <p className="alg-caption">
        Edmonds–Karp augmenting paths (Ford–Fulkerson 1956 / Edmonds–Karp 1972). Weak duality says every flow
        value is at most every cut capacity, so the primal curve can only meet the dual from below; the gap closes
        to zero exactly when no augmenting path remains.
      </p>
      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
