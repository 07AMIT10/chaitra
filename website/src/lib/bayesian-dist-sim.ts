/** Telemetry chips and cluster belief state for the Bayesian distributed systems lab. */

import {
  DEFAULT_NETWORK,
  EMPTY_OBSERVATIONS,
  type ClusterNetworkParams,
  type ClusterObservations,
  type ServerObservation,
  type SymptomObservation,
  deterministicWouldRebootA,
  posteriorServerASlow,
  posteriorServerBSlow,
  posteriorSwitchJoint,
  posteriorSwitchNaiveSequential,
  readmeSwitchCongestionGroundTruth,
} from "./bayesian-dist-math";

export type TelemetryChip = {
  id: string;
  label: string;
  shortLabel: string;
  apply: (obs: ClusterObservations) => ClusterObservations;
};

export type TelemetryStep = {
  chip: TelemetryChip;
  obs: ClusterObservations;
  pSwitch: number;
  pSwitchNaive: number;
  pServerA: number;
  pServerB: number;
};

export type ClusterBeliefState = {
  observations: ClusterObservations;
  steps: TelemetryStep[];
};

export const SERVER_A_SLOW_CHIP: TelemetryChip = {
  id: "a-slow",
  label: "Server A: 500ms ping",
  shortLabel: "A slow",
  apply: (obs) => ({ ...obs, serverA: "slow" }),
};

export const SERVER_B_SLOW_CHIP: TelemetryChip = {
  id: "b-slow",
  label: "Server B: 500ms ping",
  shortLabel: "B slow",
  apply: (obs) => ({ ...obs, serverB: "slow" }),
};

export const SERVER_A_OK_CHIP: TelemetryChip = {
  id: "a-ok",
  label: "Server A: normal ping",
  shortLabel: "A ok",
  apply: (obs) => ({ ...obs, serverA: "ok" }),
};

export const SERVER_B_OK_CHIP: TelemetryChip = {
  id: "b-ok",
  label: "Server B: normal ping",
  shortLabel: "B ok",
  apply: (obs) => ({ ...obs, serverB: "ok" }),
};

export const DB_TIMEOUT_CHIP: TelemetryChip = {
  id: "db-timeout",
  label: "Database timeout",
  shortLabel: "DB timeout",
  apply: (obs) => ({ ...obs, dbTimeout: "present" }),
};

export const USER_FAIL_CHIP: TelemetryChip = {
  id: "user-fail",
  label: "User request fails",
  shortLabel: "user fail",
  apply: (obs) => ({ ...obs, userFail: "present" }),
};

export const QUIET_DB_CHIP: TelemetryChip = {
  id: "db-ok",
  label: "Database healthy",
  shortLabel: "DB ok",
  apply: (obs) => ({ ...obs, dbTimeout: "absent" }),
};

export const TELEMETRY_CHIPS: TelemetryChip[] = [
  SERVER_A_SLOW_CHIP,
  SERVER_B_SLOW_CHIP,
  DB_TIMEOUT_CHIP,
  USER_FAIL_CHIP,
  SERVER_A_OK_CHIP,
  SERVER_B_OK_CHIP,
  QUIET_DB_CHIP,
];

export const SWITCH_CONGESTION_PRESET = {
  priorPct: 5,
  pSlowSwitchPct: 92,
  pSlowHealthyPct: 6,
  chipIds: ["a-slow", "b-slow"] as const,
};

export const SYMPTOM_PAIR_PRESET = {
  priorPct: 5,
  pSlowSwitchPct: 92,
  pSlowHealthyPct: 6,
  chipIds: ["db-timeout", "user-fail"] as const,
};

export const SINGLE_SERVER_PRESET = {
  priorPct: 5,
  pSlowSwitchPct: 92,
  pSlowHealthyPct: 6,
  chipIds: ["a-slow"] as const,
};

export function chipById(id: string): TelemetryChip | undefined {
  return TELEMETRY_CHIPS.find((c) => c.id === id);
}

export function paramsFromSliders(
  priorPct: number,
  pSlowSwitchPct: number,
  pSlowHealthyPct: number
): ClusterNetworkParams {
  return {
    ...DEFAULT_NETWORK,
    priorSwitchFault: priorPct / 100,
    pPingSlowGivenSwitch: pSlowSwitchPct / 100,
    pPingSlowHealthy: pSlowHealthyPct / 100,
  };
}

export function inferBelief(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): Omit<TelemetryStep, "chip"> {
  return {
    obs,
    pSwitch: posteriorSwitchJoint(params, obs),
    pSwitchNaive: posteriorSwitchNaiveSequential(params, obs),
    pServerA: posteriorServerASlow(params, obs),
    pServerB: posteriorServerBSlow(params, obs),
  };
}

export function emptyClusterBelief(): ClusterBeliefState {
  return { observations: { ...EMPTY_OBSERVATIONS }, steps: [] };
}

export function applyTelemetryChip(
  state: ClusterBeliefState,
  params: ClusterNetworkParams,
  chip: TelemetryChip
): ClusterBeliefState {
  const observations = chip.apply(state.observations);
  const inferred = inferBelief(params, observations);
  return {
    observations,
    steps: [...state.steps, { chip, ...inferred }],
  };
}

export function applyChipSequence(
  params: ClusterNetworkParams,
  chips: TelemetryChip[]
): ClusterBeliefState {
  let state = emptyClusterBelief();
  for (const chip of chips) {
    state = applyTelemetryChip(state, params, chip);
  }
  return state;
}

export function resetClusterBelief(params: ClusterNetworkParams): ClusterBeliefState {
  void params;
  return emptyClusterBelief();
}

export function switchCongestionGroundTruth(params: ClusterNetworkParams): {
  jointPosterior: number;
  naivePosterior: number;
  wouldRebootA: boolean;
  pServerA: number;
  correctAction: string;
  wrongAction: string;
} {
  const obsBothSlow: ClusterObservations = {
    serverA: "slow",
    serverB: "slow",
    dbTimeout: "unknown",
    userFail: "unknown",
  };
  const readme = readmeSwitchCongestionGroundTruth(params);
  const pSwitchBoth = posteriorSwitchJoint(params, obsBothSlow);
  const pServerA = posteriorServerASlow(params, obsBothSlow);

  return {
    ...readme,
    pServerA,
    correctAction: `Route around switch (P(switch)=${formatShort(pSwitchBoth)})`,
    wrongAction: `Reboot Server A (P(A dead)=${formatShort(pServerA)} — correlated alarms)`,
  };
}

function formatShort(fraction: number): string {
  if (fraction >= 0.995) return "~100%";
  return `${(fraction * 100).toFixed(0)}%`;
}

export {
  DEFAULT_NETWORK,
  EMPTY_OBSERVATIONS,
  deterministicWouldRebootA,
  posteriorSwitchJoint,
  posteriorSwitchNaiveSequential,
  readmeSwitchCongestionGroundTruth,
  type ClusterNetworkParams,
  type ClusterObservations,
  type ServerObservation,
  type SymptomObservation,
};
