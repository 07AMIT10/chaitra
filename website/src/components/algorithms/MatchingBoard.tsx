import { useEffect, useMemo, useState } from "react";
import PaceControls from "./PaceControls";
import "../../styles/algorithms.css";
import "../../styles/alg-matching.css";

export type MatchingProblem = "stable-matching" | "bipartite-matching";

type Props = {
  left: string[];
  right: string[];
  /** leftPrefs[i] lists the right-hand indices i finds acceptable, best first. */
  leftPrefs: number[][];
  /** rightPrefs[j] lists the left-hand indices j finds acceptable, best first. */
  rightPrefs: number[][];
  /** Mode the board opens on; the reader can switch. */
  problem?: MatchingProblem;
  caption?: string;
  height?: number;
};

const INF = Number.POSITIVE_INFINITY;

/* ------------------------------------------------------------ deferred acceptance */

type DAState = {
  round: number;
  proposals: [number, number][];
  justRejected: [number, number][];
  rejectAll: [number, number][];
  /** receiver q -> proposer it currently holds, or -1. */
  holdQ: number[];
  /** proposer p -> receiver that holds it, or -1. */
  matchP: number[];
  /** p -> how far down its own list it has proposed. */
  nextP: number[];
  done: boolean;
};

function runDA(
  nP: number,
  nQ: number,
  prefP: number[][],
  rankQ: number[][],
  acceptable: (p: number, q: number) => boolean
): DAState[] {
  const nextP = new Array(nP).fill(0);
  const matchP = new Array(nP).fill(-1);
  const holdQ = new Array(nQ).fill(-1);
  const rejectAll: [number, number][] = [];
  const steps: DAState[] = [];
  let round = 0;

  const snap = (
    proposals: [number, number][],
    justRejected: [number, number][],
    done: boolean
  ): DAState => ({
    round,
    proposals: proposals.slice(),
    justRejected: justRejected.slice(),
    rejectAll: rejectAll.slice(),
    holdQ: holdQ.slice(),
    matchP: matchP.slice(),
    nextP: nextP.slice(),
    done,
  });

  steps.push(snap([], [], false));

  for (let guard = 0; guard < nP * nQ + nP + 4; guard++) {
    const proposals: [number, number][] = [];
    for (let p = 0; p < nP; p++) {
      if (matchP[p] !== -1) continue;
      while (nextP[p] < prefP[p].length && !acceptable(p, prefP[p][nextP[p]])) nextP[p]++;
      if (nextP[p] < prefP[p].length) proposals.push([p, prefP[p][nextP[p]]]);
    }
    if (proposals.length === 0) break;
    round++;
    for (const [p] of proposals) nextP[p]++;
    const justRejected: [number, number][] = [];
    for (const [p, q] of proposals) {
      const cur = holdQ[q];
      if (cur === -1 || rankQ[q][p] < rankQ[q][cur]) {
        if (cur !== -1) {
          matchP[cur] = -1;
          justRejected.push([cur, q]);
          rejectAll.push([cur, q]);
        }
        holdQ[q] = p;
        matchP[p] = q;
      } else {
        justRejected.push([p, q]);
        rejectAll.push([p, q]);
      }
    }
    steps.push(snap(proposals, justRejected, false));
  }
  steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
  return steps;
}

/* -------------------------------------------------------------- augmenting paths */

type BipStep = {
  i: number;
  found: boolean;
  /** edges of the augmenting path, in order, each [left, right]. */
  path: [number, number][];
  matchL: number[];
  matchR: number[];
  seenL: number[];
  seenR: number[];
  size: number;
};

type Adj = number[][];

function runKuhn(adj: Adj, nR: number): BipStep[] {
  const matchL = new Array(adj.length).fill(-1);
  const matchR = new Array(nR).fill(-1);
  const steps: BipStep[] = [
    {
      i: -1,
      found: false,
      path: [],
      matchL: matchL.slice(),
      matchR: matchR.slice(),
      seenL: [],
      seenR: [],
      size: 0,
    },
  ];

  for (let i = 0; i < adj.length; i++) {
    const seenL = new Set<number>([i]);
    const seenR = new Set<number>();
    const parL = new Map<number, number>();
    const parR = new Map<number, number>();
    const queue: number[] = [i];
    let sink = -1;

    while (queue.length && sink === -1) {
      const a = queue.shift() as number;
      for (const j of adj[a]) {
        if (seenR.has(j)) continue;
        seenR.add(j);
        parR.set(j, a);
        if (matchR[j] === -1) {
          sink = j;
          break;
        }
        const b = matchR[j];
        if (!seenL.has(b)) {
          seenL.add(b);
          parL.set(b, j);
          queue.push(b);
        }
      }
    }

    const path: [number, number][] = [];
    if (sink !== -1) {
      let j = sink;
      for (;;) {
        const a = parR.get(j);
        if (a === undefined) break;
        path.push([a, j]);
        const pj = parL.get(a);
        if (pj === undefined) break;
        j = pj;
      }
      path.reverse();
      for (const [a, jj] of path) {
        matchL[a] = jj;
        matchR[jj] = a;
      }
    }

    steps.push({
      i,
      found: sink !== -1,
      path,
      matchL: matchL.slice(),
      matchR: matchR.slice(),
      seenL: [...seenL],
      seenR: [...seenR],
      size: matchL.filter((v) => v !== -1).length,
    });
  }
  return steps;
}

