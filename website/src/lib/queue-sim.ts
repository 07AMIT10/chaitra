/** Discrete-event M/M/1 queue simulation (Poisson arrivals, exponential service). */

export type QueueSimResult = {
  rho: number;
  avgQueue: number;
  avgWait: number;
  maxQueue: number;
  events: { time: number; queue: number; wait: number }[];
};

export function mm1Sim(
  lambda: number,
  mu: number,
  duration: number,
  seed = 42
): QueueSimResult {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const rho = lambda / mu;
  const events: { time: number; queue: number; wait: number }[] = [];
  let t = 0;
  let queue = 0;
  let busy = false;
  let nextArrival = -Math.log(1 - rand()) / lambda;
  let nextDeparture = Infinity;
  let sumQueue = 0;
  let sumWait = 0;
  let maxQueue = 0;
  let nServed = 0;

  while (t < duration) {
    if (nextArrival <= nextDeparture) {
      t = nextArrival;
      queue++;
      sumQueue += queue;
      maxQueue = Math.max(maxQueue, queue);
      if (!busy) {
        busy = true;
        nextDeparture = t + -Math.log(1 - rand()) / mu;
      }
      nextArrival = t + -Math.log(1 - rand()) / lambda;
    } else {
      t = nextDeparture;
      if (queue > 0) {
        const wait = queue > 1 ? (queue - 1) / mu : 0;
        sumWait += wait;
        nServed++;
        queue--;
      }
      sumQueue += queue;
      if (queue > 0) nextDeparture = t + -Math.log(1 - rand()) / mu;
      else {
        busy = false;
        nextDeparture = Infinity;
      }
    }
    events.push({ time: t, queue, wait: nServed > 0 ? sumWait / nServed : 0 });
  }

  const nEvents = events.length || 1;
  return {
    rho,
    avgQueue: sumQueue / nEvents,
    avgWait: nServed > 0 ? sumWait / nServed : 0,
    maxQueue,
    events: events.filter((_, i) => i % Math.max(1, Math.floor(events.length / 80)) === 0),
  };
}

/** Average sim wait / queue over independent seeds (reduces single-run noise). */
export function mm1SimAverage(
  lambda: number,
  mu: number,
  duration: number,
  trials: number,
  baseSeed = 42
): { avgWait: number; avgQueue: number; maxQueue: number; rho: number } {
  let sumWait = 0;
  let sumQueue = 0;
  let maxQueue = 0;
  const n = Math.max(1, trials);
  for (let i = 0; i < n; i++) {
    const r = mm1Sim(lambda, mu, duration, baseSeed + i * 997);
    sumWait += r.avgWait;
    sumQueue += r.avgQueue;
    maxQueue = Math.max(maxQueue, r.maxQueue);
  }
  return {
    rho: lambda / mu,
    avgWait: sumWait / n,
    avgQueue: sumQueue / n,
    maxQueue,
  };
}
