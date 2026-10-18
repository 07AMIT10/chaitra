import { useEffect, useMemo, useState } from "react";
import PaceControls from "./PaceControls";
import "../../styles/algorithms.css";

type Props = {
  permutation: number[];
  caption?: string;
};

type Step = {
  i: number;
  v: number;
  pile: number;
  isNew: boolean;
  tops: number[];
  nPiles: number;
};

type Model = {
  p: number[];
  n: number;
  lis: number[];
  lds: number[];
  piles: number[][];
  steps: Step[];
  tops: number[];
  chains: number[][];
  lisLen: number;
  ldsLen: number;
};

function dpInc(p: number[]): { a: number[]; par: number[] } {
  const n = p.length;
  const a = new Array(n).fill(1);
  const par = new Array(n).fill(-1);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++)
      if (p[j] < p[i] && a[j] + 1 > a[i]) {
        a[i] = a[j] + 1;
        par[i] = j;
      }
  return { a, par };
}
/** Longest non-increasing subsequence: the true width of the permutation poset.
 *  Points (i, p_i) and (j, p_j), i < j, are incomparable exactly when p_i >= p_j,
 *  so an antichain is a non-increasing subsequence and the longest one is the
 *  maximum antichain. Using >= (not >) keeps this exact when values repeat. */
function dpDec(p: number[]): { a: number[]; par: number[] } {
  const n = p.length;
  const a = new Array(n).fill(1);
  const par = new Array(n).fill(-1);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++)
      if (p[j] >= p[i] && a[j] + 1 > a[i]) {
        a[i] = a[j] + 1;
        par[i] = j;
      }
  return { a, par };
}
function witness(a: number[], par: number[]): number[] {
  if (a.length === 0) return [];
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i;
  const out: number[] = [];
  let c = best;
  while (c !== -1) {
    out.push(c);
    c = par[c];
  }
  return out.reverse();
}

/**
 * Patience sorting (the standard strict-LIS form). Tops hold the current pile
 * tops, strictly increasing across piles. Each card goes on the leftmost pile
 * whose top is >= it, else it starts a new pile. Each pile is a non-increasing
 * subsequence, hence an antichain; the piles therefore cover every card, and
 * their count is exactly the prefix LIS length — Mirsky's theorem, made visible.
 *
 * The comparison must be >= rather than >, so that the pile count agrees with
 * the strict-LIS dynamic program below even when the input repeats a value.
 */
function patience(p: number[]) {
  const tops: number[] = [];
  const idxTop: number[] = [];
  const piles: number[][] = [];
  const parent = new Array(p.length).fill(-1);
  const steps: Step[] = [];
  for (let i = 0; i < p.length; i++) {
    const v = p[i];
    let lo = 0;
    let hi = tops.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (tops[m] >= v) hi = m;
      else lo = m + 1;
    }
    const k = lo;
    const isNew = k === tops.length;
    parent[i] = k > 0 ? idxTop[k - 1] : -1;
    if (isNew) {
      tops.push(v);
      idxTop.push(i);
      piles.push([]);
    } else {
      tops[k] = v;
      idxTop[k] = i;
    }
    piles[k].push(i);
    steps.push({ i, v, pile: k, isNew, tops: tops.slice(), nPiles: tops.length });
  }
  const chain: number[] = [];
  let c = tops.length ? idxTop[tops.length - 1] : -1;
  while (c !== -1) {
    chain.push(c);
    c = parent[c];
  }
  return { tops, piles, steps, chain: chain.reverse(), parent };
}

