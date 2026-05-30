/** Evidence chips and sequential belief updates for the Bayesian inference lab. */

import { marginalEvidence, posterior } from "./bayesian-inf-math";

export type EvidenceChip = {
  id: string;
  label: string;
  shortLabel: string;
  likelihoodGivenH: number;
  likelihoodGivenNotH: number;
};

export type BeliefStep = {
  chip: EvidenceChip;
  prior: number;
  posterior: number;
  marginal: number;
};

export type BeliefState = {
  currentPrior: number;
  steps: BeliefStep[];
};

export const POSITIVE_TEST_CHIP: EvidenceChip = {
  id: "pos-test",
  label: "Positive test",
  shortLabel: "+ test",
  likelihoodGivenH: 0.99,
  likelihoodGivenNotH: 0.01,
};

export const NEGATIVE_TEST_CHIP: EvidenceChip = {
  id: "neg-test",
  label: "Negative test",
  shortLabel: "− test",
  likelihoodGivenH: 0.01,
  likelihoodGivenNotH: 0.99,
};

export const ERROR_LOGS_CHIP: EvidenceChip = {
  id: "error-logs",
  label: "Error logs spike",
  shortLabel: "errors",
  likelihoodGivenH: 0.92,
  likelihoodGivenNotH: 0.08,
};

export const QUIET_METRICS_CHIP: EvidenceChip = {
  id: "quiet",
  label: "Metrics normal",
  shortLabel: "quiet",
  likelihoodGivenH: 0.05,
  likelihoodGivenNotH: 0.95,
};

export const CONVERSION_BURST_CHIP: EvidenceChip = {
  id: "conv-burst",
  label: "15 / 100 conversions",
  shortLabel: "15%",
  likelihoodGivenH: 0.7,
  likelihoodGivenNotH: 0.25,
};

export const CONVERSION_STEADY_CHIP: EvidenceChip = {
  id: "conv-steady",
  label: "1000 / 10000 conversions",
  shortLabel: "10%",
  likelihoodGivenH: 0.55,
  likelihoodGivenNotH: 0.45,
};

export const EVIDENCE_CHIPS: EvidenceChip[] = [
  POSITIVE_TEST_CHIP,
  NEGATIVE_TEST_CHIP,
  ERROR_LOGS_CHIP,
  QUIET_METRICS_CHIP,
  CONVERSION_BURST_CHIP,
  CONVERSION_STEADY_CHIP,
];

export const RARE_DISEASE_PRESET = {
  priorPct: 0.0001,
  likeGivenHPct: 99,
  likeGivenNotHPct: 1,
  chipIds: ["pos-test"] as const,
};

export const SERVER_ALARM_PRESET = {
  priorPct: 5,
  likeGivenHPct: 92,
  likeGivenNotHPct: 8,
  chipIds: ["error-logs"] as const,
};

export const AB_SEQUENTIAL_PRESET = {
  priorPct: 50,
  likeGivenHPct: 70,
  likeGivenNotHPct: 25,
  chipIds: ["conv-burst", "conv-steady"] as const,
};

export function chipById(id: string): EvidenceChip | undefined {
  return EVIDENCE_CHIPS.find((c) => c.id === id);
}

export function applyChip(state: BeliefState, chip: EvidenceChip): BeliefState {
  const prior = state.currentPrior;
  const post = posterior(prior, chip.likelihoodGivenH, chip.likelihoodGivenNotH);
  const marg = marginalEvidence(prior, chip.likelihoodGivenH, chip.likelihoodGivenNotH);
  return {
    currentPrior: post,
    steps: [...state.steps, { chip, prior, posterior: post, marginal: marg }],
  };
}

export function applyChipSequence(initialPrior: number, chips: EvidenceChip[]): BeliefState {
  let state: BeliefState = { currentPrior: initialPrior, steps: [] };
  for (const chip of chips) {
    state = applyChip(state, chip);
  }
  return state;
}

export function emptyBelief(initialPrior: number): BeliefState {
  return { currentPrior: initialPrior, steps: [] };
}

/** README rare-disease ground truth: true disease rate 1e-6, positive test. */
export function rareDiseaseGroundTruth(): {
  analyticPosterior: number;
  intuitiveWrong: string;
  correctLabel: string;
} {
  const prior = 1e-6;
  const analyticPosterior = posterior(prior, 0.99, 0.01);
  return {
    analyticPosterior,
    intuitiveWrong: "99% (confuses P(H|E) with P(E|H))",
    correctLabel: `Bayesian ${formatPosteriorShort(analyticPosterior)}`,
  };
}

function formatPosteriorShort(fraction: number): string {
  if (fraction < 1e-4) return `${(fraction * 100).toExponential(2)}%`;
  return `${(fraction * 100).toFixed(2)}%`;
}

/** Custom observation from slider likelihoods (not a catalog chip). */
export function customObservationChip(
  likelihoodGivenH: number,
  likelihoodGivenNotH: number
): EvidenceChip {
  return {
    id: `custom-${Date.now()}`,
    label: "Custom observation",
    shortLabel: "observe",
    likelihoodGivenH,
    likelihoodGivenNotH,
  };
}

// Re-export math helpers used by the lab for slider preview
export { marginalEvidence, posterior } from "./bayesian-inf-math";
