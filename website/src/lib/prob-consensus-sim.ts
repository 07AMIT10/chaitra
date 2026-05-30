import {
  avalancheSupermajorityMet,
  nakamotoFinality,
  nakamotoReversalProbability,
} from "./prob-consensus-math";

export type ProbConsensusPreset = {
  id: string;
  label: string;
  attackerPct: number;
  confirmations: number;
  commitThreshold: number;
  networkRedPct: number;
  sampleK: number;
  supermajorityAlpha: number;
};

/** Exchange-style: 10% attacker, 6 blocks, ~0.01% reversal target */
export const BITCOIN_EXCHANGE_PRESET: ProbConsensusPreset = {
  id: "btc",
  label: "Bitcoin exchange (6 conf)",
  attackerPct: 10,
  confirmations: 6,
  commitThreshold: 0.0001,
  networkRedPct: 58,
  sampleK: 10,
  supermajorityAlpha: 7,
};

/** README reference: q = 10%, z = 10 */
export const NAKAMOTO_DEEP_PRESET: ProbConsensusPreset = {
  id: "deep",
  label: "Deep confirmations (z=10)",
  attackerPct: 10,
  confirmations: 10,
  commitThreshold: 0.000001,
  networkRedPct: 55,
  sampleK: 10,
  supermajorityAlpha: 7,
};

/** Majority attack — probabilistic safety breaks */
export const MAJORITY_ATTACK_PRESET: ProbConsensusPreset = {
  id: "attack",
  label: "51% attacker",
  attackerPct: 51,
  confirmations: 6,
  commitThreshold: 0.0001,
  networkRedPct: 50,
  sampleK: 10,
  supermajorityAlpha: 7,
};

export const PRESETS: ProbConsensusPreset[] = [
  BITCOIN_EXCHANGE_PRESET,
  NAKAMOTO_DEEP_PRESET,
  MAJORITY_ATTACK_PRESET,
];

export type NakamotoSnapshot = {
  confirmations: number;
  reversalProb: number;
  finalityProb: number;
  meetsThreshold: boolean;
  threshold: number;
};

export type AvalancheSnapshot = {
  round: number;
  redVotes: number;
  sampleK: number;
  supermajorityAlpha: number;
  streak: number;
  commitThreshold: number;
  locked: boolean;
  preference: "red" | "blue";
};

export type ProbConsensusSnapshot = {
  nakamoto: NakamotoSnapshot;
  avalanche: AvalancheSnapshot;
};

/** Deterministic PRNG for reproducible avalanche subsampling */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nakamotoSnapshot(
  confirmations: number,
  attackerPct: number,
  threshold: number
): NakamotoSnapshot {
  const q = attackerPct / 100;
  const reversalProb = nakamotoReversalProbability(confirmations, q);
  return {
    confirmations,
    reversalProb,
    finalityProb: nakamotoFinality(confirmations, q),
    meetsThreshold: reversalProb <= threshold,
    threshold,
  };
}

/** One Avalanche subsample round; networkRedPct = share of nodes preferring Red */
export function avalancheRound(
  round: number,
  networkRedPct: number,
  sampleK: number,
  supermajorityAlpha: number,
  commitThreshold: number,
  seed: number
): AvalancheSnapshot {
  const rng = mulberry32(seed + round * 997);
  const pRed = networkRedPct / 100;
  let redVotes = 0;
  for (let i = 0; i < sampleK; i++) {
    if (rng() < pRed) redVotes += 1;
  }
  const met = avalancheSupermajorityMet(redVotes, supermajorityAlpha);
  let streak = 0;
  for (let r = 0; r <= round; r++) {
    const snap = avalancheRoundOnce(r, networkRedPct, sampleK, supermajorityAlpha, seed);
    if (snap.met) streak += 1;
    else streak = 0;
  }
  return {
    round,
    redVotes,
    sampleK,
    supermajorityAlpha,
    streak,
    commitThreshold,
    locked: streak >= commitThreshold,
    preference: met ? "red" : "blue",
  };
}

function avalancheRoundOnce(
  round: number,
  networkRedPct: number,
  sampleK: number,
  supermajorityAlpha: number,
  seed: number
): { met: boolean; redVotes: number } {
  const rng = mulberry32(seed + round * 997);
  const pRed = networkRedPct / 100;
  let redVotes = 0;
  for (let i = 0; i < sampleK; i++) {
    if (rng() < pRed) redVotes += 1;
  }
  return { met: avalancheSupermajorityMet(redVotes, supermajorityAlpha), redVotes };
}

export function snapshotAtRound(
  confirmations: number,
  attackerPct: number,
  reversalThreshold: number,
  avalancheRoundNum: number,
  networkRedPct: number,
  sampleK: number,
  supermajorityAlpha: number,
  avalancheCommitThreshold: number,
  seed: number
): ProbConsensusSnapshot {
  return {
    nakamoto: nakamotoSnapshot(confirmations, attackerPct, reversalThreshold),
    avalanche: avalancheRound(
      avalancheRoundNum,
      networkRedPct,
      sampleK,
      supermajorityAlpha,
      avalancheCommitThreshold,
      seed
    ),
  };
}

/** P(reversal) at each confirmation depth for chart */
export function reversalCurve(
  attackerPct: number,
  maxZ: number
): { z: number; reversal: number; finality: number }[] {
  const q = attackerPct / 100;
  const out: { z: number; reversal: number; finality: number }[] = [];
  for (let z = 1; z <= maxZ; z++) {
    const reversal = nakamotoReversalProbability(z, q);
    out.push({ z, reversal, finality: 1 - reversal });
  }
  return out;
}

export function roundsToAvalancheLock(
  networkRedPct: number,
  sampleK: number,
  supermajorityAlpha: number,
  commitThreshold: number,
  seed: number,
  maxRounds = 60
): number {
  for (let r = 0; r <= maxRounds; r++) {
    const snap = avalancheRound(r, networkRedPct, sampleK, supermajorityAlpha, commitThreshold, seed);
    if (snap.locked) return r;
  }
  return -1;
}
