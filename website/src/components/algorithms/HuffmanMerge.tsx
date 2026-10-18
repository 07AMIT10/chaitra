import { useEffect, useMemo, useState, type ReactElement } from "react";
import "../../styles/algorithms.css";
import "../../styles/alg-huffman.css";

export type HuffmanSymbol = { name: string; weight: number };

type Props = {
  symbols: HuffmanSymbol[];
  caption?: string;
  height?: number;
  /** Mark the pair Huffman's rule would merge next. Defaults on. */
  greedyHint?: boolean;
};

type Node = {
  id: number;
  weight: number;
  /** index into `symbols` for a leaf, null for an internal node. */
  sym: number | null;
  left: number | null;
  right: number | null;
};

type Forest = {
  nodes: Node[];
  roots: number[];
  log: { a: string; b: string; weight: number }[];
};

/* ------------------------------------------------------------------ helpers */

function numberOf(v: number, dp = 4): string {
  if (!Number.isFinite(v)) return "—";
  const r = Number(v.toPrecision(dp));
  return String(r);
}

function weightText(w: number): string {
  if (Number.isInteger(w)) return String(w);
  return String(Number(w.toPrecision(4)));
}

function initForest(symbols: HuffmanSymbol[]): Forest {
  const nodes: Node[] = (symbols ?? []).map((s, i) => ({
    id: i,
    weight: Math.max(0, Number(s.weight) || 0),
    sym: i,
    left: null,
    right: null,
  }));
  return { nodes, roots: nodes.map((n) => n.id), log: [] };
}

function mergeRoots(forest: Forest, a: number, b: number, syms: HuffmanSymbol[] = []): Forest {
  const na = forest.nodes[a];
  const nb = forest.nodes[b];
  if (!na || !nb) return forest;
  // Canonical child order: lighter on the left, ties broken by id.
  const [l, r] =
    na.weight < nb.weight || (na.weight === nb.weight && na.id < nb.id) ? [na, nb] : [nb, na];
  const id = forest.nodes.length;
  const node: Node = { id, weight: na.weight + nb.weight, sym: null, left: l.id, right: r.id };
  return {
    nodes: [...forest.nodes, node],
    roots: [...forest.roots.filter((x) => x !== a && x !== b), id],
    log: [...forest.log, { a: nameOf(forest, a, syms), b: nameOf(forest, b, syms), weight: node.weight }],
  };
}

function nameOf(forest: Forest, id: number, symbols: HuffmanSymbol[] = []): string {
  const n = forest.nodes[id];
  if (!n) return "?";
  if (n.sym != null) return symbols[n.sym]?.name ?? `#${n.sym}`;
  return `{${weightText(n.weight)}}`;
}

/** Tree height: 0 for a leaf. */
function heightOf(nodes: Node[], id: number): number {
  const n = nodes[id];
  if (!n || (n.left == null && n.right == null)) return 0;
  return 1 + Math.max(heightOf(nodes, n.left as number), heightOf(nodes, n.right as number));
}

function leafCount(nodes: Node[], id: number): number {
  const n = nodes[id];
  if (!n) return 0;
  if (n.left == null && n.right == null) return 1;
  return leafCount(nodes, n.left as number) + leafCount(nodes, n.right as number);
}

function collectLeaves(nodes: Node[], id: number, bits: string, out: Map<number, { bits: string; depth: number }>) {
  const n = nodes[id];
  if (!n) return;
  if (n.left == null && n.right == null) {
    out.set(id, { bits, depth: bits.length });
    return;
  }
  collectLeaves(nodes, n.left as number, bits + "0", out);
  collectLeaves(nodes, n.right as number, bits + "1", out);
}

/** Standard Huffman: repeatedly merge the two lightest trees. */
function huffmanCost(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return 0;
  let pool = weights.map((w, i) => ({ w, i }));
  let acc = 0;
  while (pool.length > 1) {
    pool = pool.slice().sort((x, y) => x.w - y.w || x.i - y.i);
    const a = pool.shift() as { w: number; i: number };
    const b = pool.shift() as { w: number; i: number };
    const w = a.w + b.w;
    acc += w;
    pool.push({ w, i: pool.length + 1000 });
  }
  return acc / total;
}

