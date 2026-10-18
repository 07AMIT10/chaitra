import { useEffect, useId, useMemo, useState } from "react";
import PaceControls from "./PaceControls";
import "../../styles/algorithms.css";

export type DpProblem = "edit-distance" | "lcs" | "coin-change" | "knapsack" | "lis";

type RC = { r: number; c: number };

type Model = {
  rows: number;
  cols: number;
  rowHeaders: string[];
  colHeaders: string[];
  values: number[][];
  preds: RC[][][];
  formulas: string[][];
  order: RC[];
  corner: string;
  axisRows: string;
  axisCols: string;
  recurrence: string;
  title: string;
  answer: { value: number; cell: RC; label: string };
  trace: RC[];
  note?: string;
};

type Props = {
  problem: DpProblem;
  a?: string;
  b?: string;
  coins?: number[];
  amount?: number;
  items?: { name: string; w: number; v: number }[];
  capacity?: number;
  sequence?: number[];
  caption?: string;
  height?: number;
};

function grid<T>(rows: number, cols: number, f: (r: number, c: number) => T): T[][] {
  const out: T[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: T[] = [];
    for (let c = 0; c < cols; c++) row.push(f(r, c));
    out.push(row);
  }
  return out;
}
function grid3(rows: number, cols: number): RC[][][] {
  return grid(rows, cols, () => [] as RC[]);
}
function rowMajor(rows: number, cols: number): RC[] {
  const out: RC[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ r, c });
  return out;
}
function fmtVal(v: number): string {
  if (v === Infinity) return "∞";
  if (v === -Infinity) return "−∞";
  if (Number.isNaN(v)) return "·";
  return String(v);
}
function traceFrom(preds: RC[][][], start: RC): RC[] {
  const out: RC[] = [start];
  let cur = start;
  let guard = 0;
  while (guard++ < 4096) {
    const p = preds[cur.r][cur.c][0];
    if (!p) break;
    out.push(p);
    cur = p;
  }
  return out;
}

function buildEditDistance(a: string, b: string): Model {
  const m = a.length;
  const n = b.length;
  const rows = m + 1;
  const cols = n + 1;
  const values = grid(rows, cols, () => 0);
  const preds = grid3(rows, cols);
  const formulas = grid(rows, cols, () => "");
  const rowHeaders = ["\u03b5", ...Array.from(a)];
  const colHeaders = ["\u03b5", ...Array.from(b)];
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0 && j === 0) {
        formulas[i][j] = "dp[0][0] = 0  (empty string \u2194 empty string)";
      } else if (i === 0) {
        values[i][j] = j;
        preds[i][j] = [{ r: 0, c: j - 1 }];
        formulas[i][j] = `dp[0][${j}] = ${j}  (insert ${j} character${j === 1 ? "" : "s"})`;
      } else if (j === 0) {
        values[i][j] = i;
        preds[i][j] = [{ r: i - 1, c: 0 }];
        formulas[i][j] = `dp[${i}][0] = ${i}  (delete ${i} character${i === 1 ? "" : "s"})`;
      } else if (a[i - 1] === b[j - 1]) {
        values[i][j] = values[i - 1][j - 1];
        preds[i][j] = [{ r: i - 1, c: j - 1 }];
        formulas[i][j] = `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${values[i][j]}  (a[${i}]="${a[i - 1]}" = b[${j}]="${b[j - 1]}": match, no cost)`;
      } else {
        const del = values[i - 1][j] + 1;
        const ins = values[i][j - 1] + 1;
        const sub = values[i - 1][j - 1] + 1;
        const best = Math.min(del, ins, sub);
        values[i][j] = best;
        const ps: RC[] = [];
        if (sub === best) ps.push({ r: i - 1, c: j - 1 });
        if (del === best) ps.push({ r: i - 1, c: j });
        if (ins === best) ps.push({ r: i, c: j - 1 });
        preds[i][j] = ps;
        formulas[i][j] = `dp[${i}][${j}] = 1 + min(delete ${values[i - 1][j]}, insert ${values[i][j - 1]}, substitute ${values[i - 1][j - 1]}) = ${best}  (a[${i}]="${a[i - 1]}" \u2260 b[${j}]="${b[j - 1]}")`;
      }
    }
  }
  const cell = { r: m, c: n };
  return {
    rows,
    cols,
    rowHeaders,
    colHeaders,
    values,
    preds,
    formulas,
    order: rowMajor(rows, cols),
    corner: "a \\ b",
    axisRows: "a",
    axisCols: "b",
    recurrence:
      "dp[i][j] = dp[i\u22121][j\u22121] if a[i]=b[j], else 1 + min( dp[i\u22121][j] (delete), dp[i][j\u22121] (insert), dp[i\u22121][j\u22121] (substitute) ).",
    title: `Levenshtein edit distance of "${a}" and "${b}"`,
    answer: { value: values[m][n], cell, label: `editDistance("${a}", "${b}")` },
    trace: traceFrom(preds, cell),
  };
}

