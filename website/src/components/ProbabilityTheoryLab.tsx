import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  axiomCheck,
  bernoulliMean,
  bernoulliVariance,
  chebyshevTailBound,
  expectedCountPerFace,
  fairDieMean,
  fairDieVariance,
  formatMu,
  formatPercent,
  llnAbsoluteError,
} from "../lib/probability-theory-math";
import {
  BIASED_COIN_PRESET,
  CHAOTIC_COIN_PRESET,
  FAIR_DIE_PRESET,
  LLN_FAIR_COIN_PRESET,
  MANY_DICE_PRESET,
  empiricalCoinProbs,
  empiricalProbsFromHist,
  simulateCoinFlips,
  simulateDiceRolls,
  type ExperimentMode,
} from "../lib/probability-theory-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./ProbabilityTheoryLab.css";

export default function ProbabilityTheoryLab() {
  const [mode, setMode] = useState<ExperimentMode>("coin");
  const [trials, setTrials] = useState(800);
  const [pHeadsPct, setPHeadsPct] = useState(50);
  const [sides, setSides] = useState(6);
  const [seed, setSeed] = useState(42);
  const reducedMotion = usePrefersReducedMotion();

  const pHeads = pHeadsPct / 100;

  const coinRun = useMemo(
    () => (mode === "coin" ? simulateCoinFlips(trials, pHeads, seed) : null),
    [mode, trials, pHeads, seed]
  );

  const diceRun = useMemo(
    () => (mode === "dice" ? simulateDiceRolls(trials, sides, seed) : null),
    [mode, trials, sides, seed]
  );

  const mu = mode === "coin" ? bernoulliMean(pHeads) : fairDieMean(sides);
  const sampleMean =
    mode === "coin" ? (coinRun?.headsFrac ?? 0) : (diceRun?.sampleMean ?? 0);
  const llnErr = llnAbsoluteError(sampleMean, mu);

  const smallCoin = useMemo(() => simulateCoinFlips(40, pHeads, seed), [pHeads, seed]);
  const largeCoin = useMemo(
    () => simulateCoinFlips(Math.max(trials, 4000), pHeads, seed + 1),
    [trials, pHeads, seed]
  );

  const empiricalProbs =
    mode === "coin" && coinRun
      ? empiricalCoinProbs(coinRun.heads, coinRun.tails)
      : diceRun
        ? empiricalProbsFromHist(diceRun.hist)
        : [];
  const axioms = axiomCheck(empiricalProbs);

  const expectedPerFace =
    mode === "dice" ? expectedCountPerFace(trials, sides) : 0;
  const maxFaceDev =
    mode === "dice" && diceRun
      ? Math.max(...diceRun.hist.map((h) => Math.abs(h - expectedPerFace)))
      : 0;

  const runningSeries =
    mode === "coin" ? (coinRun?.runningHeadsFrac ?? []) : (diceRun?.runningMeans ?? []);
  const sparkSample = useMemo(() => {
    if (runningSeries.length <= 80) return runningSeries;
    const step = runningSeries.length / 80;
    const out: number[] = [];
    for (let i = 0; i < 80; i++) {
      const idx = Math.min(runningSeries.length - 1, Math.floor(i * step));
      out.push(runningSeries[idx] ?? mu);
    }
    return out;
  }, [runningSeries, mu]);

  const sparkMax = Math.max(...sparkSample, mu, 0.01);
  const sparkMin = Math.min(...sparkSample, mu, 0);

  const applyChaotic = () => {
    setMode("coin");
    setTrials(CHAOTIC_COIN_PRESET.trials);
    setPHeadsPct(CHAOTIC_COIN_PRESET.pHeadsPct ?? 50);
    setSeed(CHAOTIC_COIN_PRESET.seed);
  };

  const applyLlnCoin = () => {
    setMode("coin");
    setTrials(LLN_FAIR_COIN_PRESET.trials);
    setPHeadsPct(LLN_FAIR_COIN_PRESET.pHeadsPct ?? 50);
    setSeed(LLN_FAIR_COIN_PRESET.seed);
  };

  const applyBiased = () => {
    setMode("coin");
    setTrials(BIASED_COIN_PRESET.trials);
    setPHeadsPct(BIASED_COIN_PRESET.pHeadsPct ?? 72);
    setSeed(BIASED_COIN_PRESET.seed);
  };

  const applyFairDie = () => {
    setMode("dice");
    setTrials(FAIR_DIE_PRESET.trials);
    setSides(FAIR_DIE_PRESET.sides ?? 6);
    setSeed(FAIR_DIE_PRESET.seed);
  };

  const applyManyDice = () => {
    setMode("dice");
    setTrials(MANY_DICE_PRESET.trials);
    setSides(MANY_DICE_PRESET.sides ?? 6);
    setSeed(MANY_DICE_PRESET.seed);
  };

  const fewTrials = trials < 200;
  const llnTight = llnErr < 0.02;
  const sigma =
    mode === "coin" ? Math.sqrt(bernoulliVariance(pHeads)) : Math.sqrt(fairDieVariance(sides));
  const kForCheb = sigma > 0 ? 2 : 1;
  const chebBound = chebyshevTailBound(kForCheb);

  const metrics: LabMetric[] = [
    {
      id: "mode",
      label: "Experiment",
      value: mode === "coin" ? "Coin (Bernoulli)" : `Fair ${sides}-sided die`,
    },
    { id: "n", label: "Trials N", value: String(trials) },
    { id: "mu", label: "Expected μ", value: formatMu(mu) },
    {
      id: "xbar",
      label: "Sample mean x̄",
      value: formatMu(sampleMean),
      tone: llnTight ? "aha" : fewTrials ? "warn" : "default",
    },
    {
      id: "lln",
      label: "|x̄ − μ|",
      value: formatMu(llnErr),
      tone: llnErr > 0.08 ? "warn" : llnTight ? "aha" : "default",
    },
    {
      id: "axiom-sum",
      label: "Σ empirical P",
      value: formatMu(axioms.sum, 4),
      tone: axioms.sumsToOne ? "aha" : "warn",
    },
    {
      id: "axiom-unit",
      label: "P ∈ [0,1]",
      value: axioms.inUnitInterval ? "yes" : "no",
      tone: axioms.inUnitInterval ? "default" : "warn",
    },
  ];

  if (mode === "dice" && diceRun) {
    metrics.push({
      id: "face-dev",
      label: "Max |count − E[count]|",
      value: String(maxFaceDev),
      tone: maxFaceDev > expectedPerFace * 0.25 ? "warn" : "default",
    });
  }

  if (fewTrials && mode === "coin") {
    metrics.push({
      id: "aha-chaos",
      label: "Aha — small N",
      value: `${formatPercent(coinRun?.headsFrac ?? 0)} heads on ${trials} flips — far from μ=${formatPercent(pHeads)}.`,
      tone: "warn",
    });
  }
  if (llnTight && trials >= 2000) {
    metrics.push({
      id: "aha-lln",
      label: "Aha — LLN",
      value: `|x̄−μ|=${formatMu(llnErr)} with N=${trials}; aggregate behavior stabilizes.`,
      tone: "aha",
    });
  }

  const compareLeft = `N=40: x̄=${formatMu(smallCoin.headsFrac)} · |x̄−μ|=${formatMu(llnAbsoluteError(smallCoin.headsFrac, pHeads))}`;
  const compareRight = `N=${Math.max(trials, 4000)}: x̄=${formatMu(largeCoin.headsFrac)} · |x̄−μ|=${formatMu(llnAbsoluteError(largeCoin.headsFrac, pHeads))}`;

  const predictKey = `${mode}-${trials}-${pHeadsPct}-${sides}-${seed}`;

  const maxBar =
    mode === "coin" && coinRun
      ? Math.max(coinRun.heads, coinRun.tails, 1)
      : diceRun
        ? Math.max(...diceRun.hist, expectedPerFace, 1)
        : 1;

  return (
    <LabShell
      intro={
        <>
          Run <strong>coin</strong> or <strong>fair-die</strong> experiments and watch the{" "}
          <strong>sample mean x̄</strong> converge to the expected value μ (weak law of large numbers).
          Empirical frequencies illustrate <strong>Kolmogorov axioms</strong>: each outcome’s P stays in
          $[0,1]$ and counts partition the sample space to sum to 1.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="pt-lab__mode" role="group" aria-label="Experiment type">
            <button
              type="button"
              aria-pressed={mode === "coin"}
              onClick={() => setMode("coin")}
            >
              Coin
            </button>
            <button
              type="button"
              aria-pressed={mode === "dice"}
              onClick={() => setMode("dice")}
            >
              Die
            </button>
          </div>
          <div className="lab__controls-panel">
            <RangeControl
              id="pt-trials"
              label="Trials N"
              min={40}
              max={10000}
              step={mode === "coin" ? 40 : 100}
              value={trials}
              valueText={`${trials} trials`}
              onChange={setTrials}
            />
            {mode === "coin" ? (
              <RangeControl
                id="pt-ph"
                label="P(Heads)"
                min={10}
                max={90}
                value={pHeadsPct}
                valueText={`${pHeadsPct}%`}
                onChange={setPHeadsPct}
              />
            ) : (
              <RangeControl
                id="pt-sides"
                label="Sides"
                min={2}
                max={12}
                value={sides}
                valueText={`${sides}-sided`}
                onChange={setSides}
              />
            )}
            <ScenarioPresets
              aria-label="Probability theory experiment presets"
              presets={[
                { id: "chaotic", label: "Chaotic (40)", onSelect: applyChaotic },
                { id: "lln", label: "LLN fair coin", onSelect: applyLlnCoin },
                { id: "biased", label: "Biased 72%", onSelect: applyBiased },
                { id: "die", label: "Fair die", onSelect: applyFairDie },
                { id: "many-die", label: "LLN die", onSelect: applyManyDice },
              ]}
            />
          </div>

          {mode === "coin" && coinRun ? (
            <div
              className="pt-lab__chart"
              role="img"
              aria-label={`Coin outcomes: ${coinRun.heads} heads, ${coinRun.tails} tails`}
            >
              {[
                { label: "H", count: coinRun.heads, expected: trials * pHeads },
                { label: "T", count: coinRun.tails, expected: trials * (1 - pHeads) },
              ].map(({ label, count, expected }) => (
                <div key={label} className="pt-lab__col">
                  <div
                    className="pt-lab__bar"
                    style={{ height: `${(count / maxBar) * 100}%` }}
                    title={`${label}: ${count} (${formatPercent(count / trials)})`}
                  />
                  <span className="pt-lab__label">{label}</span>
                  <span className="pt-lab__label">E≈{Math.round(expected)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {mode === "dice" && diceRun ? (
            <div
              className="pt-lab__chart"
              role="img"
              aria-label={`Die histogram, sample mean ${sampleMean.toFixed(3)}`}
            >
              {diceRun.hist.map((h, i) => (
                <div key={i} className="pt-lab__col">
                  <div
                    className={`pt-lab__bar${Math.abs(h - expectedPerFace) < 1 ? " pt-lab__bar--expected" : ""}`}
                    style={{ height: `${(h / maxBar) * 100}%` }}
                    title={`Face ${i + 1}: ${h} (E=${expectedPerFace.toFixed(1)})`}
                  />
                  <span className="pt-lab__label">{i + 1}</span>
                </div>
              ))}
            </div>
          ) : null}

          <p className="lab__hint">
            Sparkline: running sample mean x̄<sub>N</sub> vs μ={formatMu(mu)} (dashed mental line at μ).
          </p>
          <div
            className={`pt-lab__spark${reducedMotion ? " pt-lab__spark--static" : ""}`}
            role="img"
            aria-label={`Running sample mean converging toward ${formatMu(mu)}`}
          >
            {sparkSample.map((v, i) => {
              const norm = sparkMax > sparkMin ? (v - sparkMin) / (sparkMax - sparkMin) : 0.5;
              return (
                <div
                  key={i}
                  className="pt-lab__spark-tick"
                  style={{ height: `${Math.max(4, norm * 100)}%` }}
                  title={`x̄≈${formatMu(v)}`}
                />
              );
            })}
          </div>

          <table className="pt-lab__table">
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Theory</th>
                <th scope="col">This run</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>μ = E[X]</td>
                <td>{formatMu(mu)}</td>
                <td>x̄ = {formatMu(sampleMean)}</td>
              </tr>
              <tr>
                <td>LLN gap |x̄−μ|</td>
                <td>→ 0 as N→∞</td>
                <td>{formatMu(llnErr)}</td>
              </tr>
              <tr>
                <td>Chebyshev P(|X−μ|≥2σ)</td>
                <td>≤ {formatPercent(chebBound, 0)}</td>
                <td>σ={formatMu(sigma)}</td>
              </tr>
              <tr>
                <td>Axioms (empirical)</td>
                <td>P∈[0,1], ΣP=1</td>
                <td>
                  {axioms.inUnitInterval && axioms.sumsToOne ? "pass" : "check counts"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={predictKey}
        prompt={
          <>
            With <strong>N={trials}</strong> {mode === "coin" ? "coin flips" : "die rolls"} and μ=
            <strong>{formatMu(mu)}</strong>, will <strong>|x̄ − μ|</strong> drop below <strong>0.02</strong>{" "}
            compared to a run with only <strong>40</strong> trials?
          </>
        }
        revealLabel="Compare small-N chaos vs large-N LLN"
      >
        <ComparePanel
          leftLabel="Small N (chaotic)"
          rightLabel="Large N (aggregate)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Weak LLN: sample averages concentrate around μ. Chebyshev bounds tail mass at{" "}
          <strong>kσ</strong> without knowing the full distribution — the README’s SRE latency story.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {mode === "coin"
          ? `Coin: ${coinRun?.heads ?? 0}H / ${coinRun?.tails ?? 0}T, x̄=${formatPercent(sampleMean)}, μ=${formatPercent(pHeads)}.`
          : `Die: x̄=${formatMu(sampleMean)} vs μ=${formatMu(mu)}, max face count deviation ${maxFaceDev}.`}{" "}
        {llnTight
          ? "Large N — sample mean hugging μ (predictable cluster)."
          : fewTrials
            ? "Small N — high variance; single-server chaos."
            : "Increase N to watch |x̄−μ| shrink."}
      </p>
    </LabShell>
  );
}
