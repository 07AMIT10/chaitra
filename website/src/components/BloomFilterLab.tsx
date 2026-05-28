import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  bitArraySize,
  falsePositiveRate,
  fillRatio,
  hashCountFromSizing,
  optimalK,
} from "../lib/bloom-math";
import {
  bloomMaybeContains,
  buildBitArray,
  DEMO_ABSENT,
  DEMO_PRESENT,
} from "../lib/bloom-sim";
import "./BloomFilterLab.css";

type ControlMode = "goal" | "manual";

const BIT_OFF = "#2a3544";
const BIT_ON = "#3d9eff";
const BIT_PROBE = "#ffb86b";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function BloomFilterLab() {
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<ControlMode>("manual");
  const [goalItems, setGoalItems] = useState(20);
  const [goalFp, setGoalFp] = useState(0.05);

  const [m, setM] = useState(40);
  const [k, setK] = useState(2);
  const [keys, setKeys] = useState<string[]>(() => [
    ...DEMO_PRESENT,
    "cheater",
    "hate",
  ]);
  const [testKey, setTestKey] = useState("bluff");
  const [highlightIndices, setHighlightIndices] = useState<number[]>([]);

  const effectiveM = mode === "goal" ? bitArraySize(goalItems, goalFp) : m;
  const effectiveK =
    mode === "goal" ? hashCountFromSizing(effectiveM, Math.max(keys.length, goalItems)) : k;

  const n = keys.length;
  const bits = useMemo(
    () => buildBitArray(keys, effectiveK, effectiveM),
    [keys, effectiveK, effectiveM]
  );
  const fill = fillRatio(bits);
  const fpEst = falsePositiveRate(effectiveM, n, effectiveK);
  const kOpt = optimalK(effectiveM, Math.max(n, 1));
  const targetFp = mode === "goal" ? goalFp : null;

  const exactHas = useMemo(() => new Set(keys), [keys]);
  const probe = useMemo(
    () => bloomMaybeContains(bits, testKey.trim() || "?", effectiveK, effectiveM),
    [bits, testKey, effectiveK, effectiveM]
  );

  const isFalsePositive =
    testKey.trim() !== "" && probe.present && !exactHas.has(testKey.trim());
  const isDefinitelyNot =
    testKey.trim() !== "" && !probe.present && !exactHas.has(testKey.trim());

  const drawBits = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cell = effectiveM > 128 ? 5 : effectiveM > 64 ? 6 : 8;
    const gap = 1;
    const height = 32;
    canvas.width = effectiveM * (cell + gap);
    canvas.height = height;

    const probeSet = new Set(highlightIndices.length ? highlightIndices : probe.indices);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < effectiveM; i++) {
      const x = i * (cell + gap);
      const isProbe = probeSet.has(i) && testKey.trim() !== "";
      if (isProbe) ctx.fillStyle = BIT_PROBE;
      else if (bits[i]) ctx.fillStyle = BIT_ON;
      else ctx.fillStyle = BIT_OFF;
      ctx.fillRect(x, 2, cell, height - 4);
    }
  }, [bits, effectiveM, highlightIndices, probe.indices, testKey]);

  useEffect(() => {
    drawBits();
  }, [drawBits, reducedMotion]);

  const modeTabs: ControlMode[] = ["goal", "manual"];

  const onModeTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = modeTabs.indexOf(mode);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setMode(modeTabs[(idx + 1) % modeTabs.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setMode(modeTabs[(idx - 1 + modeTabs.length) % modeTabs.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setMode(modeTabs[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      setMode(modeTabs[modeTabs.length - 1]);
    }
  };

  const loadDemo = () => {
    setKeys([...DEMO_PRESENT]);
    setTestKey("war");
    setMode("manual");
    setM(48);
    setK(2);
  };

  const cramFilter = () => {
    setKeys([...DEMO_PRESENT, "cheater", "hate"]);
    setM(40);
    setK(2);
    setMode("manual");
    setTestKey("bluff");
  };

  const huntFalsePositive = () => {
    setKeys([...DEMO_PRESENT]);
    setMode("manual");
    setM(40);
    setK(3);
    for (const candidate of DEMO_ABSENT) {
      const trial = buildBitArray([...DEMO_PRESENT], 3, 40);
      const { present } = bloomMaybeContains(trial, candidate, 3, 40);
      if (present) {
        setTestKey(candidate);
        return;
      }
    }
    setTestKey("humanity");
  };

  const onProbeKey = (key: string) => {
    setTestKey(key);
    const { indices } = bloomMaybeContains(bits, key, effectiveK, effectiveM);
    setHighlightIndices(indices);
  };

  const addKey = () => {
    const trimmed = testKey.trim();
    if (!trimmed || exactHas.has(trimmed)) return;
    setKeys((prev) => [...prev, trimmed]);
    setHighlightIndices([]);
  };

  const resetKeys = () => {
    setKeys([]);
    setHighlightIndices([]);
  };

  const fillPct = (fill * 100).toFixed(0);
  const fpPct = (fpEst * 100).toFixed(2);
  const targetPct = targetFp != null ? (targetFp * 100).toFixed(1) : null;

  return (
    <div className="bloom-lab">
      <p className="bloom-lab__intro">
        A Bloom filter can say <strong>definitely not</strong> or <strong>maybe yes</strong> — never
        a false negative. Crank fill or use too few bits and absent keys start looking present.
      </p>

      <div className="bloom-lab__tabs" role="tablist" aria-label="Parameter mode">
        <button
          type="button"
          role="tab"
          id="bloom-tab-goal"
          className="bloom-lab__tab"
          aria-selected={mode === "goal"}
          aria-controls="bloom-panel-goal"
          tabIndex={mode === "goal" ? 0 : -1}
          onClick={() => setMode("goal")}
          onKeyDown={onModeTabKeyDown}
        >
          Size from target FP
        </button>
        <button
          type="button"
          role="tab"
          id="bloom-tab-manual"
          className="bloom-lab__tab"
          aria-selected={mode === "manual"}
          aria-controls="bloom-panel-manual"
          tabIndex={mode === "manual" ? 0 : -1}
          onClick={() => setMode("manual")}
          onKeyDown={onModeTabKeyDown}
        >
          Manual m &amp; k
        </button>
      </div>

      <div className="bloom-lab__grid">
        <div>
          <div
            id="bloom-panel-goal"
            role="tabpanel"
            aria-labelledby="bloom-tab-goal"
            hidden={mode !== "goal"}
            className="bloom-lab__controls"
          >
            {mode === "goal" && (
              <>
                <div className="bloom-lab__control">
                  <label htmlFor="goal-n">
                    Expected items (n)
                    <input
                      id="goal-n"
                      type="range"
                      min={5}
                      max={80}
                      value={goalItems}
                      onChange={(e) => setGoalItems(Number(e.target.value))}
                      aria-valuemin={5}
                      aria-valuemax={80}
                      aria-valuenow={goalItems}
                      aria-valuetext={`${goalItems} items`}
                    />
                    <span className="bloom-lab__value">{goalItems}</span>
                  </label>
                </div>
                <div className="bloom-lab__control">
                  <label htmlFor="goal-p">
                    Target false positive rate (p)
                    <input
                      id="goal-p"
                      type="range"
                      min={1}
                      max={20}
                      value={Math.round(goalFp * 100)}
                      onChange={(e) => setGoalFp(Number(e.target.value) / 100)}
                      aria-valuemin={1}
                      aria-valuemax={20}
                      aria-valuenow={Math.round(goalFp * 100)}
                      aria-valuetext={`${(goalFp * 100).toFixed(0)} percent`}
                    />
                    <span className="bloom-lab__value">{(goalFp * 100).toFixed(0)}%</span>
                  </label>
                  <span className="hint">Formulas from bloom_filter.py — m ≈ {effectiveM} bits, k ≈ {effectiveK}</span>
                </div>
              </>
            )}
          </div>
          <div
            id="bloom-panel-manual"
            role="tabpanel"
            aria-labelledby="bloom-tab-manual"
            hidden={mode !== "manual"}
            className="bloom-lab__controls"
          >
            {mode === "manual" && (
              <>
                <div className="bloom-lab__control">
                  <label htmlFor="lab-m">
                    m — bit array size
                    <input
                      id="lab-m"
                      type="range"
                      min={16}
                      max={256}
                      step={8}
                      value={m}
                      onChange={(e) => setM(Number(e.target.value))}
                      aria-valuemin={16}
                      aria-valuemax={256}
                      aria-valuenow={m}
                      aria-valuetext={`${m} bits`}
                    />
                    <span className="bloom-lab__value">{m}</span>
                  </label>
                </div>
                <div className="bloom-lab__control">
                  <label htmlFor="lab-k">
                    k — hash functions
                    <input
                      id="lab-k"
                      type="range"
                      min={1}
                      max={12}
                      value={k}
                      onChange={(e) => setK(Number(e.target.value))}
                      aria-valuemin={1}
                      aria-valuemax={12}
                      aria-valuenow={k}
                      aria-valuetext={`${k} hashes`}
                    />
                    <span className="bloom-lab__value">{k}</span>
                    {k !== kOpt && n > 0 && (
                      <span className="hint">Optimal k for current fill ≈ {kOpt} — try matching it.</span>
                    )}
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="bloom-lab__controls bloom-lab__controls--keys">
            <div className="bloom-lab__control">
              <span id="lab-inserted-label">
                Inserted keys (n = {n})
              </span>
              <span className="hint" id="lab-inserted-hint">
                MD5-based hashes, same recipe as the Python topic code.
              </span>
              <div
                className="bloom-lab__probe-row"
                role="group"
                aria-labelledby="lab-inserted-label"
                aria-describedby="lab-inserted-hint"
              >
                <button type="button" className="bloom-lab__btn bloom-lab__btn--ghost" onClick={loadDemo}>
                  Demo set
                </button>
                <button type="button" className="bloom-lab__btn bloom-lab__btn--ghost" onClick={cramFilter}>
                  Overfill (mistake)
                </button>
                <button type="button" className="bloom-lab__btn bloom-lab__btn--ghost" onClick={resetKeys}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="bloom-lab__viz-wrap">
            <canvas
              ref={canvasRef}
              className="bloom-lab__canvas"
              role="img"
              aria-label={`Bloom filter bit array: ${n} keys, ${fillPct} percent of ${effectiveM} bits set`}
            />
            <div className="bloom-lab__legend">
              <span className="bloom-lab__swatch bloom-lab__swatch--set">
                <i aria-hidden /> bit set
              </span>
              <span className="bloom-lab__swatch bloom-lab__swatch--probe">
                <i aria-hidden /> probe path
              </span>
              <span className="bloom-lab__swatch bloom-lab__swatch--empty">
                <i aria-hidden /> empty
              </span>
            </div>
          </div>
        </div>

        <aside className="bloom-lab__metrics" aria-label="Live metrics">
          <dl className="bloom-lab__metric">
            <dt>Fill ratio</dt>
            <dd>{fillPct}%</dd>
          </dl>
          <dl className={`bloom-lab__metric${fpEst > 0.15 ? " bloom-lab__metric--warn" : ""}`}>
            <dt>Estimated FP rate</dt>
            <dd>{fpPct}%</dd>
          </dl>
          {targetPct != null && (
            <dl className="bloom-lab__metric">
              <dt>Target FP (design)</dt>
              <dd>{targetPct}%</dd>
            </dl>
          )}
          <dl className="bloom-lab__metric">
            <dt>Optimal k (n = {Math.max(n, 1)})</dt>
            <dd>{kOpt}</dd>
          </dl>
          {isFalsePositive && (
            <dl className="bloom-lab__metric bloom-lab__metric--aha">
              <dt>Aha — false positive</dt>
              <dd>
                Bloom says maybe for &quot;{testKey.trim()}&quot;, but it was never inserted.
              </dd>
            </dl>
          )}
        </aside>
      </div>

      <p className="bloom-lab__status" role="status" aria-live="polite" aria-atomic="true">
        {n === 0
          ? "Insert keys to light up the bit array."
          : `With ${n} keys in ${effectiveM} bits and k = ${effectiveK}, estimated false positive rate is ${fpPct}%.`}
        {testKey.trim() !== "" && (
          <>
            {" "}
            Probe &quot;{testKey.trim()}&quot;: Bloom →{" "}
            {probe.present ? "maybe yes" : "definitely not"}
            {exactHas.has(testKey.trim()) ? "; exact set → member." : "; exact set → not a member."}
          </>
        )}
      </p>

      <section className="bloom-lab__probe" aria-labelledby="probe-heading">
        <h3 id="probe-heading">Probe a key</h3>
        <div className="bloom-lab__probe-row">
          <input
            id="probe-key"
            type="text"
            value={testKey}
            onChange={(e) => {
              setTestKey(e.target.value);
              setHighlightIndices([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onProbeKey(testKey);
              }
            }}
            aria-label="Key to test"
            placeholder="e.g. war"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="bloom-lab__btn" onClick={() => onProbeKey(testKey)}>
            Test
          </button>
          <button type="button" className="bloom-lab__btn" onClick={addKey}>
            Insert
          </button>
          <button type="button" className="bloom-lab__btn bloom-lab__btn--ghost" onClick={huntFalsePositive}>
            Find FP
          </button>
        </div>
        <div className="bloom-lab__chips" role="group" aria-label="Absent words from Python demo">
          {DEMO_ABSENT.map((word) => (
            <button
              key={word}
              type="button"
              className="bloom-lab__chip"
              aria-pressed={testKey === word}
              onClick={() => onProbeKey(word)}
            >
              {word}
            </button>
          ))}
        </div>

        <div className="bloom-lab__compare">
          <div>
            <strong>Bloom filter</strong>
            {testKey.trim() === ""
              ? "—"
              : probe.present
                ? "Maybe present (all k bits set)"
                : "Definitely not in set"}
          </div>
          <div>
            <strong>Exact set ({n} keys)</strong>
            {testKey.trim() === ""
              ? "—"
              : exactHas.has(testKey.trim())
                ? "Member"
                : "Not stored"}
          </div>
        </div>
        {isDefinitelyNot && (
          <p className="bloom-lab__status" role="note">
            One bit at zero is enough — Bloom guarantees no false negatives.
          </p>
        )}
      </section>
    </div>
  );
}
