import { useEffect, useId, useMemo, useState } from "react";
import PaceControls from "./PaceControls";
import "../../styles/algorithms.css";

export type GraphNode = { id: string; x: number; y: number; label?: string };
export type GraphEdge = { from: string; to: string; w?: number };
export type GraphAlgorithm =
  | "bfs"
  | "dfs"
  | "dijkstra"
  | "bellman-ford"
  | "prim"
  | "kruskal"
  | "toposort";

type NodeState = "unseen" | "frontier" | "settled" | "current" | "bad";
type EdgeState = "idle" | "candidate" | "accepted" | "rejected" | "path";

type Frame = {
  nodes: Record<string, NodeState>;
  edges: Record<number, EdgeState>;
  log: string;
  dist?: Record<string, number>;
  structure?: { label: string; items: string[] };
  note?: string;
};

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  algorithm: GraphAlgorithm;
  source?: string;
  target?: string;
  directed?: boolean;
  caption?: string;
  height?: number;
};

const ALGO_LABEL: Record<GraphAlgorithm, string> = {
  bfs: "breadth-first search",
  dfs: "depth-first search",
  dijkstra: "Dijkstra",
  "bellman-ford": "Bellman–Ford",
  prim: "Prim",
  kruskal: "Kruskal",
  toposort: "topological sort (Kahn)",
};

function fmtNum(v: number): string {
  if (v === Infinity) return "∞";
  if (v === -Infinity) return "−∞";
  if (Number.isNaN(v)) return "·";
  return String(v);
}

/**
 * Pure trace builder. Runs the named algorithm to completion and records one
 * serialisable snapshot per meaningful event, so the React component only has
 * to index into the array. No browser APIs, so it also runs during SSR.
 */