function buildLcs(a: string, b: string): Model {
  const m = a.length;
  const n = b.length;
  const rows = m + 1;
  const cols = n + 1;
  const values = grid(rows, cols, () => 0);
  const preds = grid3(rows, cols);
  const formulas = grid(rows, cols, () => "");
  const rowHeaders = ["\u03b5", ...Array.from(a)];
  const colHeaders = ["\u03b5", ...Array.from(b)];
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0 || j === 0) {
        values[i][j] = 0;
        formulas[i][j] = `dp[${i}][${j}] = 0  (one prefix empty, nothing to match)`;
      } else if (a[i - 1] === b[j - 1]) {
        values[i][j] = values[i - 1][j - 1] + 1;
        preds[i][j] = [{ r: i - 1, c: j - 1 }];
        formulas[i][j] = `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${values[i][j]}  (a[${i}]="${a[i - 1]}" = b[${j}]="${b[j - 1]}": extend the common subsequence)`;
      } else {
        const up = values[i - 1][j];
        const left = values[i][j - 1];
        const best = Math.max(up, left);
        values[i][j] = best;
        const ps: RC[] = [];
        if (up === best) ps.push({ r: i - 1, c: j });
        if (left === best) ps.push({ r: i, c: j - 1 });
        preds[i][j] = ps;
        formulas[i][j] = `dp[${i}][${j}] = max(dp[${i - 1}][${j}] = ${up}, dp[${i}][${j - 1}] = ${left}) = ${best}  (a[${i}]="${a[i - 1]}" \u2260 b[${j}]="${b[j - 1]}")`;
      }
    }
  }
  const cell = { r: m, c: n };
  return {
    rows,
    cols,
    rowHeaders,
    colHeaders,
    values,
    preds,
    formulas,
    order: rowMajor(rows, cols),
    corner: "a \\ b",
    axisRows: "a",
    axisCols: "b",
    recurrence:
      "dp[i][j] = dp[i\u22121][j\u22121] + 1 if a[i]=b[j], else max( dp[i\u22121][j], dp[i][j\u22121] ).",
    title: `Longest common subsequence of "${a}" and "${b}"`,
    answer: { value: values[m][n], cell, label: `LCS("${a}", "${b}")` },
    trace: traceFrom(preds, cell),
  };
}