/* --------------------------------------------------------------- component */

const VT = 34;

export default function MatchingBoard({
  left,
  right,
  leftPrefs,
  rightPrefs,
  problem = "stable-matching",
  caption,
  height = 300,
}: Props) {
  const L = left ?? [];
  const R = right ?? [];
  const nL = L.length;
  const nR = R.length;
  const rankL = useMemo(() => rankTable(leftPrefs, nL, nR), [leftPrefs, nL, nR]);
  const rankR = useMemo(() => rankTable(rightPrefs, nR, nL), [rightPrefs, nR, nL]);

  const acceptable = (i: number, j: number) =>
    rankL[i]?.[j] < INF && rankR[j]?.[i] < INF;

  const leftRun = useMemo(
    () => runDA(nL, nR, leftPrefs ?? [], rankR, acceptable),
    [leftPrefs, rankR, nL, nR]
  );
  const rightRun = useMemo(
    () => runDA(nR, nL, rightPrefs ?? [], rankL, acceptable),
    [rightPrefs, rankL, nL, nR]
  );

  const adj: Adj = useMemo(
    () =>
      Array.from({ length: nL }, (_, i) => {
        const seen = new Set<number>();
        const out: number[] = [];
        for (const j of leftPrefs?.[i] ?? []) {
          if (j >= 0 && j < nR && !seen.has(j) && acceptable(i, j)) {
            seen.add(j);
            out.push(j);
          }
        }
        return out;
      }),
    [leftPrefs, nL, nR, rankL, rankR]
  );
  const bipSteps = useMemo(() => runKuhn(adj, nR), [adj, nR]);

  const [mode, setMode] = useState<MatchingProblem>(problem);
  const [side, setSide] = useState<"left" | "right">("left");
  useEffect(() => setMode(problem), [problem]);

  const stableSteps = side === "left" ? leftRun : rightRun;
  const count = mode === "stable-matching" ? stableSteps.length : bipSteps.length;
  const last = Math.max(0, count - 1);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const current = Math.min(Math.max(idx, 0), last);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [mode, side, leftRun, rightRun]);

  useEffect(() => {
    if (!playing) return;
    if (current >= last) {
      setPlaying(false);
      return;
    }
    const period = Math.max(220, 1000 / Math.max(1, speed));
    const id = setInterval(() => setIdx((s) => (s >= last ? s : s + 1)), period);
    return () => clearInterval(id);
  }, [playing, speed, last, current]);

  const state = stableSteps[Math.min(current, stableSteps.length - 1)];
  const bstate = bipSteps[Math.min(current, bipSteps.length - 1)];

  /* ----- geometry ----- */
  const BH = Math.max(180, height);
  const xL = 96;
  const xR = 620 - 96;
  const pillW = 62;
  const pillH = 26;
  const yOf = (k: number, n: number) => VT + ((k + 0.5) * (BH - 2 * VT)) / Math.max(1, n);

  if (nL === 0 || nR === 0) {
    return (
      <div className="alg-match">
        <p className="alg-caption">No board supplied — both sides need at least one name.</p>
        {caption != null && <p className="alg-caption">{caption}</p>}
      </div>
    );
  }

  /* ----- stable-matching derived views ----- */
  const selFinal = (side === "left" ? leftRun : rightRun)[(side === "left" ? leftRun : rightRun).length - 1];
  const matchLFinal = L.map((_, i) => (side === "left" ? selFinal.matchP[i] : selFinal.holdQ[i]));
  const holdQFinal = R.map((_, j) => (side === "left" ? selFinal.holdQ[j] : selFinal.matchP[j]));
  const matchLFinalFromRight = rightRun[rightRun.length - 1].holdQ;

  const blocking: [number, number][] = [];
  for (let i = 0; i < nL; i++) {
    for (let j = 0; j < nR; j++) {
      if (matchLFinal[i] === j) continue;
      if (!acceptable(i, j)) continue;
      const held = holdQFinal[j];
      const iWants = matchLFinal[i] === -1 || rankL[i][j] < rankL[i][matchLFinal[i]];
      const jWants = held === -1 || rankR[j][i] < rankR[j][held];
      if (iWants && jWants) blocking.push([i, j]);
    }
  }

  const label = (arr: string[], k: number) => arr[k] ?? `#${k}`;
  const pairText = (
    i: number,
    j: number,
    matchLi: number,
    holdQj: number
  ): { text: string; cls: string; why: string } => {
    if (matchLi === j && holdQj === i) {
      return { text: "matched", cls: "alg-match__cell--match", why: "in the matching" };
    }
    if (!acceptable(i, j)) {
      return { text: "—", cls: "alg-match__cell--no", why: "not acceptable to both" };
    }
    const iWants = matchLi === -1 || rankL[i][j] < rankL[i][matchLi];
    const jWants = holdQj === -1 || rankR[j][i] < rankR[j][holdQj];
    if (iWants && jWants) {
      return { text: "blocks", cls: "alg-match__cell--block", why: "both would rather be together" };
    }
    if (!iWants) {
      return {
        text: "i holds",
        cls: "alg-match__cell--okL",
        why: `${label(L, i)} already has someone it prefers`,
      };
    }
    return {
      text: "j holds",
      cls: "alg-match__cell--okR",
      why: `${label(R, j)} already has someone it prefers`,
    };
  };

  /* ----- render ----- */
  const stableView = mode === "stable-matching";
  const proposerNames = side === "left" ? L : R;
  const proposingPrefs = side === "left" ? leftPrefs ?? [] : rightPrefs ?? [];
  const proposingNext = state.nextP;
  const propSet = new Set(state.proposals.map(([p, q]) => `${p}:${q}`));
  const rejSet = new Set(state.rejectAll.map(([p, q]) => `${p}:${q}`));

  const matchPairs: [number, number][] = [];
  if (stableView) {
    state.holdQ.forEach((p, q) => {
      if (p !== -1) matchPairs.push(side === "left" ? [p, q] : [q, p]);
    });
  } else {
    bstate.matchL.forEach((j, i) => {
      if (j !== -1) matchPairs.push([i, j]);
    });
  }

  const inPath = (i: number, j: number) =>
    !stableView && bstate.path.some(([a, b]) => a === i && b === j);

  return (
    <div className="alg-match">
      <div className="alg-match__controls">
        <div className="alg-match__group" role="group" aria-label="Problem">
          <span className="alg-match__glabel">board</span>
          <button
            type="button"
            className="alg-btn"
            aria-pressed={stableView}
            onClick={() => setMode("stable-matching")}
          >
            Deferred acceptance
          </button>
          <button
            type="button"
            className="alg-btn"
            aria-pressed={!stableView}
            onClick={() => setMode("bipartite-matching")}
          >
            Augmenting paths
          </button>
        </div>

        {stableView && (
          <div className="alg-match__group" role="group" aria-label="Who proposes">
            <span className="alg-match__glabel">propose from</span>
            <button type="button" className="alg-btn" aria-pressed={side === "left"} onClick={() => setSide("left")}>
              {side === "left" ? "left (optimal for left)" : "left"}
            </button>
            <button type="button" className="alg-btn" aria-pressed={side === "right"} onClick={() => setSide("right")}>
              {side === "right" ? "right (optimal for right)" : "right"}
            </button>
          </div>
        )}
      </div>

      <div className="alg-match__bar">
        <PaceControls
          index={current}
          count={Math.max(1, count)}
          playing={playing}
          speed={speed}
          onIndex={(i) => {
            setPlaying(false);
            setIdx(i);
          }}
          onPlayPause={() => setPlaying((p) => !p)}
          onReset={() => {
            setPlaying(false);
            setIdx(0);
          }}
          onSpeed={setSpeed}
        />
        <span className="alg-match__count">
          {stableView ? (
            <>
              {side === "left" ? "left" : "right"} proposes · {state.round} round{state.round === 1 ? "" : "s"}
              {state.round === 0 ? ": nobody has proposed yet" : ""}
              {state.done ? ` · stable matching found: ${matchPairs.length} pairs` : ""}
            </>
          ) : (
            <>
              {bstate.i < 0
                ? "empty matching — pick a free left vertex"
                : `trying left vertex ${label(L, bstate.i)} · ${
                    bstate.found ? "augmenting path found, matching grew" : "no augmenting path from here"
                  } · size ${bstate.size}`}
            </>
          )}
        </span>
      </div>

      <svg
        className="alg-match__svg"
        viewBox={`0 0 620 ${BH}`}
        role="img"
        aria-label="bipartite board with preference lists"
      >
        <text className="alg-match__sidetitle" x={xL} y={20} textAnchor="middle">
          {L.length} on the left
        </text>
        <text className="alg-match__sidetitle" x={xR} y={20} textAnchor="middle">
          {R.length} on the right
        </text>

        {L.map((_, i) =>
          R.map((__, j) => {
            const isMatch = matchPairs.some(([a, b]) => a === i && b === j);
            const isPath = inPath(i, j);
            const isProposal = stableView && propSet.has(side === "left" ? `${i}:${j}` : `${j}:${i}`);
            const isRejected = stableView && rejSet.has(side === "left" ? `${i}:${j}` : `${j}:${i}`);
            if (!acceptable(i, j) && !isProposal && !isMatch) return null;
            const cls = [
              "alg-match__edge",
              isMatch ? "alg-match__edge--match" : "",
              isPath ? "alg-match__edge--path" : "",
              isProposal ? "alg-match__edge--proposal" : "",
              isRejected && !isMatch ? "alg-match__edge--rejected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <line
                key={`e${i}-${j}`}
                className={cls}
                x1={xL + pillW / 2}
                y1={yOf(i, nL)}
                x2={xR - pillW / 2}
                y2={yOf(j, nR)}
              />
            );
          })
        )}

        {L.map((name, i) => {
          const onPath = !stableView && bstate.seenL.includes(i);
          const now = !stableView && bstate.i === i;
          const matched = matchPairs.some(([a]) => a === i);
          return (
            <g key={`l${i}`} className="alg-match__node">
              <rect
                className={`alg-match__pill${matched ? " alg-match__pill--match" : ""}${
                  onPath ? " alg-match__pill--seen" : ""
                }${now ? " alg-match__pill--now" : ""}`}
                x={xL - pillW / 2}
                y={yOf(i, nL) - pillH / 2}
                width={pillW}
                height={pillH}
                rx={pillH / 2}
              />
              <text className="alg-match__pilltext" x={xL} y={yOf(i, nL) + 4} textAnchor="middle">
                {name}
              </text>
            </g>
          );
        })}

        {R.map((name, j) => {
          const onPath = !stableView && bstate.seenR.includes(j);
          const now = !stableView && bstate.path.length > 0 && bstate.path[bstate.path.length - 1][1] === j;
          const matched = matchPairs.some(([, b]) => b === j);
          return (
            <g key={`r${j}`} className="alg-match__node">
              <rect
                className={`alg-match__pill${matched ? " alg-match__pill--match" : ""}${
                  onPath ? " alg-match__pill--seen" : ""
                }${now ? " alg-match__pill--now" : ""}`}
                x={xR - pillW / 2}
                y={yOf(j, nR) - pillH / 2}
                width={pillW}
                height={pillH}
                rx={pillH / 2}
              />
              <text className="alg-match__pilltext" x={xR} y={yOf(j, nR) + 4} textAnchor="middle">
                {name}
              </text>
            </g>
          );
        })}

        {stableView
          ? state.proposals.map(([p, q], k) => {
              const [i, j] = side === "left" ? [p, q] : [q, p];
              return (
                <text
                  key={`pr${k}`}
                  className="alg-match__proplabel"
                  x={(xL + xR) / 2}
                  y={(yOf(i, nL) + yOf(j, nR)) / 2}
                  textAnchor="middle"
                >
                  {label(side === "left" ? L : R, p)} → {label(side === "left" ? R : L, q)}
                </text>
              );
            })
          : null}
      </svg>

      {stableView ? (
        <>
          <div className="alg-match__lists">
            <div className="alg-match__listcol">
              <h4 className="alg-match__listhead">
                {side === "left" ? "proposers" : "receivers"} — {side === "left" ? "left" : "right"}
              </h4>
              {(side === "left" ? L : R).map((name, p) => {
                const prefs = proposingPrefs[p] ?? [];
                const other = side === "left" ? R : L;
                return (
                  <div key={p} className="alg-match__row">
                    <span className="alg-match__rowname">{name}</span>
                    <span className="alg-match__chips">
                      {prefs.map((q, k) => {
                        const done = k < proposingNext[p];
                        const cur = k === proposingNext[p];
                        const rejected = rejSet.has(`${p}:${q}`);
                        return (
                          <span
                            key={`${q}-${k}`}
                            className={`alg-match__chip${cur ? " alg-match__chip--cur" : ""}${
                              rejected ? " alg-match__chip--rej" : ""
                            }${done && !rejected ? " alg-match__chip--done" : ""}`}
                          >
                            {other[q] ?? `#${q}`}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="alg-match__listcol">
              <h4 className="alg-match__listhead">holds — {side === "left" ? "right" : "left"}</h4>
              {(side === "left" ? R : L).map((name, q) => {
                const held = state.holdQ[q];
                return (
                  <div key={q} className="alg-match__row">
                    <span className="alg-match__rowname">{name}</span>
                    <span className={`alg-match__hold${held !== -1 ? " alg-match__hold--on" : ""}`}>
                      {held === -1 ? "free" : proposerNames[held]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="alg-match__gridwrap">
            <h4 className="alg-match__listhead">
              every left–right pair, checked for blocking at the final matching
            </h4>
            <table className="alg-match__grid">
              <thead>
                <tr>
                  <th scope="col" />
                  {R.map((name, j) => (
                    <th key={j} scope="col">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {L.map((name, i) => (
                  <tr key={i}>
                    <th scope="row">{name}</th>
                    {R.map((rn, j) => {
                      const cell = pairText(i, j, matchLFinal[i], holdQFinal[j]);
                      return (
                        <td key={j} className={cell.cls} title={`${name}–${rn}: ${cell.why}`}>
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="alg-match__verdict">
              <b>matched</b> · <b>blocks</b> would be a blocking pair · <b>i holds</b> means the left vertex already has
              someone it ranks higher · <b>j holds</b> is the mirror · <b>—</b> is not mutually acceptable. Blocking
              pairs in the matching above: <b>{blocking.length}</b>.
            </p>
            <p className="alg-match__crosscheck">
              Deferred acceptance returns a matching with no blocking pair — that is what stability means here. Switch
              the proposing side and the same table is recomputed for the other extreme; it is empty of blocking pairs
              too.
            </p>
          </div>

          <div className="alg-match__extremes">
            <h4 className="alg-match__listhead">the two extremes, both stable</h4>
            <table className="alg-match__grid alg-match__grid--extremes">
              <thead>
                <tr>
                  <th scope="col">{side === "left" ? "left" : "right"}</th>
                  <th scope="col">partner when left proposes</th>
                  <th scope="col">partner when right proposes</th>
                  <th scope="col">differs?</th>
                </tr>
              </thead>
              <tbody>
                {L.map((name, i) => {
                  const a = matchLFinal[i];
                  const b = matchLFinalFromRight[i];
                  return (
                    <tr key={i}>
                      <th scope="row">{name}</th>
                      <td className="alg-mono">{a === -1 ? "free" : R[a]}</td>
                      <td className="alg-mono">{b === -1 ? "free" : R[b]}</td>
                      <td className={a === b ? "alg-match__same" : "alg-match__diff"}>
                        {a === b ? "same" : "better for the proposer"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="alg-match__lists">
            <div className="alg-match__listcol">
              <h4 className="alg-match__listhead">current matching</h4>
              {L.map((name, i) => {
                const j = bstate.matchL[i];
                return (
                  <div key={i} className="alg-match__row">
                    <span className="alg-match__rowname">{name}</span>
                    <span className={`alg-match__hold${j !== -1 ? " alg-match__hold--on" : ""}`}>
                      {j === -1 ? "free" : R[j]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="alg-match__listcol">
              <h4 className="alg-match__listhead">alternating path</h4>
              <p className="alg-match__path alg-mono">
                {bstate.path.length === 0
                  ? "none — either no free left vertex has been tried, or the search exhausted its alternating tree"
                  : bstate.path.map(([a, b]) => `${L[a]}–${R[b]}`).join(" → ")}
              </p>
              <p className="alg-match__verdict">
                Alternating means: non-matching edge, matching edge, non-matching edge, ending at a free vertex on the
                right. Flipping along it grows the matching by one.
              </p>
            </div>
          </div>
          <p className="alg-match__verdict">
            Matching size is <b>{bstate.size}</b> of a possible {Math.min(nL, nR)}. A matching is maximum exactly when
            the search finds no augmenting path anywhere — Berge's lemma (Berge 1957).
          </p>
        </>
      )}

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

function rankTable(prefs: number[][] | undefined, rows: number, cols: number): number[][] {
  const out: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(INF));
  if (!Array.isArray(prefs)) return out;
  for (let r = 0; r < rows; r++) {
    const list = prefs[r] ?? [];
    for (let k = 0; k < list.length; k++) {
      const c = list[k];
      if (c >= 0 && c < cols && out[r][c] === INF) out[r][c] = k;
    }
  }
  return out;
}
