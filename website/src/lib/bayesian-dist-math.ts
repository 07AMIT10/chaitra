/**
 * Small cluster belief network — BAYESIAN_DISTRIBUTED_SYSTEMS/README.md.
 *
 * Latent: S (switch faulty), F_A / F_B (server hardware failed).
 * Observations: noisy pings, DB timeout, user request fail.
 * Correlated pings favor S; isolated alarms favor individual F_*.
 */

import { clamp01, formatPercent, formatPosterior, marginalEvidence, posterior } from "./bayesian-inf-math.ts";

export type ServerObservation = "slow" | "ok" | "unknown";
export type SymptomObservation = "present" | "absent" | "unknown";

export type ClusterNetworkParams = {
  priorSwitchFault: number;
  priorServerAFault: number;
  priorServerBFault: number;
  /** P(ping slow | switch faulty) — shared congestion on both hosts. */
  pPingSlowGivenSwitch: number;
  /** P(ping slow | server failed). */
  pPingSlowGivenServerFault: number;
  /** P(ping slow | all healthy). */
  pPingSlowHealthy: number;
  pDbTimeoutGivenServerFault: number;
  pDbTimeoutGivenOk: number;
  pUserFailGivenServerFault: number;
  pUserFailGivenOk: number;
};

export const DEFAULT_NETWORK: ClusterNetworkParams = {
  priorSwitchFault: 0.05,
  priorServerAFault: 0.02,
  priorServerBFault: 0.02,
  pPingSlowGivenSwitch: 0.96,
  pPingSlowGivenServerFault: 0.94,
  pPingSlowHealthy: 0.04,
  pDbTimeoutGivenServerFault: 0.95,
  pDbTimeoutGivenOk: 0.01,
  pUserFailGivenServerFault: 0.95,
  pUserFailGivenOk: 0.01,
};

export type ClusterObservations = {
  serverA: ServerObservation;
  serverB: ServerObservation;
  dbTimeout: SymptomObservation;
  userFail: SymptomObservation;
};

export const EMPTY_OBSERVATIONS: ClusterObservations = {
  serverA: "unknown",
  serverB: "unknown",
  dbTimeout: "unknown",
  userFail: "unknown",
};

export { clamp01, formatPercent, formatPosterior, marginalEvidence, posterior };

function pingLikelihood(
  slow: boolean,
  switchFaulty: boolean,
  serverFaulty: boolean,
  params: ClusterNetworkParams
): number {
  let pSlow = params.pPingSlowHealthy;
  if (switchFaulty) pSlow = 1 - (1 - pSlow) * (1 - params.pPingSlowGivenSwitch);
  if (serverFaulty) pSlow = 1 - (1 - pSlow) * (1 - params.pPingSlowGivenServerFault);
  return slow ? pSlow : 1 - pSlow;
}

function symptomFromSwitchAndFault(
  present: boolean,
  switchFaulty: boolean,
  serverFaulty: boolean,
  pGivenSwitch: number,
  pGivenFault: number,
  pGivenOk: number
): number {
  let p = pGivenOk;
  if (switchFaulty) p = 1 - (1 - p) * (1 - pGivenSwitch);
  if (serverFaulty) p = 1 - (1 - p) * (1 - pGivenFault);
  return present ? p : 1 - p;
}

function stateLikelihood(
  switchFaulty: boolean,
  fA: boolean,
  fB: boolean,
  obs: ClusterObservations,
  params: ClusterNetworkParams
): number {
  let like = 1;

  if (obs.serverA !== "unknown") {
    like *= pingLikelihood(obs.serverA === "slow", switchFaulty, fA, params);
  }
  if (obs.serverB !== "unknown") {
    like *= pingLikelihood(obs.serverB === "slow", switchFaulty, fB, params);
  }
  if (obs.dbTimeout !== "unknown") {
    like *= symptomFromSwitchAndFault(
      obs.dbTimeout === "present",
      switchFaulty,
      fA,
      0.88,
      params.pDbTimeoutGivenServerFault,
      params.pDbTimeoutGivenOk
    );
  }
  if (obs.userFail !== "unknown") {
    like *= symptomFromSwitchAndFault(
      obs.userFail === "present",
      switchFaulty,
      fB,
      0.88,
      params.pUserFailGivenServerFault,
      params.pUserFailGivenOk
    );
  }
  return like;
}