function buildTrace(props: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  algorithm: GraphAlgorithm;
  source?: string;
  target?: string;
  directed: boolean;
}): Frame[] {
  const { nodes, edges, algorithm, source, target, directed } = props;
  const ids = nodes.map((n) => n.id);
  if (ids.length === 0) return [];
  const idxOf = new Map<string, number>(ids.map((id, i) => [id, i]));
  const nbr: { to: string; idx: number; w: number }[][] = ids.map(() => []);
  const nbrDir: { to: string; idx: number; w: number }[][] = ids.map(() => []);
  edges.forEach((e, idx) => {
    const w = e.w ?? 1;
    const a = idxOf.get(e.from);
    const b = idxOf.get(e.to);
    if (a == null || b == null) return;
    nbrDir[a].push({ to: e.to, idx, w });
    nbr[a].push({ to: e.to, idx, w });
    if (!directed) nbr[b].push({ to: e.from, idx, w });
  });

  const ns: Record<string, NodeState> = {};
  ids.forEach((id) => (ns[id] = "unseen"));
  const es: Record<number, EdgeState> = {};
  edges.forEach((_, i) => (es[i] = "idle"));
  const frames: Frame[] = [];

  const push = (log: string, extra?: Partial<Frame>) =>
    frames.push({ nodes: { ...ns }, edges: { ...es }, log, ...extra });

  const start = source && idxOf.has(source) ? source : ids[0];

  if (algorithm === "bfs") {
    const queue: string[] = [start];
    ns[start] = "frontier";
    push(`start at ${start}: enqueue it`, {
      structure: { label: "queue", items: [...queue] },
    });
    while (queue.length) {
      const u = queue.shift()!;
      ns[u] = "current";
      push(`dequeue ${u} — it is now current`, {
        structure: { label: "queue", items: [...queue] },
      });
      for (const { to, idx } of nbr[idxOf.get(u)!]) {
        if (ns[to] === "unseen") {
          ns[to] = "frontier";
          es[idx] = "accepted";
          queue.push(to);
          push(`${u} → ${to}: unseen, so this is a tree edge; enqueue ${to}`, {
            structure: { label: "queue", items: [...queue] },
          });
        } else if (es[idx] === "idle") {
          es[idx] = "rejected";
          push(`${u} → ${to}: already reached (${ns[to]}), so skip it`, {
            structure: { label: "queue", items: [...queue] },
          });
        }
      }
      ns[u] = "settled";
      push(`finish ${u}: every neighbour examined`, {
        structure: { label: "queue", items: [...queue] },
      });
    }
    push(`BFS complete — frontier empties after ${ids.length} nodes`);
    return frames;
  }

  if (algorithm === "dfs") {
    const visited = new Set<string>();
    const stack: string[] = [];
    const order: string[] = [];
    const rec = (u: string) => {
      visited.add(u);
      ns[u] = "current";
      stack.push(u);
      order.push(u);
      push(`enter ${u} (preorder)`, {
        structure: { label: "path", items: [...stack] },
      });
      for (const { to, idx } of nbr[idxOf.get(u)!]) {
        if (!visited.has(to)) {
          es[idx] = "accepted";
          push(`${u} → ${to}: unvisited, tree edge, recurse`, {
            structure: { label: "path", items: [...stack] },
          });
          rec(to);
          ns[u] = "current";
          push(`back at ${u} after returning from ${to}`, {
            structure: { label: "path", items: [...stack] },
          });
        } else if (es[idx] === "idle") {
          es[idx] = "rejected";
          push(`${u} → ${to}: already visited, non-tree edge`, {
            structure: { label: "path", items: [...stack] },
          });
        }
      }
      ns[u] = "settled";
      stack.pop();
      push(`leave ${u} (postorder)`, {
        structure: { label: "path", items: [...stack] },
      });
    };
    for (const id of ids) {
      if (!visited.has(id)) {
        push(`new component rooted at ${id}`);
        rec(id);
      }
    }
    push(`DFS complete — preorder ${order.join(" → ")}`, {
      structure: { label: "path", items: [] },
    });
    return frames;
  }

  if (algorithm === "dijkstra") {
    const dist: Record<string, number> = {};
    const prev: Record<string, string> = {};
    const treeEdge: Record<string, number> = {};
    const settled = new Set<string>();
    ids.forEach((id) => (dist[id] = Infinity));
    dist[start] = 0;
    ns[start] = "frontier";
    push(`start at ${start}: d = 0, all other distances ∞ (a min-priority queue holds them)`, {
      dist: { ...dist },
    });
    for (let it = 0; it < ids.length; it++) {
      let u: string | null = null;
      let best = Infinity;
      for (const id of ids) {
        if (!settled.has(id) && dist[id] < best) {
          best = dist[id];
          u = id;
        }
      }
      if (u == null) {
        push("no finite unsettled node remains — the rest are unreachable", {
          dist: { ...dist },
          note: "unreachable nodes stay at ∞",
        });
        break;
      }
      settled.add(u);
      ns[u] = "current";
      push(`extract-min: settle ${u} at d = ${fmtNum(dist[u])}`, { dist: { ...dist } });
      for (const { to, idx, w } of nbr[idxOf.get(u)!]) {
        if (settled.has(to)) continue;
        const old = dist[to];
        const nd = dist[u] + w;
        if (nd < old) {
          dist[to] = nd;
          prev[to] = u;
          if (treeEdge[to] != null && treeEdge[to] !== idx) es[treeEdge[to]] = "candidate";
          treeEdge[to] = idx;
          es[idx] = "accepted";
          if (ns[to] === "unseen") ns[to] = "frontier";
          push(
            `relax ${u} → ${to}: ${fmtNum(dist[u])} + ${w} = ${nd} < ${fmtNum(old)} → d(${to}) = ${nd}`,
            { dist: { ...dist } }
          );
        } else {
          if (es[idx] === "idle") es[idx] = "rejected";
          push(
            `edge ${u} → ${to}: ${fmtNum(dist[u])} + ${w} = ${nd} ≥ d(${to}) = ${fmtNum(old)}, no improvement`,
            { dist: { ...dist } }
          );
        }
      }
      ns[u] = "settled";
      if (target && u === target) {
        push(`target ${target} settled at d = ${fmtNum(dist[target])} — safe to stop`, {
          dist: { ...dist },
        });
        break;
      }
    }
    if (target && Number.isFinite(dist[target])) {
      let cur = target;
      while (prev[cur] != null) {
        const p = prev[cur];
        const e = nbr[idxOf.get(p)!].find((x) => x.to === cur);
        if (e) es[e.idx] = "path";
        cur = p;
      }
      push(
        `shortest path ${start} → ${target} has length ${fmtNum(dist[target])} (back-pointers marked)`,
        { dist: { ...dist }, note: "path edges in green" }
      );
    } else {
      push(`done — shortest distances from ${start}`, { dist: { ...dist } });
    }
    return frames;
  }

  if (algorithm === "bellman-ford") {
    const dist: Record<string, number> = {};
    const prev: Record<string, string> = {};
    const treeEdge: Record<string, number> = {};
    ids.forEach((id) => (dist[id] = Infinity));
    dist[start] = 0;
    ns[start] = "frontier";
    const relaxPair = (from: string, to: string, idx: number, w: number): boolean => {
      if (!Number.isFinite(dist[from])) return false;
      if (dist[from] + w < dist[to]) {
        dist[to] = dist[from] + w;
        prev[to] = from;
        if (treeEdge[to] != null && treeEdge[to] !== idx) es[treeEdge[to]] = "candidate";
        treeEdge[to] = idx;
        es[idx] = "accepted";
        if (ns[to] === "unseen") ns[to] = "frontier";
        return true;
      }
      return false;
    };
    push(`start at ${start}: d = 0, others ∞; ${ids.length - 1} rounds of full relaxation`, {
      dist: { ...dist },
    });
    for (let round = 1; round <= ids.length - 1; round++) {
      let changed = 0;
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const w = e.w ?? 1;
        if (relaxPair(e.from, e.to, i, w)) changed++;
        if (!directed && relaxPair(e.to, e.from, i, w)) changed++;
      }
      push(
        `round ${round}: ${changed} edge${changed === 1 ? "" : "s"} relaxed${changed ? "" : " — nothing changed, early exit"}`,
        { dist: { ...dist } }
      );
      if (changed === 0) break;
    }
    let neg = false;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const w = e.w ?? 1;
      const dirs: [string, string][] = directed ? [[e.from, e.to]] : [[e.from, e.to], [e.to, e.from]];
      for (const [a, b] of dirs) {
        if (Number.isFinite(dist[a]) && dist[a] + w < dist[b]) {
          neg = true;
          es[i] = "rejected";
          ns[b] = "bad";
        }
      }
    }
    if (neg) {
      push("one more round still improves an edge — a negative-weight cycle is reachable", {
        dist: { ...dist },
        note: "no shortest paths exist through the cycle",
      });
    } else {
      if (target && Number.isFinite(dist[target])) {
        let cur = target;
        while (prev[cur] != null) {
          const p = prev[cur];
          const e = nbr[idxOf.get(p)!].find((x) => x.to === cur);
          if (e) es[e.idx] = "path";
          cur = p;
        }
        push(`no negative cycle; d(${start} → ${target}) = ${fmtNum(dist[target])}`, {
          dist: { ...dist },
        });
      } else {
        push("no negative cycle; final distances are tight", { dist: { ...dist } });
      }
    }
    return frames;
  }

  if (algorithm === "prim") {
    const inTree = new Set<string>([start]);
    ns[start] = "settled";
    let total = 0;
    const recomputeEdges = () => {
      edges.forEach((e, i) => {
        if (es[i] === "accepted" || es[i] === "path") return;
        const uIn = inTree.has(e.from);
        const vIn = inTree.has(e.to);
        if (uIn !== vIn) es[i] = "candidate";
        else if (uIn && vIn) es[i] = "rejected";
        else es[i] = "idle";
      });
    };
    push(`Prim: grow one tree from ${start}; it is a single component by construction`, {
      structure: { label: "tree", items: [...inTree] },
    });
    while (inTree.size < ids.length) {
      let best: { idx: number; u: string; v: string; w: number } | null = null;
      edges.forEach((e, i) => {
        const w = e.w ?? 1;
        const uIn = inTree.has(e.from);
        const vIn = inTree.has(e.to);
        if (uIn === vIn) return;
        const u = uIn ? e.from : e.to;
        const v = uIn ? e.to : e.from;
        if (!best || w < (best as { w: number }).w) best = { idx: i, u, v, w };
      });
      if (!best) {
        push("no edge leaves the tree — the graph is disconnected", {
          note: "Prim stops with a spanning forest",
          structure: { label: "tree", items: [...inTree] },
        });
        break;
      }
      const pick = best as { idx: number; u: string; v: string; w: number };
      inTree.add(pick.v);
      es[pick.idx] = "accepted";
      ns[pick.v] = "settled";
      total += pick.w;
      recomputeEdges();
      push(`add ${pick.v} via ${pick.u} (weight ${pick.w}); tree weight so far ${total}`, {
        structure: { label: "tree", items: [...inTree] },
      });
    }
    push(`Prim complete — minimum spanning weight ${total}`, {
      structure: { label: "tree", items: [...inTree] },
      note: `accepted edges total ${total}`,
    });
    return frames;
  }

  if (algorithm === "kruskal") {
    const parent: Record<string, string> = {};
    ids.forEach((id) => (parent[id] = id));
    const find = (x: string): string => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const comps = () => {
      const m = new Map<string, string[]>();
      ids.forEach((id) => {
        const r = find(id);
        const a = m.get(r) ?? [];
        a.push(id);
        m.set(r, a);
      });
      return [...m.values()].map((c) => `{${c.join(",")}}`);
    };
    const order = edges
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (a.e.w ?? 1) - (b.e.w ?? 1) || a.i - b.i);
    let total = 0;
    let acceptedCount = 0;
    push(`Kruskal: sort ${edges.length} edges by weight, then test each for a cycle`, {
      structure: { label: "components", items: comps() },
    });
    for (const { e, i } of order) {
      const w = e.w ?? 1;
      const ru = find(e.from);
      const rv = find(e.to);
      if (ru !== rv) {
        parent[rv] = ru;
        es[i] = "accepted";
        total += w;
        acceptedCount++;
        ns[e.from] = "settled";
        ns[e.to] = "settled";
        push(`accept ${e.from} – ${e.to} (weight ${w}): distinct components, merge them`, {
          structure: { label: "components", items: comps() },
        });
      } else {
        es[i] = "rejected";
        push(`reject ${e.from} – ${e.to} (weight ${w}): both already in one component`, {
          structure: { label: "components", items: comps() },
        });
      }
    }
    push(
      `Kruskal complete — ${acceptedCount} edges accepted, minimum spanning weight ${total}`,
      { structure: { label: "components", items: comps() }, note: `accepted edges total ${total}` }
    );
    return frames;
  }

  // toposort — always interpret edges as directed from → to
  const indeg: Record<string, number> = {};
  ids.forEach((id) => (indeg[id] = 0));
  edges.forEach((e) => {
    if (idxOf.has(e.from) && idxOf.has(e.to) && e.from !== e.to) indeg[e.to] += 1;
  });
  const queue: string[] = ids.filter((id) => indeg[id] === 0);
  queue.forEach((id) => (ns[id] = "frontier"));
  const out: string[] = [];
  push(`Kahn: sources (in-degree 0) are ${queue.length ? queue.join(", ") : "none"}`, {
    structure: { label: "queue", items: [...queue] },
  });
  while (queue.length) {
    const u = queue.shift()!;
    out.push(u);
    ns[u] = "current";
    push(`emit ${u} as the next position in the order`, {
      structure: { label: "queue", items: [...queue] },
    });
    for (const { to, idx } of nbrDir[idxOf.get(u)!]) {
      if (to === u) continue;
      es[idx] = "accepted";
      indeg[to] -= 1;
      if (indeg[to] === 0 && ns[to] !== "settled") {
        ns[to] = "frontier";
        queue.push(to);
      }
      push(`consume ${u} → ${to}: in-degree of ${to} drops to ${indeg[to]}`, {
        structure: { label: "queue", items: [...queue] },
      });
    }
    ns[u] = "settled";
  }
  if (out.length < ids.length) {
    const stuck = ids.filter((id) => !out.includes(id));
    stuck.forEach((id) => (ns[id] = "bad"));
    push(
      `cycle detected: ${stuck.join(", ")} never reach in-degree 0 — a topological order does not exist`,
      { structure: { label: "queue", items: [] }, note: "directed cycle" }
    );
  } else {
    push(`topological order: ${out.join(" → ")}`, {
      structure: { label: "queue", items: [] },
      note: "DAG, no cycle",
    });
  }
  return frames;
}