function buildCoinChange(coins: number[], amount: number): Model {
  const rows = coins.length + 1;
  const cols = amount + 1;
  const values = grid(rows, cols, () => 0);
  const preds = grid3(rows, cols);
  const formulas = grid(rows, cols, () => "");
  const rowHeaders = ["none", ...coins.map((c) => `\u2264 ${c}`)];
  const colHeaders = Array.from({ length: cols }, (_, j) => String(j));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (i === 0 && j === 0) {
        values[i][j] = 0;
        formulas[i][j] = "dp[0][0] = 0  (amount 0 needs no coins)";
      } else if (i === 0) {
        values[i][j] = Infinity;
        formulas[i][j] = `dp[0][${j}] = \u221e  (no coin types: amount ${j} is unreachable)`;
      } else {
        const coin = coins[i - 1];
        const skip = values[i - 1][j];
        const use = j >= coin ? values[i][j - coin] + 1 : Infinity;
        const best = Math.min(skip, use);
        values[i][j] = best;
        const ps: RC[] = [];
        if (use === best && Number.isFinite(use)) ps.push({ r: i, c: j - coin });
        if (skip === best) ps.push({ r: i - 1, c: j });
        preds[i][j] = ps;
        formulas[i][j] = `dp[${i}][${j}] = min(skip dp[${i - 1}][${j}]=${fmtVal(skip)}, ${j >= coin ? `use coin ${coin}: dp[${i}][${j - coin}]+1=${fmtVal(use)}` : `coin ${coin} too big`}) = ${fmtVal(best)}`;
      }
    }
  }
  const cell = { r: coins.length, c: amount };
  return {
    rows,
    cols,
    rowHeaders,
    colHeaders,
    values,
    preds,
    formulas,
    order: rowMajor(rows, cols),
    corner: "coins \\ amount",
    axisRows: "coin types",
    axisCols: "amount",
    recurrence:
      "dp[i][j] = min( dp[i\u22121][j] (do not use coin i), dp[i][j\u2212c\u1d62] + 1 (use coin i again) ).",
    title: `Fewest coins making ${amount} from [${coins.join(", ")}]`,
    answer: {
      value: values[coins.length][amount],
      cell,
      label: `min coins for ${amount}`,
    },
    trace: traceFrom(preds, cell),
    note: Number.isFinite(values[coins.length][amount]) ? undefined : "amount is not representable with these coins",
  };
}

function buildKnapsack(items: { name: string; w: number; v: number }[], capacity: number): Model {
  const rows = items.length + 1;
  const cols = capacity + 1;
  const values = grid(rows, cols, () => 0);
  const preds = grid3(rows, cols);
  const formulas = grid(rows, cols, () => "");
  const rowHeaders = ["none", ...items.map((it) => `${it.name}`)];
  const colHeaders = Array.from({ length: cols }, (_, j) => String(j));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (i === 0) {
        values[i][j] = 0;
        formulas[i][j] = `dp[0][${j}] = 0  (no items, value 0)`;
      } else {
        const it = items[i - 1];
        const skip = values[i - 1][j];
        const take = j >= it.w ? values[i - 1][j - it.w] + it.v : -Infinity;
        const best = Math.max(skip, take);
        values[i][j] = best;
        const ps: RC[] = [];
        if (take === best && Number.isFinite(take)) ps.push({ r: i - 1, c: j - it.w });
        if (skip === best) ps.push({ r: i - 1, c: j });
        preds[i][j] = ps;
        formulas[i][j] = `dp[${i}][${j}] = max(skip dp[${i - 1}][${j}]=${fmtVal(skip)}, ${j >= it.w ? `take ${it.name} (w ${it.w}, v ${it.v}): dp[${i - 1}][${j - it.w}]+${it.v}=${fmtVal(take)}` : `${it.name} does not fit`}) = ${fmtVal(best)}`;
      }
    }
  }
  const cell = { r: items.length, c: capacity };
  return {
    rows,
    cols,
    rowHeaders,
    colHeaders,
    values,
    preds,
    formulas,
    order: rowMajor(rows, cols),
    corner: "items \\ capacity",
    axisRows: "items",
    axisCols: "capacity",
    recurrence:
      "dp[i][j] = max( dp[i\u22121][j] (skip item i), dp[i\u22121][j\u2212w\u1d62] + v\u1d62 (take item i) ).",
    title: `0/1 knapsack, capacity ${capacity}`,
    answer: { value: values[items.length][capacity], cell, label: `best value at capacity ${capacity}` },
    trace: traceFrom(preds, cell),
  };
}