function enumeratePosterior(
  params: ClusterNetworkParams,
  obs: ClusterObservations,
  target: "switch" | "serverA" | "serverB"
): number {
  const priorS = clamp01(params.priorSwitchFault);
  const priorA = clamp01(params.priorServerAFault);
  const priorB = clamp01(params.priorServerBFault);
  let num = 0;
  let den = 0;

  for (const switchFaulty of [false, true]) {
    for (const fA of [false, true]) {
      for (const fB of [false, true]) {
        const pState =
          (switchFaulty ? priorS : 1 - priorS) *
          (fA ? priorA : 1 - priorA) *
          (fB ? priorB : 1 - priorB);
        const like = pState * stateLikelihood(switchFaulty, fA, fB, obs, params);
        den += like;
        if (target === "switch" && switchFaulty) num += like;
        if (target === "serverA" && fA) num += like;
        if (target === "serverB" && fB) num += like;
      }
    }
  }
  return den > 0 ? num / den : target === "switch" ? priorS : target === "serverA" ? priorA : priorB;
}

/** Posterior P(switch faulty | observations). */
export function posteriorSwitchJoint(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): number {
  return enumeratePosterior(params, obs, "switch");
}

/** Marginal P(server A hardware failed | observations). */
export function posteriorServerAFault(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): number {
  return enumeratePosterior(params, obs, "serverA");
}

export function posteriorServerBFault(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): number {
  return enumeratePosterior(params, obs, "serverB");
}

/** @deprecated alias for lab metrics — server A failure probability. */
export function posteriorServerASlow(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): number {
  return posteriorServerAFault(params, obs);
}

export function posteriorServerBSlow(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): number {
  return posteriorServerBFault(params, obs);
}

/** Naive sequential: each alarm as independent evidence on S (thundering-herd mistake). */
export function posteriorSwitchNaiveSequential(
  params: ClusterNetworkParams,
  obs: ClusterObservations
): number {
  let p = params.priorSwitchFault;
  const chips: { leH: number; leNotH: number }[] = [];

  const lePingSwitch = params.pPingSlowGivenSwitch;
  const lePingHealthy = params.pPingSlowHealthy;

  if (obs.serverA === "slow") {
    chips.push({ leH: lePingSwitch, leNotH: lePingHealthy });
  } else if (obs.serverA === "ok") {
    chips.push({ leH: 1 - lePingSwitch, leNotH: 1 - lePingHealthy });
  }
  if (obs.serverB === "slow") {
    chips.push({ leH: lePingSwitch, leNotH: lePingHealthy });
  } else if (obs.serverB === "ok") {
    chips.push({ leH: 1 - lePingSwitch, leNotH: 1 - lePingHealthy });
  }
  if (obs.dbTimeout === "present") {
    const leH =
      params.priorServerAFault * params.pDbTimeoutGivenServerFault +
      (1 - params.priorServerAFault) * params.pDbTimeoutGivenOk;
    const leNotH = params.pDbTimeoutGivenOk;
    chips.push({ leH, leNotH });
  }
  if (obs.userFail === "present") {
    const leH =
      params.priorServerBFault * params.pUserFailGivenServerFault +
      (1 - params.priorServerBFault) * params.pUserFailGivenOk;
    const leNotH = params.pUserFailGivenOk;
    chips.push({ leH, leNotH });
  }

  for (const c of chips) {
    p = posterior(p, c.leH, c.leNotH);
  }
  return p;
}

export function deterministicWouldRebootA(obs: ClusterObservations): boolean {
  return obs.serverA === "slow" || obs.dbTimeout === "present";
}

export function readmeSwitchCongestionGroundTruth(
  params: ClusterNetworkParams = DEFAULT_NETWORK
): { jointPosterior: number; naivePosterior: number; wouldRebootA: boolean } {
  const obs: ClusterObservations = {
    serverA: "unknown",
    serverB: "unknown",
    dbTimeout: "present",
    userFail: "present",
  };
  return {
    jointPosterior: posteriorSwitchJoint(params, obs),
    naivePosterior: posteriorSwitchNaiveSequential(params, obs),
    wouldRebootA: deterministicWouldRebootA(obs),
  };
}

export function minisimBelief(prior: number, evidenceStrength: number): number {
  return posterior(prior, evidenceStrength, 1 - evidenceStrength);
}
