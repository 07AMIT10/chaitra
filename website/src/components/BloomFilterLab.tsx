import { useMemo, useState } from "react";
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
import {
  BitGridCanvas,
  BitGridLegend,
  LabShell,
  LabTabPanel,
  LabTabs,
  MetricsAside,
  RangeControl,
  type LabMetric,
  type LabTab,
} from "./lab";
import "./BloomFilterLab.css";

type ControlMode = "goal" | "manual";

const MODE_TABS: LabTab[] = [
  {
    id: "goal",
    label: "Size from target FP",
    panelId: "bloom-panel-goal",
    tabId: "bloom-tab-goal",
  },
  {
    id: "manual",
    label: "Manual m & k",
    panelId: "bloom-panel-manual",
    tabId: "bloom-tab-manual",
  },
];

export default function BloomFilterLab() {
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

  const probeIndices =
    highlightIndices.length > 0 ? highlightIndices : probe.indices;

  const metrics: LabMetric[] = [
    { id: "fill", label: "Fill ratio", value: `${fillPct}%` },
    {
      id: "fp",
      label: "Estimated FP rate",
      value: `${fpPct}%`,
      tone: fpEst > 0.15 ? "warn" : "default",
    },
  ];
  if (targetPct != null) {
    metrics.push({ id: "target", label: "Target FP (design)", value: `${targetPct}%` });
  }
  metrics.push({
    id: "kopt",
    label: `Optimal k (n = ${Math.max(n, 1)})`,
    value: String(kOpt),
  });
  if (isFalsePositive) {
    metrics.push({
      id: "aha",
      label: "Aha — false positive",
      value: `Bloom says maybe for "${testKey.trim()}", but it was never inserted.`,
      tone: "aha",
    });
  }

  return (
    <LabShell
      intro={
        <>
          A Bloom filter can say <strong>definitely not</strong> or <strong>maybe yes</strong> —
          never a false negative. Crank fill or use too few bits and absent keys start looking
          present.
        </>
      }
    >
      <LabTabs
        tabs={MODE_TABS}
        activeId={mode}
        onChange={(id) => setMode(id as ControlMode)}
        ariaLabel="Parameter mode"
      />

      <div className="lab__grid">
        <div>
          <LabTabPanel tab={MODE_TABS[0]} active={mode === "goal"}>
            <RangeControl
              id="goal-n"
              label="Expected items (n)"
              min={5}
              max={80}
              value={goalItems}
              valueText={`${goalItems} items`}
              onChange={setGoalItems}
            />
            <RangeControl
              id="goal-p"
              label="Target false positive rate (p)"
              min={1}
              max={20}
              value={Math.round(goalFp * 100)}
              valueText={`${(goalFp * 100).toFixed(0)}%`}
              onChange={(v) => setGoalFp(v / 100)}
              hint={
                <>
                  Formulas from bloom_filter.py — m ≈ {effectiveM} bits, k ≈ {effectiveK}
                </>
              }
            />
          </LabTabPanel>

          <LabTabPanel tab={MODE_TABS[1]} active={mode === "manual"}>
            <RangeControl
              id="lab-m"
              label="m — bit array size"
              min={16}
              max={256}
              step={8}
              value={m}
              valueText={`${m} bits`}
              onChange={setM}
            />
            <RangeControl
              id="lab-k"
              label="k — hash functions"
              min={1}
              max={12}
              value={k}
              valueText={`${k} hash functions`}
              onChange={setK}
              hint={
                k !== kOpt && n > 0 ? (
                  <>Optimal k for current fill ≈ {kOpt} — try matching it.</>
                ) : undefined
              }
            />
          </LabTabPanel>

          <div className="lab__controls bloom-lab__controls--keys">
            <div className="lab__control">
              <span id="lab-inserted-label">Inserted keys (n = {n})</span>
              <span className="lab__hint" id="lab-inserted-hint">
                MD5-based hashes, same recipe as the Python topic code.
              </span>
              <div
                className="lab__row bloom-lab__probe-row"
                role="group"
                aria-labelledby="lab-inserted-label"
                aria-describedby="lab-inserted-hint"
              >
                <button type="button" className="lab__btn lab__btn--ghost" onClick={loadDemo}>
                  Demo set
                </button>
                <button type="button" className="lab__btn lab__btn--ghost" onClick={cramFilter}>
                  Overfill (mistake)
                </button>
                <button type="button" className="lab__btn lab__btn--ghost" onClick={resetKeys}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <BitGridCanvas
            length={effectiveM}
            bits={bits}
            probeIndices={probeIndices}
            highlightProbes={testKey.trim() !== ""}
            ariaLabel={`Bloom filter bit array: ${n} keys, ${fillPct} percent of ${effectiveM} bits set`}
          />
          <BitGridLegend
            items={[
              { id: "set", label: "bit set", swatchClass: "lab__swatch--set" },
              { id: "probe", label: "probe path", swatchClass: "lab__swatch--probe" },
              { id: "empty", label: "empty", swatchClass: "lab__swatch--empty" },
            ]}
          />
        </div>

        <MetricsAside metrics={metrics} />
      </div>

      <p className="lab__status" role="status" aria-live="polite" aria-atomic="true">
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
        <div className="lab__row bloom-lab__probe-row">
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
          <button type="button" className="lab__btn" onClick={() => onProbeKey(testKey)}>
            Test
          </button>
          <button type="button" className="lab__btn" onClick={addKey}>
            Insert
          </button>
          <button type="button" className="lab__btn lab__btn--ghost" onClick={huntFalsePositive}>
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

        <div className="lab__compare">
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
          <p className="lab__status" role="note">
            One bit at zero is enough — Bloom guarantees no false negatives.
          </p>
        )}
      </section>
    </LabShell>
  );
}