function buildLis(sequence: number[]): Model {
  const n = sequence.length;
  const rows = 1;
  const cols = n;
  const values = grid(rows, cols, () => 1);
  const preds = grid3(rows, cols);
  const formulas = grid(rows, cols, () => "");
  const rowHeaders = ["LIS\u2091\u2099\u2094"];
  const colHeaders = sequence.map((v) => String(v));
  for (let i = 0; i < n; i++) {
    let best = 0;
    const ps: RC[] = [];
    for (let j = 0; j < i; j++) {
      if (sequence[j] < sequence[i]) {
        if (values[0][j] > best) {
          best = values[0][j];
          ps.length = 0;
          ps.push({ r: 0, c: j });
        } else if (values[0][j] === best) {
          ps.push({ r: 0, c: j });
        }
      }
    }
    values[0][i] = best + 1;
    preds[0][i] = ps;
    if (ps.length === 0) {
      formulas[0][i] = `dp[${i}] = 1  (no earlier value below ${sequence[i]}, so the run starts here)`;
    } else {
      formulas[0][i] = `dp[${i}] = 1 + max(dp[j] : j < ${i}, seq[j] < ${sequence[i]}) = 1 + ${best} = ${values[0][i]}  (best predecessor${ps.length > 1 ? "s" : ""}: ${ps.map((p) => `dp[${p.c}]=${values[0][p.c]}`).join(", ")})`;
    }
  }
  let bestIdx = 0;
  for (let i = 1; i < n; i++) if (values[0][i] > values[0][bestIdx]) bestIdx = i;
  const cell = { r: 0, c: bestIdx };
  return {
    rows,
    cols,
    rowHeaders,
    colHeaders,
    values,
    preds,
    formulas,
    order: rowMajor(rows, cols),
    corner: "i \\ value",
    axisRows: "dp",
    axisCols: "sequence value",
    recurrence:
      "dp[i] = 1 + max{ dp[j] : j < i and seq[j] < seq[i] }, and dp[i] = 1 when that set is empty.",
    title: "Longest strictly increasing subsequence (length ending at each position)",
    answer: { value: n ? values[0][bestIdx] : 0, cell, label: "LIS length" },
    trace: n ? traceFrom(preds, cell) : [],
  };
}

function buildModel(props: Props): Model | null {
  if (props.problem === "edit-distance") return buildEditDistance(props.a ?? "", props.b ?? "");
  if (props.problem === "lcs") return buildLcs(props.a ?? "", props.b ?? "");
  if (props.problem === "coin-change") return buildCoinChange(props.coins ?? [], props.amount ?? 0);
  if (props.problem === "knapsack") return buildKnapsack(props.items ?? [], props.capacity ?? 0);
  if (props.problem === "lis") return buildLis(props.sequence ?? []);
  return null;
}

