import { useMemo, useState } from "react";
import {
  confirmationsForThreshold,
  formatFinality,
  formatProbability,
  formatReversal,
} from "../lib/prob-consensus-math";
import {
  BITCOIN_EXCHANGE_PRESET,
  MAJORITY_ATTACK_PRESET,
  NAKAMOTO_DEEP_PRESET,
  reversalCurve,
  snapshotAtRound,
} from "../lib/prob-consensus-sim";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./ProbabilisticConsensusLab.css";

const SEED = 42;
const CHART_MAX_Z = 20;

export default function ProbabilisticConsensusLab() {
  const [confirmations, setConfirmations] = useState(BITCOIN_EXCHANGE_PRESET.confirmations);
  const [attackerPct, setAttackerPct] = useState(BITCOIN_EXCHANGE_PRESET.attackerPct);
  const [reversalThreshold, setReversalThreshold] = useState(0.0001);
  const [avalancheRound, setAvalancheRound] = useState(0);
  const [networkRedPct, setNetworkRedPct] = useState(BITCOIN_EXCHANGE_PRESET.networkRedPct);
  const [avalancheCommit, setAvalancheCommit] = useState(8);
  const reducedMotion = usePrefersReducedMotion();

  const sampleK = BITCOIN_EXCHANGE_PRESET.sampleK;
  const supermajorityAlpha = BITCOIN_EXCHANGE_PRESET.supermajorityAlpha;

  const snap = useMemo(
    () =>
      snapshotAtRound(
        confirmations,
        attackerPct,
        reversalThreshold,
        avalancheRound,
        networkRedPct,
        sampleK,
        supermajorityAlpha,
        avalancheCommit,
        SEED
      ),
    [
      confirmations,
      attackerPct,
      reversalThreshold,
      avalancheRound,
      networkRedPct,
      avalancheCommit,
    ]
  );

  const curve = useMemo(() => reversalCurve(attackerPct, CHART_MAX_Z), [attackerPct]);
  const zForThreshold = useMemo(
    () => confirmationsForThreshold(attackerPct / 100, reversalThreshold),
    [attackerPct, reversalThreshold]
  );

  const applyBitcoin = () => {
    setAttackerPct(BITCOIN_EXCHANGE_PRESET.attackerPct);
    setConfirmations(BITCOIN_EXCHANGE_PRESET.confirmations);
    setReversalThreshold(BITCOIN_EXCHANGE_PRESET.commitThreshold);
    setNetworkRedPct(BITCOIN_EXCHANGE_PRESET.networkRedPct);
    setAvalancheRound(0);
    setAvalancheCommit(8);
  };

  const applyDeep = () => {
    setAttackerPct(NAKAMOTO_DEEP_PRESET.attackerPct);
    setConfirmations(NAKAMOTO_DEEP_PRESET.confirmations);
    setReversalThreshold(NAKAMOTO_DEEP_PRESET.commitThreshold);
    setNetworkRedPct(NAKAMOTO_DEEP_PRESET.networkRedPct);
    setAvalancheRound(0);
    setAvalancheCommit(12);
  };

  const applyAttack = () => {
    setAttackerPct(MAJORITY_ATTACK_PRESET.attackerPct);
    setConfirmations(MAJORITY_ATTACK_PRESET.confirmations);
    setReversalThreshold(MAJORITY_ATTACK_PRESET.commitThreshold);
    setNetworkRedPct(MAJORITY_ATTACK_PRESET.networkRedPct);
    setAvalancheRound(0);
    setAvalancheCommit(8);
  };

  const stepNakamoto = () => setConfirmations((z) => Math.min(CHART_MAX_Z, z + 1));
  const stepAvalanche = () => setAvalancheRound((r) => r + 1);
  const reset = () => {
    setConfirmations(1);
    setAvalancheRound(0);
  };

  const maxReversal = Math.max(...curve.map((c) => c.reversal), 0.01);
  const thresholdY = (1 - reversalThreshold / maxReversal) * 100;

  const metrics: LabMetric[] = [
    { id: "z", label: "Confirmations (z)", value: String(confirmations) },
    { id: "q", label: "Attacker (q)", value: `${attackerPct}%` },
    {
      id: "rev",
      label: "Nakamoto",
      value: formatReversal(snap.nakamoto.reversalProb),
      tone: snap.nakamoto.meetsThreshold ? "aha" : attackerPct >= 50 ? "warn" : "default",
    },
    {
      id: "fin",
      label: "Practical finality",
      value: formatFinality(snap.nakamoto.finalityProb),
      tone: snap.nakamoto.meetsThreshold ? "aha" : "default",
    },
    {
      id: "av-round",
      label: "Avalanche round",
      value: String(avalancheRound),
    },
    {
      id: "streak",
      label: "α-streak",
      value: `${snap.avalanche.streak} / ${avalancheCommit}`,
      tone: snap.avalanche.locked ? "aha" : snap.avalanche.streak > 0 ? "default" : "default",
    },
  ];

  if (snap.avalanche.locked) {
    metrics.push({
      id: "aha-lock",
      label: "Commit threshold",
      value: `Locked Red after ${snap.avalanche.streak} consecutive α-majority polls.`,
      tone: "aha",
    });
  }
  if (attackerPct >= 50) {
    metrics.push({
      id: "warn-attack",
      label: "Safety",
      value: "q ≥ 50% — Nakamoto reversal probability stays at 100%.",
      tone: "warn",
    });
  }
  if (snap.nakamoto.meetsThreshold && confirmations >= 1) {
    metrics.push({
      id: "aha-btc",
      label: "Exchange-grade",
      value: `P(reversal) below ${formatProbability(reversalThreshold)} at z=${confirmations}.`,
      tone: "aha",
    });
  }

  const compareLeft = (
    <>
      <p>
        After <strong>{confirmations}</strong> block{confirmations === 1 ? "" : "s"},{" "}
        {formatReversal(snap.nakamoto.reversalProb)} with honest share{" "}
        <strong>{100 - attackerPct}%</strong>. Finality is <em>probabilistic</em> — depth drives risk
        down exponentially, never a signed contract.
      </p>
      {zForThreshold > 0 && zForThreshold <= CHART_MAX_Z && (
        <p>
          Need <strong>z ≥ {zForThreshold}</strong> for P(reversal) ≤{" "}
          {formatProbability(reversalThreshold)} at this q.
        </p>
      )}
    </>
  );

  const compareRight = (
    <>
      <p>
        Avalanche-style <strong>commit threshold</strong>: {avalancheCommit} consecutive subsample
        rounds with ≥<strong>{supermajorityAlpha}</strong> of <strong>{sampleK}</strong> peers voting
        Red (network bias {networkRedPct}% Red).
      </p>
      <p>
        Round {avalancheRound}: sample <strong>{snap.avalanche.redVotes}/{sampleK}</strong> Red — streak{" "}
        <strong>{snap.avalanche.streak}</strong>
        {snap.avalanche.locked
          ? " — threshold met, preference locked."
          : " — still metastable until streak completes."}
      </p>
    </>
  );

  const predictYes =
    attackerPct < 50 &&
    (confirmations >= zForThreshold || (zForThreshold > 0 && zForThreshold <= confirmations + 1));

  return (
    <LabShell
      intro={
        <>
          Compare <strong>Nakamoto</strong> probabilistic finality (P(reversal) vs confirmation depth) to
          an <strong>Avalanche</strong>-style <strong>commit threshold</strong> over consecutive
          supermajority polls — same README math, two notions of &ldquo;done.&rdquo;
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="pc-z"
              label="Confirmations (z)"
              min={1}
              max={CHART_MAX_Z}
              value={confirmations}
              valueText={`${confirmations} blocks deep`}
              onChange={setConfirmations}
            />
            <RangeControl
              id="pc-q"
              label="Attacker hash power (q)"
              min={5}
              max={55}
              value={attackerPct}
              valueText={`${attackerPct}% attacker · ${100 - attackerPct}% honest`}
              onChange={setAttackerPct}
            />
            <RangeControl
              id="pc-av"
              label="Avalanche round"
              min={0}
              max={30}
              value={avalancheRound}
              valueText={`round ${avalancheRound}`}
              onChange={setAvalancheRound}
            />
            <RangeControl
              id="pc-red"
              label="Network Red bias"
              min={50}
              max={70}
              value={networkRedPct}
              valueText={`${networkRedPct}% prefer Red`}
              onChange={setNetworkRedPct}
            />
            <ScenarioPresets
              aria-label="Probabilistic consensus presets"
              presets={[
                { id: "btc", label: "Bitcoin 6 conf", onSelect: applyBitcoin },
                { id: "deep", label: "Deep z=10", onSelect: applyDeep },
                { id: "51", label: "51% attacker", onSelect: applyAttack },
              ]}
            />
          </div>

          <div className="lab__row">
            <button type="button" className="lab__btn" onClick={stepNakamoto}>
              Mine +1 block
            </button>
            <button type="button" className="lab__btn" onClick={stepAvalanche}>
              Avalanche poll
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={reset}>
              Reset
            </button>
          </div>

          <div className="prob-consensus-lab__dual">
            <div>
              <p className="prob-consensus-lab__legend">
                Nakamoto chain — gold = confirmed depth; dashed = genesis.
              </p>
              <div
                className={`prob-consensus-lab__chain ${reducedMotion ? "prob-consensus-lab__chain--static" : ""}`}
                role="img"
                aria-label={`${confirmations} confirmation blocks on honest chain`}
              >
                <div className="prob-consensus-lab__block prob-consensus-lab__block--genesis" title="Genesis">
                  G
                </div>
                {Array.from({ length: confirmations }, (_, i) => (
                  <div
                    key={i}
                    className={`prob-consensus-lab__block ${i === confirmations - 1 ? "prob-consensus-lab__block--active" : ""}`}
                    title={`Block ${i + 1}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <div
                className={`prob-consensus-lab__chart ${reducedMotion ? "prob-consensus-lab__chart--static" : ""}`}
                role="img"
                aria-label="P(reversal) by confirmation depth"
              >
                {reversalThreshold < maxReversal && (
                  <div
                    className="prob-consensus-lab__threshold"
                    style={{ bottom: `${Math.min(98, Math.max(2, thresholdY))}%` }}
                  >
                    <span className="prob-consensus-lab__threshold-label">
                      commit threshold {formatProbability(reversalThreshold)}
                    </span>
                  </div>
                )}
                {curve.map((pt) => {
                  const h = (pt.reversal / maxReversal) * 100;
                  const isCurrent = pt.z === confirmations;
                  const isSafe = pt.reversal <= reversalThreshold;
                  return (
                    <div key={pt.z} className="prob-consensus-lab__bar-wrap">
                      <div
                        className={`prob-consensus-lab__bar ${isCurrent ? "prob-consensus-lab__bar--current" : ""} ${isSafe ? "prob-consensus-lab__bar--safe" : ""}`}
                        style={{ height: `${h}%` }}
                        title={`z=${pt.z}: ${formatReversal(pt.reversal)}`}
                      />
                      <span className="prob-consensus-lab__bar-label">{pt.z}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="prob-consensus-lab__legend">
                Avalanche subsampling — lock after <strong>{avalancheCommit}</strong> consecutive α=
                {supermajorityAlpha} majorities (k={sampleK}).
              </p>
              <div
                className={`prob-consensus-lab__avalanche ${reducedMotion ? "prob-consensus-lab__avalanche--static" : ""}`}
              >
                <p className="prob-consensus-lab__sample">
                  Last poll: {snap.avalanche.redVotes}/{sampleK} Red → preference{" "}
                  <strong>{snap.avalanche.preference}</strong>
                </p>
                <div className="prob-consensus-lab__streak" role="progressbar" aria-valuenow={snap.avalanche.streak} aria-valuemin={0} aria-valuemax={avalancheCommit}>
                  <div
                    className="prob-consensus-lab__streak-fill"
                    style={{
                      width: `${Math.min(100, (snap.avalanche.streak / avalancheCommit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${confirmations}-${attackerPct}-${avalancheRound}-${networkRedPct}`}
        prompt={
          <>
            With <strong>q = {attackerPct}%</strong> and <strong>z = {confirmations}</strong>, is
            P(reversal) already below the exchange threshold (
            {formatProbability(reversalThreshold)})? (Avalanche streak: {snap.avalanche.streak}/
            {avalancheCommit}.)
          </>
        }
        storageKey="probabilistic-consensus"
        options={[
          { id: "yes", label: "Yes — reversal risk is below threshold", isCorrect: snap.nakamoto.meetsThreshold },
          { id: "no", label: "No — reversal risk is still above threshold", isCorrect: !snap.nakamoto.meetsThreshold },
        ]}
        revealLabel="Show probabilistic vs commit-threshold ground truth"
      >
        <ComparePanel
          leftLabel="Nakamoto (probabilistic)"
          rightLabel="Avalanche (threshold)"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Ground truth: honest wins when <strong>q &lt; 50%</strong>; reversal uses Poisson–Gambler
          sum from README. Avalanche lock is deterministic once streak ≥ threshold — unlike Bitcoin,
          no orphan probability after lock.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        z={confirmations}: {formatFinality(snap.nakamoto.finalityProb)} · Avalanche round {avalancheRound}:{" "}
        {snap.avalanche.locked
          ? "commit threshold met — metastable collapse complete."
          : `streak ${snap.avalanche.streak}/${avalancheCommit} — ${predictYes ? "Nakamoto threshold likely met." : "add blocks or lower q for exchange-grade finality."}`}
      </p>
    </LabShell>
  );
}
