import { useEffect, useMemo, useState } from "react";
import PaceControls from "./PaceControls";
import "../../styles/algorithms.css";
import "../../styles/alg-iteration.css";

export type IterationProblem = "newton" | "bisection" | "fixed-point" | "secant";
export type IterationTarget = "sqrt2" | "root-of-cubic" | "cos-fixed-point";

type Props = {
  /** Method the panel opens on; the reader can switch. */
  problem?: IterationProblem;
  /** Baked-in function the panel opens on; the reader can switch. */
  target?: IterationTarget;
  caption?: string;
};

const MAXIT = 40;

/* ---------------------------------------------------------------- formatters */

function fmt(v: number | null, sig = 7): string {
  if (v === null || v === undefined || typeof v !== "number" || Number.isNaN(v)) return "—";
  if (!Number.isFinite(v)) return v > 0 ? "+∞" : "−∞";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-3) {
    const [m, e] = v.toExponential(3).split("e");
    return `${m}e${e.replace("+", "")}`;
  }
  return String(Number(v.toPrecision(sig)));
}

/* ------------------------------------------------------------------- targets */

type Spec = {
  key: IterationTarget;
  name: string;
  fText: string;
  dfText: string;
  gText: string;
  f(x: number): number;
  df(x: number): number;
  g(x: number): number;
  dg(x: number): number;
  root: number;
  rootText: string;
  fx: [number, number];
  fy: [number, number];
  gx: [number, number];
  start: [number, number];
  x0: number;
  x1: number;
  a: number;
  b: number;
  note: string;
};

