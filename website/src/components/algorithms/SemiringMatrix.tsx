import { useMemo, useState } from "react";
import "../../styles/algorithms.css";

export type Semiring = "plus-times" | "min-plus" | "or-and" | "max-plus";

type Ops = {
  label: string;
  zero: number;
  one: number;
  add: (a: number, b: number) => number;
  mul: (a: number, b: number) => number;
  law: string;
  zeroText: string;
  oneText: string;
  coerce: (v: number) => number;
  /** The star of a scalar: δ ⊕ x ⊕ x² ⊕ ⋯ — "any number of laps through this vertex". */
  star: (x: number) => number;
  /** True when a ⊕ a = a. Then seeding the identity on the diagonal changes no answer. */
  idempotent: boolean;
};

const SEMIRINGS: Record<Semiring, Ops> = {
  "plus-times": {
    label: "(+, ×)",
    zero: 0,
    one: 1,
    add: (a, b) => a + b,
    mul: (a, b) => a * b,
    law: "⊕ = +, ⊗ = ×",
    zeroText: "0",
    oneText: "1",
    coerce: (v) => (Number.isFinite(v) ? v : 0),
    star: (x) => (x === 0 ? 1 : Infinity),
    idempotent: false,
  },
  "min-plus": {
    label: "(min, +)",
    zero: Infinity,
    one: 0,
    add: (a, b) => Math.min(a, b),
    mul: (a, b) => a + b,
    law: "⊕ = min, ⊗ = +",
    zeroText: "+∞",
    oneText: "0",
    coerce: (v) => (Number.isFinite(v) ? v : Infinity),
    star: (x) => (x >= 0 ? 0 : -Infinity),
    idempotent: true,
  },
  "or-and": {
    label: "(OR, AND)",
    zero: 0,
    one: 1,
    add: (a, b) => (a || b ? 1 : 0),
    mul: (a, b) => (a && b ? 1 : 0),
    law: "⊕ = OR, ⊗ = AND",
    zeroText: "0 (false)",
    oneText: "1 (true)",
    coerce: (v) => (v ? 1 : 0),
    star: () => 1,
    idempotent: true,
  },
  "max-plus": {
    label: "(max, +)",
    zero: -Infinity,
    one: 0,
    add: (a, b) => Math.max(a, b),
    mul: (a, b) => a + b,
    law: "⊕ = max, ⊗ = +",
    zeroText: "−∞",
    oneText: "0",
    coerce: (v) => (Number.isFinite(v) ? v : -Infinity),
    star: (x) => (x <= 0 ? 0 : Infinity),
    idempotent: true,
  },
};

const ORDER: Semiring[] = ["plus-times", "min-plus", "or-and", "max-plus"];

/**
 * Closure by elimination (Lehmann 1977; the Warshall/Floyd loop is its idempotent
 * instance). One step eliminates vertex k from every remaining route. A route that
 * enters k may take any number of laps through k before it leaves, and that freedom
 * is not a finite sum — it is the star R_kk* = δ ⊕ R_kk ⊕ R_kk² ⊕ ⋯. So the exact
 * step replaces the pivot by its star, scales row k and column k by it, and only then
 * splits each remaining entry into "avoid k" or "enter, lap through k, leave".
 *
 * For an idempotent ⊕ (min, max, OR) the star collapses to δ ⊕ R_kk, so we may seed the identity
 * on the diagonal up front — the empty walk — and the display is stable from k = 0. For (+, ×) that
 * seeding is not harmless: the star of a seeded 1 diverges, so the star step has to produce the
 * identity instead. That is the one place the four readings part company.
 */
function snapshots(matrix: number[][], sr: Ops, n: number): number[][][] {
  const cur: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const raw = matrix[i]?.[j];
      let v = sr.coerce(typeof raw === "number" ? raw : NaN);
      if (i === j && sr.idempotent) v = sr.add(v, sr.one);
      row.push(v);
    }
    cur.push(row);
  }
  const snaps: number[][][] = [cur.map((r) => r.slice())];
  for (let k = 0; k < n; k++) {
    const s = sr.star(cur[k][k]);
    for (let j = 0; j < n; j++) if (j !== k) cur[k][j] = sr.mul(s, cur[k][j]);
    for (let i = 0; i < n; i++) if (i !== k) cur[i][k] = sr.mul(cur[i][k], s);
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        cur[i][j] = sr.add(cur[i][j], sr.mul(cur[i][k], cur[k][j]));
      }
    }
    cur[k][k] = s;
    snaps.push(cur.map((r) => r.slice()));
  }
  return snaps;
}

function fmt(v: number): string {
  if (v === Infinity) return "∞";
  if (v === -Infinity) return "−∞";
  if (Number.isNaN(v)) return "·";
  if (Math.abs(v) >= 1e5) return v.toExponential(1);
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toFixed(3)));
}