/** A DP table with the recurrence made visible: hover a cell, or step the fill. */
export default function DPHeatmap({
  problem,
  a,
  b,
  coins,
  amount,
  items,
  capacity,
  sequence,
  caption,
  height = 320,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const model = useMemo(
    () => buildModel({ problem, a, b, coins, amount, items, capacity, sequence }),
    [problem, a, b, coins, amount, items, capacity, sequence]
  );

  const order = model?.order ?? [];
  const count = Math.max(1, order.length + 1);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hover, setHover] = useState<RC | null>(null);
  const [sel, setSel] = useState<RC | null>(null);
  const [trace, setTrace] = useState(false);
  const last = count - 1;
  const current = Math.min(Math.max(step, 0), last);

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
    const period = Math.max(120, 800 / Math.max(1, speed));
    const id = setInterval(() => setStep((s) => (s >= last ? s : s + 1)), period);
    return () => clearInterval(id);
  }, [playing, speed, last, current]);

  const ordIdx = useMemo(() => {
    const m = new Map<string, number>();
    order.forEach((rc, i) => m.set(`${rc.r},${rc.c}`, i));
    return m;
  }, [order]);

  const traceSet = useMemo(() => {
    const s = new Set<string>();
    model?.trace.forEach((rc) => s.add(`${rc.r},${rc.c}`));
    return s;
  }, [model]);

  if (!model) {
    return (
      <div className="alg-dp">
        <p className="alg-caption">Unknown DP problem.</p>
      </div>
    );
  }

  const active = hover ?? sel;
  const currentCell = current > 0 ? order[current - 1] : null;

  // geometry
  const maxRowLen = Math.max(1, ...model.rowHeaders.map((s) => s.length));
  const maxColLen = Math.max(1, ...model.colHeaders.map((s) => s.length));
  const cw = Math.max(34, Math.min(54, maxColLen * 9 + 18));
  const ch = Math.max(
    22,
    Math.min(38, Math.floor((height - 44) / Math.max(1, model.rows + 1)))
  );
  const leftW = Math.max(52, maxRowLen * 8 + 16);
  // The centred column-axis label sits at y=12; keep the header baseline
  // (topH-8) far enough below it that the two glyph boxes never overlap.
  const topH = 38;
  const W = leftW + model.cols * cw + 6;
  const H = topH + model.rows * ch + 6;
  const cx = (c: number) => leftW + c * cw + cw / 2;
  const cy = (r: number) => topH + r * ch + ch / 2;

  let vmin = Infinity;
  let vmax = -Infinity;
  for (const row of model.values) {
    for (const v of row) {
      if (Number.isFinite(v)) {
        if (v < vmin) vmin = v;
        if (v > vmax) vmax = v;
      }
    }
  }
  if (!Number.isFinite(vmin)) vmin = 0;
  if (!Number.isFinite(vmax)) vmax = vmin;
  const span = vmax - vmin || 1;
  const heat = (v: number) => {
    if (v === Infinity || v === -Infinity) return Infinity;
    return (v - vmin) / span;
  };

  const isPred = (rc: RC) => {
    if (!active) return false;
    return model.preds[active.r][active.c].some((p) => p.r === rc.r && p.c === rc.c);
  };

  const arrows: { x1: number; y1: number; x2: number; y2: number; cls: string }[] = [];
  if (active) {
    for (const p of model.preds[active.r][active.c]) {
      arrows.push({
        x1: cx(active.c),
        y1: cy(active.r),
        x2: cx(p.c),
        y2: cy(p.r),
        cls: "alg-dp__arrow--pred",
      });
    }
  }
  if (trace) {
    for (let r = 0; r < model.rows; r++) {
      for (let c = 0; c < model.cols; c++) {
        const filled = (ordIdx.get(`${r},${c}`) ?? 0) < current;
        if (!filled) continue;
        const p = model.preds[r][c][0];
        if (!p) continue;
        arrows.push({ x1: cx(c), y1: cy(r), x2: cx(p.c), y2: cy(p.r), cls: "alg-dp__arrow--trace" });
      }
    }
  }

  const activeFormula = active ? model.formulas[active.r][active.c] : null;

  return (
    <div className="alg-dp">
      <div className="alg-dp__bar">
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
        <button
          type="button"
          className="alg-btn"
          aria-pressed={trace}
          onClick={() => setTrace((t) => !t)}
        >
          {trace ? "Hide back-pointers" : "Trace solution"}
        </button>
        <span className="alg-dp__count">
          filled {current} / {order.length} cells
        </span>
      </div>

      <svg
        className="alg-dp__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${model.title}: DP table heatmap`}
      >
        <defs>
          <marker
            id={`${uid}-arrow`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L10,5 L0,9 z" fill="context-stroke" />
          </marker>
        </defs>

        <text className="alg-dp__axis" x={leftW + (model.cols * cw) / 2} y={12} textAnchor="middle">
          {model.axisCols}
        </text>
        <text
          className="alg-dp__axis"
          x={12}
          y={topH + (model.rows * ch) / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${topH + (model.rows * ch) / 2})`}
        >
          {model.axisRows}
        </text>

        {model.colHeaders.map((h, c) => (
          <text key={`ch${c}`} className="alg-dp__head" x={cx(c)} y={topH - 8} textAnchor="middle">
            {h}
          </text>
        ))}
        {model.rowHeaders.map((h, r) => (
          <text key={`rh${r}`} className="alg-dp__head" x={leftW - 8} y={cy(r) + 4} textAnchor="end">
            {h}
          </text>
        ))}

        {model.values.map((row, r) =>
          row.map((v, c) => {
            const filled = (ordIdx.get(`${r},${c}`) ?? 0) < current;
            const t = heat(v);
            const unreachable = !Number.isFinite(t);
            const isCur = currentCell != null && currentCell.r === r && currentCell.c === c;
            const onSolution = traceSet.has(`${r},${c}`);
            const cls = [
              "alg-dp__cell",
              filled ? "alg-dp__cell--filled" : "alg-dp__cell--empty",
              unreachable ? "alg-dp__cell--inf" : "",
              isCur ? "alg-dp__cell--cur" : "",
              onSolution && trace ? "alg-dp__cell--sol" : "",
              isPred({ r, c }) ? "alg-dp__cell--pred" : "",
              active && active.r === r && active.c === c ? "alg-dp__cell--active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const opacity = !filled
              ? 0
              : unreachable
                ? 0.32
                : 0.1 + Math.max(0, Math.min(1, t)) * 0.68;
            return (
              <g
                key={`c${r}-${c}`}
                className={cls}
                role="button"
                tabIndex={0}
                aria-label={`cell row ${r} column ${c} value ${fmtVal(v)}`}
                onMouseEnter={() => setHover({ r, c })}
                onMouseLeave={() => setHover((h) => (h && h.r === r && h.c === c ? null : h))}
                onClick={() => setSel({ r, c })}
                onFocus={() => setHover({ r, c })}
                onBlur={() => setHover((h) => (h && h.r === r && h.c === c ? null : h))}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") setSel({ r, c });
                }}
              >
                <rect
                  x={leftW + c * cw + 1}
                  y={topH + r * ch + 1}
                  width={cw - 2}
                  height={ch - 2}
                  rx={3}
                  fill={unreachable ? "var(--color-error)" : "var(--alg-accent)"}
                  fillOpacity={opacity}
                />
                <rect
                  className="alg-dp__border"
                  x={leftW + c * cw + 1}
                  y={topH + r * ch + 1}
                  width={cw - 2}
                  height={ch - 2}
                  rx={3}
                />
                <text
                  className="alg-dp__val"
                  x={cx(c)}
                  y={cy(r) + 4}
                  textAnchor="middle"
                  opacity={filled ? 1 : 0.28}
                >
                  {fmtVal(v)}
                </text>
              </g>
            );
          })
        )}

        {arrows.map((ar, i) => (
          <line
            key={`ar${i}`}
            className={`alg-dp__arrow ${ar.cls}`}
            x1={ar.x1}
            y1={ar.y1}
            x2={ar.x2}
            y2={ar.y2}
            markerEnd={`url(#${uid}-arrow)`}
          />
        ))}
      </svg>

      <p className="alg-dp__formula" aria-live="polite">
        {activeFormula != null ? (
          <>
            <span className="alg-dp__formula-tag">
              {active!.r === 0 && problem === "lis" ? `dp[${active!.c}]` : `dp[${active!.r}][${active!.c}]`}
            </span>{" "}
            {activeFormula}
          </>
        ) : (
          <>Hover or click a cell: its predecessor cells light up and the exact recurrence that filled it appears here. Or press play to walk the fill order({model.order.length} cells in dependency order).</>
        )}
      </p>

      <div className="alg-dp__readout">
        <span>
          {model.answer.label} = <b>{fmtVal(model.answer.value)}</b>
        </span>
        {model.note != null && <span className="alg-dp__warn">{model.note}</span>}
        {trace && <span className="alg-dp__sol">solution traced back through argmin/argmax predecessors</span>}
      </div>

      <p className="alg-caption">{model.recurrence}</p>
      <p className="alg-caption">{model.title}.</p>
      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
