import {
  actualDropProbability,
  baseDropProbability,
  ewmaUpdate,
} from "./red-math";

export type RedConfig = {
  capacity: number;
  minTh: number;
  maxTh: number;
  pMax: number;
  wq: number;
};

export type RouterMode = "red" | "tail-drop";

export type PacketStep = {
  index: number;
  instantQ: number;
  avgQ: number;
  accepted: boolean;
  pb: number;
  pa: number;
};

export type SimSummary = {
  accepted: number;
  dropped: number;
  maxInstantQ: number;
  maxAvgQ: number;
  hitFull: boolean;
};

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Decide RED drop for one arrival; updates count when a drop occurs in prob zone. */
export function decideRedDrop(
  avgQ: number,
  config: RedConfig,
  countSinceLastDrop: number,
  rand: number
): { drop: boolean; pb: number; pa: number; nextCount: number } {
  const { capacity, minTh, maxTh, pMax } = config;
  const pb = baseDropProbability(avgQ, capacity, minTh, maxTh, pMax);
  if (pb <= 0) return { drop: false, pb: 0, pa: 0, nextCount: countSinceLastDrop + 1 };
  if (pb >= 1) return { drop: true, pb: 1, pa: 1, nextCount: 0 };
  const pa = actualDropProbability(pb, countSinceLastDrop);
  const drop = rand < pa;
  return { drop, pb, pa, nextCount: drop ? 0 : countSinceLastDrop + 1 };
}

/** Simulate packet arrivals with simple per-step service drain. */
export function simulateRouter(
  mode: RouterMode,
  config: RedConfig,
  packetCount: number,
  arrivalBurst: number,
  seed = 42
): { steps: PacketStep[]; summary: SimSummary } {
  const rand = mulberry32(seed);
  const { capacity } = config;
  let q = 0;
  let avgQ = 0;
  let countSinceDrop = 0;
  const steps: PacketStep[] = [];
  let maxInstantQ = 0;
  let maxAvgQ = 0;

  for (let i = 0; i < packetCount; i++) {
    const service = rand() < 0.35 ? 1 : 0;
    q = Math.max(0, q - service);

    const arrivalsThisStep = Math.max(1, Math.round(arrivalBurst * (0.7 + rand() * 0.6)));
    for (let a = 0; a < arrivalsThisStep; a++) {
      avgQ = ewmaUpdate(avgQ, q, config.wq);
      let accepted = false;
      let pb = 0;
      let pa = 0;

      if (mode === "tail-drop") {
        if (q < capacity) {
          q++;
          accepted = true;
        }
        pb = q >= capacity ? 1 : 0;
      } else {
        const decision = decideRedDrop(avgQ, config, countSinceDrop, rand());
        pb = decision.pb;
        pa = decision.pa;
        countSinceDrop = decision.nextCount;
        if (!decision.drop && q < capacity) {
          q++;
          accepted = true;
        }
      }

      maxInstantQ = Math.max(maxInstantQ, q);
      maxAvgQ = Math.max(maxAvgQ, avgQ);
      steps.push({
        index: steps.length,
        instantQ: q,
        avgQ,
        accepted,
        pb,
        pa,
      });
    }
  }

  const accepted = steps.filter((s) => s.accepted).length;
  const dropped = steps.length - accepted;
  return {
    steps,
    summary: {
      accepted,
      dropped,
      maxInstantQ,
      maxAvgQ,
      hitFull: maxInstantQ >= capacity,
    },
  };
}

export function compareModes(
  config: RedConfig,
  packetCount: number,
  arrivalBurst: number,
  seed = 42
): { red: SimSummary; tail: SimSummary } {
  return {
    red: simulateRouter("red", config, packetCount, arrivalBurst, seed).summary,
    tail: simulateRouter("tail-drop", config, packetCount, arrivalBurst, seed + 1).summary,
  };
}

/** Sample drop probability curves across fill fractions (avg ≈ fill for chart). */
export function sampleDropCurves(
  config: RedConfig,
  points = 21
): { fill: number; redPb: number; tailP: number }[] {
  const out: { fill: number; redPb: number; tailP: number }[] = [];
  for (let i = 0; i < points; i++) {
    const fill = i / (points - 1);
    const avgQ = fill * config.capacity;
    out.push({
      fill,
      redPb: baseDropProbability(avgQ, config.capacity, config.minTh, config.maxTh, config.pMax),
      tailP: fill >= 1 ? 1 : 0,
    });
  }
  return out;
}

export const CALM_LINK_PRESET: RedConfig = {
  capacity: 50,
  minTh: 0.2,
  maxTh: 0.9,
  pMax: 0.1,
  wq: 0.002,
};

export const RED_GENTLE_PRESET: RedConfig = {
  capacity: 50,
  minTh: 0.2,
  maxTh: 0.8,
  pMax: 0.1,
  wq: 0.008,
};

export const TAIL_DROP_CLIFF_PRESET: RedConfig = {
  capacity: 40,
  minTh: 0.15,
  maxTh: 0.75,
  pMax: 0.1,
  wq: 0.002,
};

export const GENTLE_ARRIVAL = 1.2;
export const BURST_ARRIVAL = 3.5;
export const SATURATE_ARRIVAL = 5.5;