type Props = {
  matrix: number[][];
  semiring: Semiring;
  allowSwitch?: boolean;
  rowLabels?: string[];
  colLabels?: string[];
  showSteps?: boolean;
  caption?: string;
};

/** One triple loop; swap the semiring and watch the closure change. */
export default function SemiringMatrix({
  matrix,
  semiring,
  allowSwitch = false,
  rowLabels,
  colLabels,
  showSteps = false,
  caption,
}: Props) {
  const n = matrix?.length ?? 0;
  const [srName, setSrName] = useState<Semiring>(semiring);
  const [step, setStep] = useState<number>(n);
  const sr = SEMIRINGS[srName] ?? SEMIRINGS["plus-times"];

  const snaps = useMemo(() => (n > 0 ? snapshots(matrix, sr, n) : []), [matrix, sr, n]);
  const activeStep = Math.min(Math.max(step, 0), n);
  const view = snaps[activeStep] ?? [];
  const prev = activeStep > 0 ? snaps[activeStep - 1] : undefined;
  const pivot = activeStep >= 1 && activeStep <= n ? activeStep - 1 : -1;

  const cols = `${n > 0 ? `minmax(1.8rem, auto) repeat(${n}, minmax(2.4rem, 1fr))` : "1fr"}`;

  if (n === 0) {
    return <p className="alg-caption">Empty matrix — nothing to close.</p>;
  }

  return (
    <div className="alg-semiring">
      {allowSwitch && (
        <div className="alg-semiring__controls" role="group" aria-label="Semiring">
          {ORDER.map((s) => (
            <button
              key={s}
              type="button"
              className="alg-btn"
              aria-pressed={s === srName}
              onClick={() => setSrName(s)}
            >
              {SEMIRINGS[s].label}
            </button>
          ))}
        </div>
      )}

      <pre className="alg-semiring__loop">{`for k = 1 … n
  for i = 1 … n
    for j = 1 … n
      R[i][j] ← R[i][j] ⊕ R[i][k] ⊗ R[k][j]`}</pre>

      <div className="alg-semiring__legend">
        <span>
          semiring <b>{sr.label}</b>
        </span>
        <span>{sr.law}</span>
        <span>
          zero <code>{sr.zeroText}</code>
        </span>
        <span>
          one <code>{sr.oneText}</code>
        </span>
      </div>

      {showSteps && (
        <label className="alg-semiring__step">
          <span>rounds of k</span>
          <input
            type="range"
            min={0}
            max={n}
            step={1}
            value={activeStep}
            onChange={(e) => setStep(parseInt(e.target.value, 10))}
            aria-label="Number of triple-loop rounds"
          />
          <output>
            k = {activeStep} / {n}
            {activeStep === n ? " (closure)" : ""}
          </output>
        </label>
      )}

      <div className="alg-semiring__scroll">
        <div className="alg-semiring__grid" style={{ gridTemplateColumns: cols }}>
          <div className="alg-semiring__corner" aria-hidden="true" />
          {Array.from({ length: n }, (_, j) => (
            <div key={`ch${j}`} className="alg-semiring__cell alg-semiring__cell--head">
              {colLabels?.[j] ?? String(j + 1)}
            </div>
          ))}

          {view.map((row, i) => (
            <RowFrag
              key={`row${i}`}
              i={i}
              row={row}
              prevRow={prev?.[i]}
              pivot={showSteps ? pivot : -1}
              showChanges={showSteps}
              rowLabel={rowLabels?.[i] ?? String(i + 1)}
            />
          ))}
        </div>
      </div>

      <p className="alg-caption">
        {activeStep === n
          ? `All-pairs closure under ${sr.label}: R after n = ${n} rounds.`
          : `Partial result after ${activeStep} of ${n} rounds.`}
        {!showSteps && " Set showSteps to walk k = 0 … n."}
      </p>
      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}

function RowFrag({
  i,
  row,
  prevRow,
  pivot,
  showChanges,
  rowLabel,
}: {
  i: number;
  row: number[];
  prevRow?: number[];
  pivot: number;
  showChanges: boolean;
  rowLabel: string;
}) {
  return (
    <>
      <div className="alg-semiring__cell alg-semiring__cell--head">{rowLabel}</div>
      {row.map((v, j) => {
        const changed = showChanges && prevRow != null && !Object.is(prevRow[j], v);
        const cls = [
          "alg-semiring__cell",
          i === j ? "alg-semiring__cell--diag" : "",
          pivot >= 0 && (i === pivot || j === pivot) ? "alg-semiring__cell--pivot" : "",
          changed ? "alg-semiring__cell--changed" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={`c${i}-${j}`} className={cls} title={changed ? "updated this round" : undefined}>
            {fmt(v)}
          </div>
        );
      })}
    </>
  );
}