/** Self-driving graph algorithm player with an embedded transport. */
export default function GraphCanvas({
  nodes,
  edges,
  algorithm,
  source,
  target,
  directed = false,
  caption,
  height = 380,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const frames = useMemo(
    () => buildTrace({ nodes, edges, algorithm, source, target, directed }),
    [nodes, edges, algorithm, source, target, directed]
  );
  const count = Math.max(1, frames.length);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const last = count - 1;
  const current = Math.min(Math.max(step, 0), last);
  const frame = frames[current] ?? frames[0];

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    if (current >= last) {
      setPlaying(false);
      return;
    }
    const period = Math.max(140, 900 / Math.max(1, speed));
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
    const availW = 680 - 2 * pad;
    const availH = height - 2 * pad;
    const cand: number[] = [];
    if (dataW > 1e-6) cand.push(availW / dataW);
    if (dataH > 1e-6) cand.push(availH / dataH);
    const scale = cand.length ? Math.min(...cand) : 1;
    const offX = pad + (availW - dataW * scale) / 2 - minX * scale;
    const offY = pad + (availH - dataH * scale) / 2 - minY * scale;
    const pos = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => pos.set(n.id, { x: n.x * scale + offX, y: n.y * scale + offY }));

    const groupKey = (e: GraphEdge) =>
      directed ? `${e.from}\u2192${e.to}` : [e.from, e.to].sort().join("|");
    const groups = new Map<string, number[]>();
    edges.forEach((e, i) => {
      const k = groupKey(e);
      const a = groups.get(k) ?? [];
      a.push(i);
      groups.set(k, a);
    });
    const offsets = edges.map((e, i) => {
      const a = groups.get(groupKey(e)) ?? [i];
      if (a.length === 1) return 0;
      return (a.indexOf(i) - (a.length - 1) / 2) * 11;
    });

    const geom = edges.map((e, i) => {
      const a = pos.get(e.from) ?? { x: 0, y: 0 };
      const b = pos.get(e.to) ?? { x: 0, y: 0 };
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const r = 17;
      const sx = a.x + ux * r;
      const sy = a.y + uy * r;
      const ex = b.x - ux * r;
      const ey = b.y - uy * r;
      const off = offsets[i];
      const cx = (sx + ex) / 2 + nx * off * 2;
      const cy = (sy + ey) / 2 + ny * off * 2;
      return {
        d: off === 0 ? `M ${sx} ${sy} L ${ex} ${ey}` : `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
        lx: off === 0 ? (sx + ex) / 2 + nx * 9 : 0.25 * sx + 0.5 * cx + 0.25 * ex + nx * 9,
        ly: off === 0 ? (sy + ey) / 2 + ny * 9 + 3 : 0.25 * sy + 0.5 * cy + 0.25 * ey + ny * 9 + 3,
        self: e.from === e.to,
      };
    });
    return { pos, geom, W: 680, H: height };
  }, [nodes, edges, directed, height]);

  if (!layout || !frame) {
    return (
      <div className="alg-graph">
        <p className="alg-caption">No nodes supplied — nothing to run.</p>
        {caption != null && <p className="alg-caption">{caption}</p>}
      </div>
    );
  }

  const nodeLabel = (n: GraphNode) => n.label ?? n.id;
  const showDist =
    frame.dist != null && (algorithm === "dijkstra" || algorithm === "bellman-ford" || algorithm === "bfs");

  return (
    <div className="alg-graph">
      <div className="alg-graph__bar">
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
        <span className="alg-graph__algo">
          {ALGO_LABEL[algorithm]}
          {source != null && <> · source {source}</>}
          {target != null && <> · target {target}</>}
          {directed && <> · directed</>}
        </span>
      </div>

      <svg
        className="alg-graph__svg"
        viewBox={`0 0 ${layout.W} ${layout.H}`}
        role="img"
        aria-label={`${ALGO_LABEL[algorithm]} on a ${nodes.length}-node graph`}
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

        {edges.map((e, i) => {
          const st = frame.edges[i] ?? "idle";
          if (layout.geom[i].self) return null;
          return (
            <g key={`e${i}`}>
              <path
                className={`alg-graph__edge alg-graph__edge--${st}`}
                d={layout.geom[i].d}
                markerEnd={directed ? `url(#${uid}-arrow)` : undefined}
              />
              {e.w != null && (
                <text className="alg-graph__wlabel" x={layout.geom[i].lx} y={layout.geom[i].ly}>
                  {e.w}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((n) => {
          const p = layout.pos.get(n.id)!;
          const st = frame.nodes[n.id] ?? "unseen";
          return (
            <g key={n.id} className={`alg-graph__node alg-graph__node--${st}`}>
              <circle cx={p.x} cy={p.y} r={17} />
              <text className="alg-graph__nlabel" x={p.x} y={p.y + 4}>
                {nodeLabel(n)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="alg-graph__status">
        <p className="alg-graph__log" aria-live="polite">
          <span className="alg-graph__step">
            {current + 1}/{count}
          </span>{" "}
          {frame.log}
        </p>
        {frame.note != null && <p className="alg-graph__note">{frame.note}</p>}
      </div>

      {frame.structure != null && frame.structure.items.length > 0 && (
        <div className="alg-graph__struct">
          <span className="alg-graph__struct-label">{frame.structure.label}</span>
          {frame.structure.items.map((it, i) => (
            <span key={`${it}-${i}`} className="alg-graph__chip">
              {it}
            </span>
          ))}
        </div>
      )}

      {showDist && frame.dist != null && (
        <div className="alg-graph__dist">
          <table>
            <thead>
              <tr>
                <th scope="row">node</th>
                {nodes.map((n) => (
                  <th key={`h-${n.id}`} scope="col">
                    {nodeLabel(n)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">d</th>
                {nodes.map((n) => {
                  const v = frame.dist![n.id];
                  return (
                    <td
                      key={`d-${n.id}`}
                      className={
                        v === Infinity ? "alg-graph__dist-inf" : frame.nodes[n.id] === "current" ? "alg-graph__dist-cur" : ""
                      }
                    >
                      {fmtNum(v)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ol className="alg-graph__history" aria-label="step log">
        {frames.slice(0, current + 1).map((f, i) => (
          <li key={i} className={i === current ? "alg-graph__history-cur" : undefined}>
            <span className="alg-graph__step">{i + 1}</span> {f.log}
          </li>
        ))}
      </ol>

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
