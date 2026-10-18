import { useEffect, useMemo, useState } from "react";
import "../../styles/algorithms.css";

export type LatticeBlock = number[];
export type LatticePartition = LatticeBlock[];

type Props = {
  n: 3 | 4;
  onPartition?(blocks: number[][]): void;
  height?: number;
  caption?: string;
};

const W = 680;

function allPartitions(n: number): LatticePartition[] {
  const out: LatticePartition[] = [];
  const blocks: LatticeBlock[] = [];
  const rec = (i: number) => {
    if (i === n) {
      out.push(blocks.map((b) => b.slice()).sort((a, b) => a[0] - b[0]));
      return;
    }
    for (const b of blocks) {
      b.push(i);
      rec(i + 1);
      b.pop();
    }
    blocks.push([i]);
    rec(i + 1);
    blocks.pop();
  };
  rec(0);
  return out;
}

const keyOf = (p: LatticePartition) => p.map((b) => b.join(".")).join("|");
const labelOf = (p: LatticePartition) => p.map((b) => b.map((e) => e + 1).join("")).join("|");

function coversOf(p: LatticePartition): LatticePartition[] {
  const out: LatticePartition[] = [];
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const merged = [...p[i], ...p[j]].sort((a, b) => a - b);
      const rest = p.filter((_, k) => k !== i && k !== j);
      out.push([...rest, merged].sort((a, b) => a[0] - b[0]));
    }
  }
  return out;
}

function joinOf(a: LatticePartition, b: LatticePartition, n: number): LatticePartition {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const uni = (x: number, y: number) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[ry] = rx;
  };
  for (const blk of [...a, ...b]) for (let k = 1; k < blk.length; k++) uni(blk[0], blk[k]);
  const groups = new Map<number, number[]>();
  for (let e = 0; e < n; e++) {
    const r = find(e);
    const arr = groups.get(r) ?? [];
    arr.push(e);
    groups.set(r, arr);
  }
  return [...groups.values()].sort((x, y) => x[0] - y[0]);
}