function greedyChainCover(p: number[]): number[][] {
  const chains: number[][] = [];
  for (let i = 0; i < p.length; i++) {
    let placed = false;
    for (const ch of chains) {
      if (p[ch[ch.length - 1]] < p[i]) {
        ch.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) chains.push([i]);
  }
  return chains;
}

function buildModel(p: number[]): Model {
  const inc = dpInc(p);
  const dec = dpDec(p);
  const pat = patience(p);
  const chains = greedyChainCover(p);
  const lisLen = p.length ? Math.max(...inc.a) : 0;
  const ldsLen = p.length ? Math.max(...dec.a) : 0;
  return {
    p,
    n: p.length,
    lis: witness(inc.a, inc.par),
    lds: witness(dec.a, dec.par),
    piles: pat.piles,
    steps: pat.steps,
    tops: pat.tops,
    chains,
    lisLen,
    ldsLen,
  };
}

/** Dilworth / Mirsky: one permutation, a max chain, an antichain cover, and patience sorting. */
export default function ChainAntichain({ permutation, caption }: Props) {
  const model = useMemo(() => buildModel(permutation ?? []), [permutation]);
  const { p, n, lis, lds, piles, steps, tops, chains, lisLen, ldsLen } = model;

  const count = Math.max(1, steps.length + 1);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const last = count - 1;
  const current = Math.min(Math.max(step, 0), last);
  const placed = current; // number of cards placed

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [model]);

  useEffect(() => {
    if (!playing) return;
    if (current >= last) {
      setPlaying(false);
      return;
    }
    const period = Math.max(180, 800 / Math.max(1, speed));
    const id = setInterval(() => setStep((s) => (s >= last ? s : s + 1)), period);
    return () => clearInterval(id);
  }, [playing, speed, last, current]);

  if (n === 0) {
    return (
      <div className="alg-ca">
        <p className="alg-caption">No permutation supplied — nothing to order.</p>
        {caption != null && <p className="alg-caption">{caption}</p>}
      </div>
    );
  }

  const W = 640;
  const H = 300;
  const m = { l: 40, r: 16, t: 16, b: 32 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const vMin = Math.min(...p);
  const vMax = Math.max(...p);
  const yOf = (v: number) => m.t + ph - ((v - vMin) / (vMax - vMin || 1)) * ph;
  const xOf = (i: number) => m.l + ((i + 0.5) / n) * pw;

  const onChain = new Set(lis);
  const onAnti = new Set(lds);
  const pileOf = new Array(n).fill(0);
  piles.forEach((pl, k) => pl.forEach((i) => (pileOf[i] = k)));

  const pileTopsNow = placed > 0 ? steps[placed - 1].tops : [];
  const nPilesNow = placed > 0 ? steps[placed - 1].nPiles : 0;
  const currentCard = placed > 0 ? steps[placed - 1] : null;

  const poly = (idx: number[]) =>
    idx.map((i) => `${xOf(i).toFixed(1)},${yOf(p[i]).toFixed(1)}`).join(" ");

  const placedPiles = piles
    .map((pl, k) => ({ k, cards: pl.filter((i) => i < placed) }))
    .filter((x) => x.cards.length > 0);

  return (
    <div className="alg-ca">
      <div className="alg-ca__bar">
        <PaceControls
          index={current}
          count={count}
          playing={playing}
          speed={speed}
          onIndex={(i) => {
            setPlaying(false);
            setStep(i);
          }}
          onPlayPause={() => setPlaying((pl) => !pl)}
          onReset={() => {
            setPlaying(false);
            setStep(0);
          }}
          onSpeed={setSpeed}
        />
        <span className="alg-ca__count">
          {placed} / {n} cards placed
          {currentCard != null && (
            <>
              {" · "}
              <b>{currentCard.v}</b> → pile {currentCard.pile + 1}
              {currentCard.isNew ? " (new pile)" : ""}
            </>
          )}
        </span>
      </div>

      <svg
        className="alg-ca__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="permutation points, a longest increasing subsequence and an antichain cover"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = vMin + (vMax - vMin) * f;
          return (
            <g key={`g${f}`}>
              <line className="alg-ca__grid" x1={m.l} x2={m.l + pw} y1={yOf(v)} y2={yOf(v)} />
              <text className="alg-ca__tick" x={m.l - 6} y={yOf(v) + 3} textAnchor="end">
                {Number(v.toPrecision(3))}
              </text>
            </g>
          );
        })}
        <line className="alg-ca__axis" x1={m.l} x2={m.l} y1={m.t} y2={m.t + ph} />
        <line className="alg-ca__axis" x1={m.l} x2={m.l + pw} y1={m.t + ph} y2={m.t + ph} />
        <text className="alg-ca__axis-label" x={m.l + pw / 2} y={H - 6} textAnchor="middle">
          place i
        </text>
        <text
          className="alg-ca__axis-label"
          x={12}
          y={m.t + ph / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${m.t + ph / 2})`}
        >
          value pᵢ
        </text>

        {piles.map((pl, k) => (
          <polyline
            key={`pl${k}`}
            className={`alg-ca__pileline${k % 2 === 1 ? " alg-ca__pileline--alt" : ""}`}
            points={poly(pl.filter((i) => i < placed))}
          />
        ))}
        {lds.length > 1 && <polyline className="alg-ca__antiline" points={poly(lds)} />}
        {lis.length > 1 && <polyline className="alg-ca__chainline" points={poly(lis)} />}

        {p.map((v, i) => {
          const cls = [
            "alg-ca__pt",
            i >= placed ? "alg-ca__pt--future" : "",
            onChain.has(i) ? "alg-ca__pt--chain" : "",
            onAnti.has(i) && !onChain.has(i) ? "alg-ca__pt--anti" : "",
            i === (currentCard ? currentCard.i : -1) ? "alg-ca__pt--cur" : "",
            i < placed && !onChain.has(i) ? (pileOf[i] % 2 === 0 ? "alg-ca__pt--pile0" : "alg-ca__pt--pile1") : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <g key={i}>
              <circle className={cls} cx={xOf(i)} cy={yOf(v)} r={i === (currentCard ? currentCard.i : -1) ? 8 : 6} />
              {n <= 16 && (
                <text className="alg-ca__ptlabel" x={xOf(i)} y={yOf(v) - 11} textAnchor="middle">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="alg-ca__cols">
        <div className="alg-ca__col">
          <div className="alg-ca__colhead">
            <span className="alg-ca__swatch alg-ca__swatch--chain" /> LIS chain (a max chain)
          </div>
          <div className="alg-ca__colbody alg-mono">
            {lis.map((i) => p[i]).join(" → ")} <span className="alg-ca__colnum">= {lisLen}</span>
          </div>
        </div>
        <div className="alg-ca__col">
          <div className="alg-ca__colhead">
            <span className="alg-ca__swatch alg-ca__swatch--anti" /> max antichain (longest drop)
          </div>
          <div className="alg-ca__colbody alg-mono">
            {lds.map((i) => p[i]).join(" → ")} <span className="alg-ca__colnum">= {ldsLen}</span>
          </div>
        </div>
      </div>

      <div className="alg-ca__identity">
        <div className="alg-ca__idbox">
          <div className="alg-ca__idlabel">max chain (LIS)</div>
          <div className="alg-ca__idnum">{lisLen}</div>
        </div>
        <div className="alg-ca__ideq">=</div>
        <div className="alg-ca__idbox">
          <div className="alg-ca__idlabel">min antichain cover</div>
          <div className="alg-ca__idnum">{piles.length}</div>
        </div>
        <div className="alg-ca__idbox">
          <div className="alg-ca__idlabel">piles so far = LIS(prefix)</div>
          <div className="alg-ca__idnum">{nPilesNow}</div>
        </div>
      </div>
      <p className="alg-ca__attrib">
        The identity on the left is <b>Mirsky&apos;s theorem</b> (Mirsky 1971): the height of a poset equals the
        fewest antichains needed to cover it. The patience piles are exactly that cover — each pile is a
        decreasing subsequence, so an antichain. (The brief for this page attributed the identity to Dilworth;
        that is the common swap. <b>Dilworth 1950</b> is the dual: min chain cover = max antichain = width.)
      </p>
      <div className="alg-ca__dual">
        <span>
          Dilworth dual (this permutation): min chain cover = <b>{chains.length}</b>
        </span>
        <span>
          max antichain (width) = <b>{ldsLen}</b>
        </span>
        <span className={chains.length === ldsLen ? "alg-ca__ok" : "alg-ca__bad"}>
          {chains.length === ldsLen ? "equal, as Dilworth says" : "mismatch"}
        </span>
      </div>

      <div className="alg-ca__piles" aria-label="patience piles">
        {placedPiles.map(({ k, cards }) => (
          <div key={k} className="alg-ca__pile">
            <div className="alg-ca__pile-top">top {pileTopsNow[k]}</div>
            <div className="alg-ca__pile-cards">
              {cards.map((i) => (
                <span key={i} className={`alg-ca__card${k % 2 === 1 ? " alg-ca__card--alt" : ""}`}>
                  {p[i]}
                </span>
              ))}
            </div>
            <div className="alg-ca__pile-label">pile {k + 1}</div>
          </div>
        ))}
        {placedPiles.length === 0 && <span className="alg-ca__pile-empty">No cards placed yet — press play or step.</span>}
      </div>
      <p className="alg-ca__tops alg-mono">
        pile tops: [{tops.map((t, k) => (k < nPilesNow ? t : "·")).join(", ")}] · number of piles ={" "}
        <b>{nPilesNow}</b> = LIS of the first {placed} cards
      </p>

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