/** Bisection to machine precision. Deterministic; runs once per target. */
function refine(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  let fa = f(a);
  if (fa === 0) return a;
  if (f(b) === 0) return b;
  if (fa * f(b) > 0) return (a + b) / 2;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (m === a || m === b) break;
    const fm = f(m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

const CUBIC = (x: number) => x * x * x - 2 * x - 5;
const COSROOT = (x: number) => Math.cos(x) - x;

const SPECS: Record<IterationTarget, Spec> = {
  sqrt2: {
    key: "sqrt2",
    name: "√2",
    fText: "f(x) = x² − 2",
    dfText: "f′(x) = 2x",
    gText: "g(x) = (x + 2)/(x + 1)",
    f: (x) => x * x - 2,
    df: (x) => 2 * x,
    g: (x) => (x + 2) / (x + 1),
    dg: (x) => -1 / ((x + 1) * (x + 1)),
    root: Math.SQRT2,
    rootText: "√2 = 1.414213562373",
    fx: [-2.2, 2.6],
    fy: [-2.6, 5.4],
    gx: [-2.2, 2.6],
    start: [-0.8, 2.6],
    x0: 1.2,
    x1: 2,
    a: 1,
    b: 2,
    note: "Two roots, ±√2. g is contracting at +√2 (|g′| = 0.1716) and repelling at −√2 (|g′| = 5.83), so the same map can converge or run away depending on where you start.",
  },
  "root-of-cubic": {
    key: "root-of-cubic",
    name: "the root of x³ − 2x − 5",
    fText: "f(x) = x³ − 2x − 5",
    dfText: "f′(x) = 3x² − 2",
    gText: "g(x) = (2x + 5)^(1/3)",
    f: CUBIC,
    df: (x) => 3 * x * x - 2,
    g: (x) => Math.cbrt(2 * x + 5),
    dg: (x) => 2 / 3 / Math.pow(2 * x + 5, 2 / 3),
    root: refine(CUBIC, 2, 3),
    rootText: "x* = 2.094551481542",
    fx: [0.4, 3.7],
    fy: [-8, 13],
    gx: [0.4, 3.7],
    start: [0.5, 3.2],
    x0: 2,
    x1: 3,
    a: 2,
    b: 3,
    note: "Wallis's cubic. f′ vanishes at x = ±0.8165, inside the slider range, so a start near 0.8165 throws the first step a long way out.",
  },
  "cos-fixed-point": {
    key: "cos-fixed-point",
    name: "the root of x = cos x",
    fText: "f(x) = cos x − x",
    dfText: "f′(x) = −sin x − 1",
    gText: "g(x) = cos x",
    f: COSROOT,
    df: (x) => -Math.sin(x) - 1,
    g: (x) => Math.cos(x),
    dg: (x) => -Math.sin(x),
    root: refine(COSROOT, 0, 1),
    rootText: "x* = 0.7390851332151",
    fx: [-0.4, 1.7],
    fy: [-1.8, 1.6],
    gx: [-1.1, 1.2],
    start: [0.2, 2.2],
    x0: 1,
    x1: 0.5,
    a: 0,
    b: 1,
    note: "The Dottie number. cos is a global contraction, so fixed-point iteration converges from every start — it just converges linearly, at rate |sin x*| = 0.6736.",
  },
};

/* ----------------------------------------------------- iteration runs */

type Run = {
  xs: number[];
  intervals: [number, number][];
  bad: string | null;
};

function runNewton(spec: Spec, x0: number): Run {
  const xs = [x0];
  let bad: string | null = null;
  let x = x0;
  for (let k = 0; k < MAXIT; k++) {
    const fx = spec.f(x);
    if (!Number.isFinite(fx)) {
      bad = `f(x_${k}) is not finite.`;
      break;
    }
    if (Math.abs(fx) < 1e-15) break;
    const d = spec.df(x);
    if (d === 0) {
      bad = `f′(x_${k}) = 0, so the tangent at x_${k} is horizontal and never meets the axis. Newton's map is undefined there.`;
      break;
    }
    const nx = x - fx / d;
    if (!Number.isFinite(nx)) {
      bad = `the step from x_${k} overflows: the tangent was very nearly horizontal.`;
      break;
    }
    xs.push(nx);
    x = nx;
  }
  return { xs, intervals: [], bad };
}

function runSecant(spec: Spec, x0: number, x1: number): Run {
  const xs = [x0, x1];
  let bad: string | null = null;
  for (let k = 1; k < MAXIT; k++) {
    const a = xs[k - 1];
    const b = xs[k];
    const fa = spec.f(a);
    const fb = spec.f(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
      bad = `f is not finite at x_${k - 1} or x_${k}.`;
      break;
    }
    if (Math.abs(fb) < 1e-15) break;
    const den = fb - fa;
    if (den === 0) {
      bad = `f(x_${k}) = f(x_${k - 1}), so the secant through the last two points is horizontal and there is no new crossing.`;
      break;
    }
    const nx = b - (fb * (b - a)) / den;
    if (!Number.isFinite(nx)) {
      bad = `the secant step from x_${k} overflows.`;
      break;
    }
    xs.push(nx);
    if (Math.abs(spec.f(nx)) < 1e-15) break;
  }
  return { xs, intervals: [], bad };
}

function runBisection(spec: Spec, a: number, b: number): Run {
  const fa = spec.f(a);
  const fb = spec.f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return { xs: [], intervals: [], bad: "f is not finite at one end of the bracket." };
  }
  if (fa * fb > 0) {
    return {
      xs: [],
      intervals: [],
      bad: `f(a) = ${fmt(fa)} and f(b) = ${fmt(fb)} have the same sign on [${fmt(a, 4)}, ${fmt(
        b,
        4
      )}]. There is no sign change to trap, so bisection cannot take a first step.`,
    };
  }
  const xs: number[] = [];
  const intervals: [number, number][] = [];
  let lo = a;
  let hi = b;
  let flo = fa;
  for (let k = 0; k < MAXIT; k++) {
    const m = (lo + hi) / 2;
    xs.push(m);
    intervals.push([lo, hi]);
    const fm = spec.f(m);
    if (fm === 0 || hi - lo < 2e-16) break;
    if (flo * fm < 0) hi = m;
    else {
      lo = m;
      flo = fm;
    }
  }
  return { xs, intervals, bad: null };
}

function runFixedPoint(spec: Spec, x0: number): Run {
  const xs = [x0];
  let bad: string | null = null;
  let x = x0;
  for (let k = 0; k < MAXIT; k++) {
    const gx = spec.g(x);
    if (!Number.isFinite(gx)) {
      bad = `g(x_${k}) is not finite — the map has a pole between x_${k} and its image.`;
      break;
    }
    if (Math.abs(gx - x) < 1e-16) break;
    xs.push(gx);
    x = gx;
    if (Math.abs(x) > 1e5) {
      bad = "the iterates are running away: |g′| exceeds 1 near this start, so the fixed point repels rather than attracts.";
      break;
    }
  }
  return { xs, intervals: [], bad };
}

/* -------------------------------------------------------------- geometry */

const W = 620;
const H = 320;
const PAD = { l: 48, r: 16, t: 18, b: 34 };

type Box = { x0: number; x1: number; y0: number; y1: number };

function clampBox(b: Box, base: Box): Box {
  const maxW = (base.x1 - base.x0) * 3;
  const maxH = (base.y1 - base.y0) * 3;
  let { x0, x1, y0, y1 } = b;
  if (x1 - x0 > maxW) {
    const c = (base.x0 + base.x1) / 2;
    x0 = Math.max(x0, c - maxW / 2);
    x1 = Math.min(x1, c + maxW / 2);
  }
  if (y1 - y0 > maxH) {
    const c = (base.y0 + base.y1) / 2;
    y0 = Math.max(y0, c - maxH / 2);
    y1 = Math.min(y1, c + maxH / 2);
  }
  return { x0, x1, y0, y1 };
}

/** Clip a segment given in data coordinates to a horizontal band. */
function segInsideY(
  p: [number, number],
  q: [number, number],
  y0: number,
  y1: number
): [[number, number], [number, number]] | null {
  const [ax, ay] = p;
  const [bx, by] = q;
  const inside = (y: number) => y >= y0 && y <= y1;
  if (inside(ay) && inside(by)) return [p, q];
  if ((ay < y0 && by < y0) || (ay > y1 && by > y1)) return null;
  const cut = (limit: number): [number, number] => {
    const t = (limit - ay) / (by - ay);
    return [ax + t * (bx - ax), limit];
  };
  const A: [number, number] = inside(ay) ? p : cut(ay < y0 ? y0 : y1);
  const B: [number, number] = inside(by) ? q : cut(by < y0 ? y0 : y1);
  return [A, B];
}

function ticks(lo: number, hi: number, count = 4): number[] {
  const span = hi - lo;
  if (!Number.isFinite(span) || span <= 0) return [];
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12 && out.length < 12; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

/* ------------------------------------------------------------------ component */

type Row = {
  n: number;
  x: number;
  fx: number;
  err: number | null;
  ratio: number | null;
  bracket: string;
};

const ORDER: Record<IterationProblem, { p: string; col: string; exp: number }> = {
  newton: { p: "2", col: "e_{n+1} / e_n²", exp: 2 },
  secant: { p: "1.618", col: "e_{n+1} / e_n^1.618", exp: 1.618 },
  bisection: { p: "1", col: "e_{n+1} / e_n", exp: 1 },
  "fixed-point": { p: "1", col: "e_{n+1} / e_n", exp: 1 },
};

const METHOD_LABEL: Record<IterationProblem, string> = {
  newton: "Newton",
  bisection: "Bisection",
  "fixed-point": "Fixed point",
  secant: "Secant",
};

const METHOD_KEYS: IterationProblem[] = ["newton", "bisection", "fixed-point", "secant"];

/**
 * A scalar iteration laboratory. Pick a method and a baked-in function, drag the
 * start (or the bracket), and step the iterates. The panel prints the residual,
 * the error against the true root, and the ratio that names the convergence
 * order, beside the geometry that makes each step: tangent, secant, bracket or
 * cobweb. Nothing moves until the reader moves it.
 */
export default function IterationLab({ problem = "newton", target = "sqrt2", caption }: Props) {
  const clipId = `alg-iter-clip-${problem}-${target}`.replace(/[^a-zA-Z0-9-]/g, "");

  const [method, setMethod] = useState<IterationProblem>(problem);
  const [tgt, setTgt] = useState<IterationTarget>(target);
  useEffect(() => setMethod(problem), [problem]);
  useEffect(() => setTgt(target), [target]);

  const spec = SPECS[tgt] ?? SPECS.sqrt2;

  const [x0, setX0] = useState(spec.x0);
  const [x1, setX1] = useState(spec.x1);
  const [brA, setBrA] = useState(spec.a);
  const [brB, setBrB] = useState(spec.b);
  useEffect(() => {
    const s = SPECS[tgt] ?? SPECS.sqrt2;
    setX0(s.x0);
    setX1(s.x1);
    setBrA(s.a);
    setBrB(s.b);
  }, [tgt]);

  const model = useMemo(() => {
    const run =
      method === "newton"
        ? runNewton(spec, x0)
        : method === "secant"
          ? runSecant(spec, x0, x1)
          : method === "bisection"
            ? runBisection(spec, brA, brB)
            : runFixedPoint(spec, x0);

    const errs = run.xs.map((x) => (Number.isFinite(x) ? Math.abs(x - spec.root) : null));
    const rows: Row[] = run.xs.map((x, n) => {
      const fx = Number.isFinite(x) ? spec.f(x) : NaN;
      const e = errs[n];
      const prev = n >= 1 ? errs[n - 1] : null;
      let ratio: number | null = null;
      if (e != null && prev != null && prev > 0 && Number.isFinite(e)) {
        ratio = e / Math.pow(prev, ORDER[method].exp);
      }
      const iv = run.intervals[n];
      return {
        n,
        x,
        fx,
        err: e,
        ratio,
        bracket: iv ? `[${fmt(iv[0], 5)}, ${fmt(iv[1], 5)}] width ${fmt(iv[1] - iv[0])}` : "",
      };
    });
    return { xs: run.xs, rows, intervals: run.intervals, bad: run.bad };
  }, [spec, method, x0, x1, brA, brB]);

  const count = Math.max(1, model.xs.length);
  const last = count - 1;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const current = Math.min(Math.max(idx, 0), last);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [model]);

  useEffect(() => {
    if (!playing) return;
    if (current >= last) {
      setPlaying(false);
      return;
    }
    const period = Math.max(220, 900 / Math.max(1, speed));
    const id = setInterval(() => setIdx((s) => (s >= last ? s : s + 1)), period);
    return () => clearInterval(id);
  }, [playing, speed, last, current]);

  const row = model.rows[current] ?? null;
  const prevErr = current >= 1 && model.rows[current - 1] ? model.rows[current - 1].err : null;

  const geom = useMemo<Box>(() => {
    const finite = model.xs.filter((v) => Number.isFinite(v));
    if (method === "fixed-point") {
      const base: Box = { x0: spec.gx[0], x1: spec.gx[1], y0: spec.gx[0], y1: spec.gx[1] };
      let lo = base.x0;
      let hi = base.x1;
      for (const v of finite) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      const pad = (hi - lo) * 0.08 + 1e-6;
      return clampBox({ x0: lo - pad, x1: hi + pad, y0: lo - pad, y1: hi + pad }, base);
    }
    const base: Box = { x0: spec.fx[0], x1: spec.fx[1], y0: spec.fy[0], y1: spec.fy[1] };
    let lo = base.x0;
    let hi = base.x1;
    for (const v of finite) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const pad = Math.max((hi - lo) * 0.08, 1e-3);
    return clampBox({ ...base, x0: lo - pad, x1: hi + pad }, base);
  }, [spec, method, model]);

  const gxw = W - PAD.l - PAD.r;
  const gyw = H - PAD.t - PAD.b;
  const sxRaw = (x: number) => PAD.l + ((x - geom.x0) / (geom.x1 - geom.x0)) * gxw;
  const syRaw = (y: number) => H - PAD.b - ((y - geom.y0) / (geom.y1 - geom.y0)) * gyw;
  const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const sxP = (x: number) => sxRaw(cl(x, geom.x0, geom.x1));
  const syP = (y: number) => syRaw(cl(y, geom.y0, geom.y1));
  const isOff = (x: number, y: number) => x < geom.x0 || x > geom.x1 || y < geom.y0 || y > geom.y1;

  const showG = method === "fixed-point";
  const plotF = (x: number) => (showG ? spec.g(x) : spec.f(x));
  const curvePts = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const x = geom.x0 + ((geom.x1 - geom.x0) * i) / 240;
      const y = plotF(x);
      if (!Number.isFinite(y)) continue;
      out.push(`${sxRaw(x).toFixed(1)},${syRaw(y).toFixed(1)}`);
    }
    return out.join(" ");
  }, [geom, spec, method]);

  const webPts = useMemo(() => {
    if (!showG) return "";
    const xs = model.xs.slice(0, current + 1).filter((v) => Number.isFinite(v));
    if (!xs.length) return "";
    const pts: string[] = [`${sxRaw(xs[0]).toFixed(1)},${syRaw(xs[0]).toFixed(1)}`];
    for (let k = 0; k + 1 < xs.length; k++) {
      pts.push(`${sxRaw(xs[k]).toFixed(1)},${syRaw(xs[k + 1]).toFixed(1)}`);
      pts.push(`${sxRaw(xs[k + 1]).toFixed(1)},${syRaw(xs[k + 1]).toFixed(1)}`);
    }
    return pts.join(" ");
  }, [model, current, showG]);

  const theoretical = useMemo(() => {
    const h = 1e-5;
    const f2 = (spec.f(spec.root + h) - 2 * spec.f(spec.root) + spec.f(spec.root - h)) / (h * h);
    const C = Math.abs(f2 / (2 * spec.df(spec.root)));
    if (method === "newton") return C;
    if (method === "bisection") return 0.5;
    if (method === "fixed-point") return Math.abs(spec.dg(spec.root));
    return Math.pow(C, 0.618);
  }, [spec, method]);

  const cur = row ? row.x : NaN;
  const curF = Number.isFinite(cur) ? spec.f(cur) : NaN;
  const anyOff = model.xs.some((x) => Number.isFinite(x) && isOff(x, plotF(x)));

  const startControls =
    method === "bisection" ? (
      <>
        <SliderRow label="a" value={brA} lo={spec.start[0]} hi={spec.start[1]} onChange={setBrA} aria="left end of the bisection bracket" />
        <SliderRow label="b" value={brB} lo={spec.start[0]} hi={spec.start[1]} onChange={setBrB} aria="right end of the bisection bracket" />
      </>
    ) : method === "secant" ? (
      <>
        <SliderRow label="x₀" value={x0} lo={spec.start[0]} hi={spec.start[1]} onChange={setX0} aria="first secant start" />
        <SliderRow label="x₁" value={x1} lo={spec.start[0]} hi={spec.start[1]} onChange={setX1} aria="second secant start" />
      </>
    ) : (
      <SliderRow label="x₀" value={x0} lo={spec.start[0]} hi={spec.start[1]} onChange={setX0} aria="starting point" />
    );

  return (
    <div className="alg-iter">
      <div className="alg-iter__group" role="group" aria-label="Iteration method">
        <span className="alg-iter__glabel">method</span>
        {METHOD_KEYS.map((m) => (
          <button key={m} type="button" className="alg-btn" aria-pressed={method === m} onClick={() => setMethod(m)}>
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="alg-iter__group" role="group" aria-label="Function">
        <span className="alg-iter__glabel">function</span>
        {(Object.keys(SPECS) as IterationTarget[]).map((t) => (
          <button key={t} type="button" className="alg-btn" aria-pressed={tgt === t} onClick={() => setTgt(t)}>
            {SPECS[t].name}
          </button>
        ))}
      </div>

      <p className="alg-iter__defn">
        <b>{spec.fText}</b> · {spec.dfText} · <b>{spec.gText}</b> · true root {spec.rootText}
      </p>

      <div className="alg-iter__starts" role="group" aria-label="Starting data">
        {startControls}
      </div>

      <div className="alg-iter__bar">
        <PaceControls
          index={current}
          count={count}
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
        <span className="alg-iter__count">
          {METHOD_LABEL[method]} step <b>{current}</b> / {last}
          {model.bad == null && current === last ? " · stopped at the precision limit" : ""}
        </span>
      </div>

      {model.bad != null && <p className="alg-iter__warn">{model.bad}</p>}

      <div className="alg-iter__readout" aria-live="polite">
        <div className="alg-iter__cell">
          <span className="alg-iter__k">{`x_${current}`}</span>
          <span className="alg-iter__v alg-mono">{fmt(cur)}</span>
        </div>
        <div className="alg-iter__cell">
          <span className="alg-iter__k">{`residual |f(x_${current})|`}</span>
          <span className="alg-iter__v alg-mono">{fmt(Number.isFinite(curF) ? Math.abs(curF) : null)}</span>
        </div>
        <div className="alg-iter__cell">
          <span className="alg-iter__k">{`previous error e_${Math.max(current - 1, 0)}`}</span>
          <span className="alg-iter__v alg-mono">{fmt(prevErr)}</span>
        </div>
        <div className="alg-iter__cell">
          <span className="alg-iter__k">{`error e_${current} = |x_${current} − x*|`}</span>
          <span className="alg-iter__v alg-mono">{fmt(row ? row.err : null)}</span>
        </div>
        <div className="alg-iter__cell">
          <span className="alg-iter__k">{ORDER[method].col}</span>
          <span className="alg-iter__v alg-mono">{current >= 1 ? fmt(row ? row.ratio : null) : "—"}</span>
        </div>
        <div className="alg-iter__cell">
          <span className="alg-iter__k">constant the theory predicts</span>
          <span className="alg-iter__v alg-mono">{fmt(Number(theoretical.toPrecision(5)))}</span>
        </div>
      </div>

      <svg
        className="alg-iter__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Geometry of ${METHOD_LABEL[method]} on ${spec.fText}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.l} y={PAD.t} width={gxw} height={gyw} />
          </clipPath>
        </defs>

        {ticks(geom.x0, geom.x1).map((t) => (
          <g key={`tx${t}`}>
            <line className="alg-iter__grid" x1={sxRaw(t)} x2={sxRaw(t)} y1={PAD.t} y2={H - PAD.b} />
            <text className="alg-iter__tick" x={sxRaw(t)} y={H - PAD.b + 14} textAnchor="middle">
              {fmt(t, 4)}
            </text>
          </g>
        ))}
        {ticks(geom.y0, geom.y1).map((t) => (
          <g key={`ty${t}`}>
            <line className="alg-iter__grid" x1={PAD.l} x2={W - PAD.r} y1={syRaw(t)} y2={syRaw(t)} />
            <text className="alg-iter__tick" x={PAD.l - 6} y={syRaw(t) + 3} textAnchor="end">
              {fmt(t, 4)}
            </text>
          </g>
        ))}
        <line className="alg-iter__axis" x1={PAD.l} x2={W - PAD.r} y1={syP(0)} y2={syP(0)} />
        <line className="alg-iter__axis" x1={sxP(0)} x2={sxP(0)} y1={PAD.t} y2={H - PAD.b} />

        <g clipPath={`url(#${clipId})`}>
          {showG && (
            <polyline
              className="alg-iter__diag"
              points={`${sxRaw(geom.x0)},${syRaw(geom.x0)} ${sxRaw(geom.x1)},${syRaw(geom.x1)}`}
            />
          )}
          <polyline className="alg-iter__curve" points={curvePts} />

          {!showG && (
            <line className="alg-iter__rootline" x1={sxRaw(spec.root)} x2={sxRaw(spec.root)} y1={PAD.t} y2={H - PAD.b} />
          )}

          {method === "bisection" &&
            model.intervals.slice(0, current + 1).map(([lo, hi], k) => (
              <rect
                key={k}
                className={`alg-iter__bracket${k === current ? " alg-iter__bracket--cur" : ""}`}
                x={sxRaw(lo)}
                y={PAD.t + 4}
                width={Math.max(1.5, sxRaw(hi) - sxRaw(lo))}
                height={gyw - 8}
              />
            ))}

          {method === "newton" && Number.isFinite(cur) && Number.isFinite(curF) && (
            <TangentSegment fy={curF} slope={spec.df(cur)} at={cur} geom={geom} sx={sxRaw} sy={syRaw} />
          )}

          {method === "secant" && current >= 1 && Number.isFinite(model.xs[current - 1]) && Number.isFinite(cur) && (
            <SecantSegment xa={model.xs[current - 1]} xb={cur} f={spec.f} geom={geom} sx={sxRaw} sy={syRaw} />
          )}

          {webPts && <polyline className="alg-iter__web" points={webPts} />}

          {model.xs.slice(0, current + 1).map((x, k) => {
            if (!Number.isFinite(x)) return null;
            const y = plotF(x);
            const now = k === current;
            return (
              <g key={k}>
                <circle
                  className={`alg-iter__pt${now ? " alg-iter__pt--now" : ""}`}
                  cx={showG ? sxP(x) : sxP(x)}
                  cy={showG ? syP(x) : syP(y)}
                  r={now ? 4.6 : 3}
                />
                {showG && Number.isFinite(y) && (
                  <circle className="alg-iter__img" cx={sxP(x)} cy={syP(y)} r={now ? 4.6 : 3} />
                )}
                {now && (
                  <circle
                    className="alg-iter__ring"
                    cx={sxP(x)}
                    cy={showG ? syP(x) : syP(y)}
                    r={11}
                  />
                )}
              </g>
            );
          })}
        </g>
        <text className="alg-iter__axislabel" x={W - PAD.r} y={H - 5} textAnchor="end">
          x
        </text>
        <text className="alg-iter__axislabel" x={PAD.l - 6} y={PAD.t - 5} textAnchor="end">
          {showG ? "g" : "f"}
        </text>
      </svg>

      {anyOff && (
        <p className="alg-iter__off">
          At least one iterate falls outside the plotted window; those points are pinned to the edge of the box. The
          numbers in the table are unaffected.
        </p>
      )}

      <div className="alg-iter__tablewrap">
        <table className="alg-iter__table">
          <caption className="visually-hidden">{`${METHOD_LABEL[method]} iterates for ${spec.fText}`}</caption>
          <thead>
            <tr>
              <th scope="col">n</th>
              <th scope="col">x_n</th>
              <th scope="col">f(x_n)</th>
              <th scope="col">e_n</th>
              <th scope="col">{ORDER[method].col}</th>
              {method === "bisection" && <th scope="col">bracket, width</th>}
            </tr>
          </thead>
          <tbody>
            {model.rows.slice(0, current + 1).map((r) => (
              <tr key={r.n} className={r.n === current ? "alg-iter__row--now" : undefined}>
                <td>{r.n}</td>
                <td className="alg-mono">{fmt(r.x)}</td>
                <td className="alg-mono">{fmt(Number.isFinite(r.fx) ? r.fx : null)}</td>
                <td className="alg-mono">{fmt(r.err)}</td>
                <td className="alg-mono">{r.ratio == null ? "—" : fmt(r.ratio, 4)}</td>
                {method === "bisection" && <td className="alg-mono alg-iter__notecell">{r.bracket}</td>}
              </tr>
            ))}
            {model.rows.length === 0 && (
              <tr>
                <td colSpan={6}>No iterates — the bracket holds no sign change.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="alg-iter__order">
        Order of convergence <b>p = {ORDER[method].p}</b>. The ratio column settles on a constant exactly when p is the
        right order; here that constant is {fmt(Number(theoretical.toPrecision(5)))}. A ratio that keeps drifting means
        the step is not yet in the asymptotic regime.
      </p>
      <p className="alg-iter__note">{spec.note}</p>

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- sub-pieces */

type Geom = { x0: number; x1: number; y0: number; y1: number };

function TangentSegment({
  fy,
  slope,
  at,
  geom,
  sx,
  sy,
}: {
  fy: number;
  slope: number;
  at: number;
  geom: Geom;
  sx: (x: number) => number;
  sy: (y: number) => number;
}) {
  if (!Number.isFinite(slope)) return null;
  const p: [number, number] = [geom.x0, fy + slope * (geom.x0 - at)];
  const q: [number, number] = [geom.x1, fy + slope * (geom.x1 - at)];
  const seg = segInsideY(p, q, geom.y0, geom.y1);
  if (!seg) return null;
  return (
    <g>
      <line className="alg-iter__tangent" x1={sx(seg[0][0])} y1={sy(seg[0][1])} x2={sx(seg[1][0])} y2={sy(seg[1][1])} />
      <line className="alg-iter__drop" x1={sx(at)} y1={sy(fy)} x2={sx(at)} y2={sy(0)} />
    </g>
  );
}

function SecantSegment({
  xa,
  xb,
  f,
  geom,
  sx,
  sy,
}: {
  xa: number;
  xb: number;
  f: (x: number) => number;
  geom: Geom;
  sx: (x: number) => number;
  sy: (y: number) => number;
}) {
  if (xb === xa) return null;
  const fa = f(xa);
  const slope = (f(xb) - fa) / (xb - xa);
  if (!Number.isFinite(slope)) return null;
  const p: [number, number] = [geom.x0, fa + slope * (geom.x0 - xa)];
  const q: [number, number] = [geom.x1, fa + slope * (geom.x1 - xa)];
  const seg = segInsideY(p, q, geom.y0, geom.y1);
  if (!seg) return null;
  return (
    <line className="alg-iter__secant" x1={sx(seg[0][0])} y1={sy(seg[0][1])} x2={sx(seg[1][0])} y2={sy(seg[1][1])} />
  );
}

function SliderRow({
  label,
  value,
  lo,
  hi,
  onChange,
  aria,
}: {
  label: string;
  value: number;
  lo: number;
  hi: number;
  onChange: (v: number) => void;
  aria: string;
}) {
  return (
    <label className="alg-iter__slider">
      <span>
        {label} = <b className="alg-mono">{value.toFixed(2)}</b>
      </span>
      <input
        type="range"
        min={lo}
        max={hi}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={aria}
      />
    </label>
  );
}