/** Hasse diagram of the partition lattice Π_n; click a node or a cover edge to climb. */
export default function LatticeClimb({ n, onPartition, height = 460, caption }: Props) {
  const model = useMemo(() => {
    const parts = allPartitions(n);
    const byKey = new Map<string, LatticePartition>();
    for (const p of parts) byKey.set(keyOf(p), p);

    const tiers = new Map<number, string[]>();
    for (const p of parts) {
      const k = p.length;
      const arr = tiers.get(k) ?? [];
      arr.push(keyOf(p));
      tiers.set(k, arr);
    }
    for (const arr of tiers.values()) arr.sort();

    const bottomKey = keyOf(Array.from({ length: n }, (_, i) => [i]));
    const topKey = keyOf([Array.from({ length: n }, (_, i) => i)]);

    const edges: { from: string; to: string; id: string }[] = [];
    for (const p of parts) {
      const from = keyOf(p);
      for (const up of coversOf(p)) {
        const to = keyOf(up);
        edges.push({ from, to, id: `${from}→${to}` });
      }
    }

    const padX = 30;
    const padTop = 26;
    const padBottom = 26;
    const levels = n;
    const tierGap = levels > 1 ? (height - padTop - padBottom) / (levels - 1) : 0;
    const pos = new Map<string, { x: number; y: number; w: number; h: number; label: string; k: number }>();
    for (const [k, arr] of tiers) {
      const slot = (W - 2 * padX) / arr.length;
      arr.forEach((key, i) => {
        const label = labelOf(byKey.get(key)!);
        const w = Math.max(42, label.length * 7 + 16);
        pos.set(key, {
          x: padX + (i + 0.5) * slot,
          y: padTop + (k - 1) * tierGap,
          w,
          h: 24,
          label,
          k,
        });
      });
    }

    return { byKey, edges, pos, bottomKey, topKey };
  }, [n, height]);

  const [selectedKey, setSelectedKey] = useState(model.bottomKey);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  // keep the selection valid if n changes
  useEffect(() => {
    if (!model.byKey.has(selectedKey)) setSelectedKey(model.bottomKey);
  }, [model, selectedKey]);

  useEffect(() => {
    const p = model.byKey.get(selectedKey);
    if (p && typeof onPartition === "function") onPartition(p.map((b) => b.slice()));
  }, [selectedKey, model, onPartition]);

  const pathKeys = useMemo(() => {
    const target = model.byKey.get(selectedKey);
    if (!target) return [model.bottomKey];
    const targetOf = new Map<number, number>();
    target.forEach((b, bi) => b.forEach((e) => targetOf.set(e, bi)));
    let cur: LatticePartition = Array.from({ length: n }, (_, i) => [i]);
    const seq = [keyOf(cur)];
    let guard = 0;
    while (keyOf(cur) !== selectedKey && guard++ < 64) {
      const groups = new Map<number, number[]>();
      cur.forEach((b, ci) => {
        const t = targetOf.get(b[0]) ?? -1;
        const arr = groups.get(t) ?? [];
        arr.push(ci);
        groups.set(t, arr);
      });
      let pair: [number, number] | null = null;
      for (const arr of groups.values()) {
        if (arr.length >= 2) {
          pair = [arr[0], arr[1]];
          break;
        }
      }
      if (!pair) break;
      const merged = [...cur[pair[0]], ...cur[pair[1]]].sort((a, b) => a - b);
      cur = [...cur.filter((_, idx) => idx !== pair![0] && idx !== pair![1]), merged].sort(
        (a, b) => a[0] - b[0]
      );
      seq.push(keyOf(cur));
    }
    return seq;
  }, [selectedKey, model, n]);

  const pathEdgeIds = useMemo(
    () => new Set(pathKeys.slice(0, -1).map((k, i) => `${k}→${pathKeys[i + 1]}`)),
    [pathKeys]
  );
  const pathNodeSet = useMemo(() => new Set(pathKeys), [pathKeys]);

  const selected = model.byKey.get(selectedKey);
  const hovered = hoverKey ? model.byKey.get(hoverKey) : undefined;
  const join = selected && hovered ? joinOf(selected, hovered, n) : undefined;

  const select = (k: string) => setSelectedKey(k);

  return (
    <div className="alg-lattice">
      <svg
        className="alg-lattice__svg"
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={`Hasse diagram of the partition lattice of ${n} elements`}
      >
        {model.edges.map((e) => {
          const a = model.pos.get(e.from)!;
          const b = model.pos.get(e.to)!;
          const x1 = a.x;
          const y1 = a.y - a.h / 2;
          const x2 = b.x;
          const y2 = b.y + b.h / 2;
          const isPath = pathEdgeIds.has(e.id);
          return (
            <g key={e.id}>
              <line
                className={`alg-lattice__edge${isPath ? " alg-lattice__edge--path" : ""}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              />
              <line
                className="alg-lattice__edge-hit"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                onClick={() => select(e.to)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") select(e.to);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Climb from ${a.label} to ${b.label}`}
              >
                <title>{`Climb: ${a.label} → ${b.label}`}</title>
              </line>
            </g>
          );
        })}

        {[...model.pos.entries()].map(([key, p]) => {
          const cls = [
            "alg-lattice__node",
            key === selectedKey ? "alg-lattice__node--selected" : "",
            key === model.bottomKey ? "alg-lattice__node--bottom" : "",
            pathNodeSet.has(key) ? "alg-lattice__node--path" : "",
            key === hoverKey ? "alg-lattice__node--hover" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <g
              key={key}
              className={cls}
              role="button"
              tabIndex={0}
              aria-label={`Partition ${p.label}${key === selectedKey ? " (selected)" : ""}`}
              onClick={() => select(key)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") select(key);
              }}
              onMouseEnter={() => setHoverKey(key)}
              onMouseLeave={() => setHoverKey((h) => (h === key ? null : h))}
            >
              <rect
                x={p.x - Math.max(p.w, 48) / 2}
                y={p.y - 24}
                width={Math.max(p.w, 48)}
                height={48}
                fill="transparent"
                aria-hidden="true"
              />
              <rect
                className="alg-lattice__node-box"
                x={p.x - p.w / 2}
                y={p.y - p.h / 2}
                width={p.w}
                height={p.h}
                rx={4}
              />
              <text className="alg-lattice__node-text" x={p.x} y={p.y + 4}>
                {p.label}
              </text>
              <title>{p.label}</title>
            </g>
          );
        })}
      </svg>

      <div className="alg-lattice__readout">
        <span className="alg-lattice__sel">
          selected: <b>{selected ? labelOf(selected) : "—"}</b>
        </span>
        <span>
          blocks: <b>{selected ? selected.length : "—"}</b> of {n}
        </span>
        <span>
          climb from bottom: <b>{pathKeys.length - 1}</b>
        </span>
        <span className="alg-lattice__join">
          {join ? (
            <>
              join with {hovered ? labelOf(hovered) : ""}: <b>{labelOf(join)}</b>
            </>
          ) : (
            "hover a node to see its join with the selection"
          )}
        </span>
      </div>

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