function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) if (p > 0) h -= p * Math.log2(p);
  return h;
}

/* ------------------------------------------------------------------ component */

const PAD = { l: 18, r: 18, t: 26, b: 40 };

export default function HuffmanMerge({
  symbols,
  caption,
  height = 320,
  greedyHint = true,
}: Props) {
  const syms = symbols ?? [];
  const W = Math.max(0, syms.reduce((a, s) => a + (Number(s.weight) || 0), 0));
  const probs = useMemo(() => syms.map((s) => (W > 0 ? (Number(s.weight) || 0) / W : 0)), [syms, W]);
  const H = useMemo(() => entropy(probs), [probs]);
  const Lstar = useMemo(() => huffmanCost(syms.map((s) => Math.max(0, Number(s.weight) || 0))), [syms]);

  const [forest, setForest] = useState<Forest>(() => initForest(syms));
  const [sel, setSel] = useState<number[]>([]);
  const [hintOn, setHintOn] = useState(greedyHint);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setForest(initForest(syms));
    setSel([]);
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  const complete = forest.roots.length <= 1;
  const internal = forest.nodes.filter((n) => n.sym == null);
  const accumulated = internal.reduce((a, n) => a + n.weight, 0);
  const Lcurrent = W > 0 ? accumulated / W : 0;

  const hintPair = useMemo(() => {
    if (forest.roots.length < 2) return [] as number[];
    const sorted = forest.roots
      .slice()
      .sort((x, y) => forest.nodes[x].weight - forest.nodes[y].weight || x - y);
    return [sorted[0], sorted[1]];
  }, [forest]);

  useEffect(() => {
    if (!playing) return;
    if (forest.roots.length <= 1) {
      setPlaying(false);
      return;
    }
    const id = setInterval(() => {
      setForest((f) => {
        if (f.roots.length <= 1) return f;
        const sorted = f.roots
          .slice()
          .sort((x, y) => f.nodes[x].weight - f.nodes[y].weight || x - y);
        return mergeRoots(f, sorted[0], sorted[1], syms);
      });
      setSel([]);
    }, 700);
    return () => clearInterval(id);
  }, [playing, forest.roots.length, syms]);

  const toggle = (id: number) => {
    setSel((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  };

  /* -------------------------------------------------- layout of the forest */

  const BH = Math.max(190, height);
  const gW = 620;
  const layout = useMemo(() => {
    const pos = new Map<number, { x: number; y: number; depth: number }>();
    const leaves = new Map<number, { bits: string; depth: number }>();
    const slot = new Map<number, number>();
    let cursor = 0;

    const placeLeaves = (id: number): number => {
      if (slot.has(id)) return slot.get(id) as number;
      const n = forest.nodes[id];
      if (n.left == null && n.right == null) {
        slot.set(id, cursor);
        cursor += 1;
        return cursor - 1;
      }
      const lv = placeLeaves(n.left as number);
      const rv = placeLeaves(n.right as number);
      const v = (lv + rv) / 2;
      slot.set(id, v);
      return v;
    };

    for (const r of forest.roots) {
      placeLeaves(r);
      cursor += 0.55;
    }

    const maxH = Math.max(1, ...forest.roots.map((r) => heightOf(forest.nodes, r)));
    const totalSlots = Math.max(1, cursor - 0.55);
    const dy = Math.min(52, (BH - PAD.t - PAD.b) / maxH);
    const slotW = (gW - PAD.l - PAD.r) / totalSlots;
    const baseY = BH - PAD.b;

    const walk = (id: number) => {
      const s = slot.get(id) ?? 0;
      const h = heightOf(forest.nodes, id);
      pos.set(id, { x: PAD.l + (s + 0.5) * slotW, y: baseY - h * dy, depth: h });
      const n = forest.nodes[id];
      if (n.left != null) walk(n.left);
      if (n.right != null) walk(n.right);
    };
    for (const r of forest.roots) walk(r);
    for (const r of forest.roots) collectLeaves(forest.nodes, r, "", leaves);

    return { pos, leaves, slotW };
  }, [forest, BH]);

  const lastMerged = forest.nodes.length > syms.length ? forest.nodes[forest.nodes.length - 1].id : -1;
  const nodeR = Math.max(9, Math.min(14, layout.slotW * 0.34));

  if (syms.length === 0) {
    return (
      <div className="alg-huff">
        <p className="alg-caption">No symbols supplied — there is nothing to merge.</p>
        {caption != null && <p className="alg-caption">{caption}</p>}
      </div>
    );
  }

  const gap = Lcurrent - H;
  const bestFinish = Lcurrent + huffmanCost(forest.roots.map((r) => forest.nodes[r].weight));
  const axisMax = Math.max(H + 1.05, Lcurrent * 1.08, Lstar * 1.08, bestFinish * 1.05, 1e-6);
  const pctOf = (v: number) => `${Math.max(0, Math.min(100, (v / axisMax) * 100))}%`;

  const codes: { i: number; bits: string; depth: number; pref: boolean }[] = syms.map((_, i) => {
    const leafId = i;
    const info = layout.leaves.get(leafId);
    return { i, bits: info?.bits ?? "", depth: info?.depth ?? 0, pref: !complete };
  });

  return (
    <div className="alg-huff">
      <div className="alg-huff__bar">
        <div className="alg-huff__group" role="group" aria-label="Merging">
          <button
            type="button"
            className="alg-btn alg-btn--on"
            disabled={sel.length !== 2}
            onClick={() => {
              if (sel.length !== 2) return;
              setForest((f) => mergeRoots(f, sel[0], sel[1], syms));
              setSel([]);
            }}
          >
            Merge selected
          </button>
          <button
            type="button"
            className="alg-btn"
            disabled={complete}
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
          >
            {playing ? "Pause Huffman" : "Play Huffman"}
          </button>
          <button
            type="button"
            className="alg-btn"
            onClick={() => {
              setForest(initForest(syms));
              setSel([]);
              setPlaying(false);
            }}
          >
            Reset
          </button>
          {greedyHint && (
            <button
              type="button"
              className="alg-btn"
              aria-pressed={hintOn}
              onClick={() => setHintOn((h) => !h)}
            >
              {hintOn ? "Hide Huffman's choice" : "Show Huffman's choice"}
            </button>
          )}
        </div>
        <span className="alg-huff__count">
          {forest.roots.length} tree{forest.roots.length === 1 ? "" : "s"} in the forest
          {complete ? " · complete tree, code words final" : " · merge two roots to go on"}
        </span>
      </div>

      {hintOn && !complete && hintPair.length === 2 && (
        <p className="alg-huff__hint">
          Huffman's rule: merge the two lightest roots, {nameOf(forest, hintPair[0], syms)} (
          {weightText(forest.nodes[hintPair[0]].weight)}) and {nameOf(forest, hintPair[1], syms)} (
          {weightText(forest.nodes[hintPair[1]].weight)}). Any other pair is allowed — the panel will price it.
        </p>
      )}

      <svg
        className="alg-huff__svg"
        viewBox={`0 0 ${gW} ${BH}`}
        role="img"
        aria-label="forest of merge trees with 0/1 edge labels"
      >
        {forest.nodes
          .filter((n) => n.left != null)
          .map((n) => {
            const p = layout.pos.get(n.id);
            const l = layout.pos.get(n.left as number);
            const rr = layout.pos.get(n.right as number);
            if (!p || !l || !rr) return null;
            const edges: ReactElement[] = [];
            for (const [child, bit] of [
              [n.left, "0"],
              [n.right, "1"],
            ] as [number, string][]) {
              const c = layout.pos.get(child);
              if (!c) continue;
              edges.push(
                <g key={`e${n.id}-${child}`}>
                  <line className="alg-huff__edge" x1={p.x} y1={p.y} x2={c.x} y2={c.y} />
                  <text
                    className="alg-huff__bit"
                    x={(p.x + c.x) / 2 + (bit === "0" ? -6 : 6)}
                    y={(p.y + c.y) / 2 + 3}
                    textAnchor="middle"
                  >
                    {bit}
                  </text>
                </g>
              );
            }
            return <g key={`ee${n.id}`}>{edges}</g>;
          })}

        {forest.nodes.map((n) => {
          const p = layout.pos.get(n.id);
          if (!p) return null;
          const isRoot = forest.roots.includes(n.id);
          const picked = sel.includes(n.id);
          const hint = hintOn && !complete && hintPair.includes(n.id);
          const isLeaf = n.sym != null;
          return (
            <g key={`n${n.id}`}>
              <circle
                className={`alg-huff__node${picked ? " alg-huff__node--sel" : ""}${
                  hint ? " alg-huff__node--hint" : ""
                }${n.id === lastMerged ? " alg-huff__node--new" : ""}${isRoot ? " alg-huff__node--root" : ""}`}
                cx={p.x}
                cy={p.y}
                r={nodeR}
                role={isRoot ? "button" : undefined}
                tabIndex={isRoot ? 0 : undefined}
                aria-label={
                  isRoot
                    ? `root ${nameOf(forest, n.id, syms)}, weight ${weightText(n.weight)}`
                    : `weight ${weightText(n.weight)}`
                }
                onClick={isRoot ? () => toggle(n.id) : undefined}
                onKeyDown={
                  isRoot
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(n.id);
                        }
                      }
                    : undefined
                }
              />
              <text className="alg-huff__nodetext" x={p.x} y={p.y + 3} textAnchor="middle">
                {weightText(n.weight)}
              </text>
              {isLeaf && (
                <text className="alg-huff__leafname" x={p.x} y={p.y + nodeR + 13} textAnchor="middle">
                  {syms[n.sym as number]?.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="alg-huff__roots" role="group" aria-label="Roots you can select">
        {forest.roots.map((r) => (
          <button
            key={r}
            type="button"
            className="alg-huff__rootbtn"
            aria-pressed={sel.includes(r)}
            onClick={() => toggle(r)}
          >
            {nameOf(forest, r, syms)}
            <span className="alg-huff__rootweight">{weightText(forest.nodes[r].weight)}</span>
          </button>
        ))}
      </div>

      <div className="alg-huff__axis" aria-label="cost, entropy and the one-bit band">
        <div className="alg-huff__track">
          <div className="alg-huff__rail" />
          <div className="alg-huff__band" style={{ left: pctOf(H), width: pctOf(1) }} />
          <div className="alg-huff__marke alg-huff__marke--h" style={{ left: pctOf(H) }} />
          <div className="alg-huff__marke alg-huff__marke--opt" style={{ left: pctOf(Lstar) }} />
          <div className="alg-huff__marke alg-huff__marke--you" style={{ left: pctOf(Lcurrent) }} />
        </div>
        <p className="alg-huff__legend">
          <span className="alg-huff__sw alg-huff__sw--h" /> H = {numberOf(H)} ·{" "}
          <span className="alg-huff__sw alg-huff__sw--opt" /> L* = {numberOf(Lstar)} ·{" "}
          <span className="alg-huff__sw alg-huff__sw--you" /> {complete ? "L" : "Σ so far"} = {numberOf(Lcurrent)} · the
          shaded band is H to H + 1.
        </p>
        <p className="alg-huff__axiscaption">
          One axis, in bits per symbol. <b>H</b> is the Shannon entropy of this distribution (Shannon 1948), a lower
          bound for any prefix code. <b>L*</b> is what Huffman&apos;s rule achieves. The shaded band runs from H to
          H + 1: no binary prefix code can cost less than H, and one built two symbols at a time never costs a whole
          bit more.
        </p>
      </div>

      <div className="alg-huff__readout">
        <div className="alg-huff__cell">
          <span className="alg-huff__k">H, entropy</span>
          <span className="alg-huff__v alg-mono">{numberOf(H)}</span>
        </div>
        <div className="alg-huff__cell">
          <span className="alg-huff__k">L, your accumulated Σ pᵢℓᵢ</span>
          <span className="alg-huff__v alg-mono">{numberOf(Lcurrent)}</span>
        </div>
        <div className="alg-huff__cell">
          <span className="alg-huff__k">L*, Huffman's rule</span>
          <span className="alg-huff__v alg-mono">{numberOf(Lstar)}</span>
        </div>
        <div className="alg-huff__cell">
          <span className="alg-huff__k">L − H</span>
          <span className="alg-huff__v alg-mono">{numberOf(gap)}</span>
        </div>
        <div className="alg-huff__cell">
          <span className="alg-huff__k">{complete ? "L − L*, payback for straying" : "best finish from here"}</span>
          <span className="alg-huff__v alg-mono">
            {complete ? numberOf(Lcurrent - Lstar) : numberOf(bestFinish)}
          </span>
        </div>
        <div className="alg-huff__cell">
          <span className="alg-huff__k">{complete ? "compare with L*" : "already spent vs L*"}</span>
          <span className="alg-huff__v alg-mono">{numberOf(bestFinish - Lstar)}</span>
        </div>
      </div>

      <div className="alg-huff__tablewrap">
        <table className="alg-huff__table">
          <caption className="visually-hidden">code lengths for the current forest</caption>
          <thead>
            <tr>
              <th scope="col">symbol</th>
              <th scope="col">weight</th>
              <th scope="col">pᵢ</th>
              <th scope="col">{complete ? "code" : "prefix"}</th>
              <th scope="col">ℓᵢ</th>
              <th scope="col">pᵢℓᵢ</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.i}>
                <th scope="row">{syms[c.i].name}</th>
                <td className="alg-mono">{weightText(syms[c.i].weight)}</td>
                <td className="alg-mono">{numberOf(probs[c.i])}</td>
                <td className="alg-mono alg-huff__code">{c.bits || "—"}</td>
                <td className="alg-mono">{c.depth}</td>
                <td className="alg-mono">{numberOf(probs[c.i] * c.depth)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Σ</th>
              <td className="alg-mono">{weightText(W)}</td>
              <td className="alg-mono">1</td>
              <td />
              <td />
              <td className="alg-mono">
                <b>{numberOf(codes.reduce((a, c) => a + probs[c.i] * c.depth, 0))}</b>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!complete && (
        <p className="alg-huff__warn">
          The forest is not a single tree yet, so the ℓᵢ column counts only the edges from a leaf up to its current root.
          Those are prefixes, not code words. The Σ row will equal L only when one tree remains.
        </p>
      )}

      {complete && (
        <p className="alg-huff__verdict">
          One tree. Your code costs <b>L = {numberOf(Lcurrent)}</b> bits per symbol. Huffman's rule costs{" "}
          <b>{numberOf(Lstar)}</b>.{" "}
          {Math.abs(Lcurrent - Lstar) < 1e-9
            ? "You matched the greedy optimum exactly."
            : `Straying from the two-lightest rule cost ${numberOf(Lcurrent - Lstar)} bits per symbol on this distribution.`}{" "}
          The entropy is {numberOf(H)}, so the code sits {numberOf(Lcurrent - H)} bits above the floor and{" "}
          {numberOf(H + 1 - Lcurrent)} bits below the ceiling.
        </p>
      )}

      {forest.log.length > 0 && (
        <ol className="alg-huff__log">
          {forest.log.slice(-6).map((e, k) => (
            <li key={k}>
              merge {e.a} + {e.b} = {weightText(e.weight)}
            </li>
          ))}
        </ol>
      )}

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
