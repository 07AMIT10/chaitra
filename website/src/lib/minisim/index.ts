/** Tier B mini-simulation helpers */

export function estimatePi(samples: number, seed = 42): { estimate: number; inside: number } {
  let s = seed;
  let inside = 0;
  for (let i = 0; i < samples; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = s / 0x7fffffff;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const y = s / 0x7fffffff;
    if (x * x + y * y <= 1) inside++;
  }
  return { estimate: (4 * inside) / samples, inside };
}

export function entropy(probs: number[]): number {
  return -probs.filter((p) => p > 0).reduce((sum, p) => sum + p * Math.log2(p), 0);
}

export function diceRolls(n: number, sides: number, seed = 42): number[] {
  let s = seed;
  const hist = Array(sides).fill(0);
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    hist[s % sides]++;
  }
  return hist;
}

export function pagerankStep(
  links: number[][],
  ranks: number[],
  damping: number
): number[] {
  const n = ranks.length;
  const next = Array(n).fill((1 - damping) / n);
  for (let i = 0; i < n; i++) {
    const out = links[i].length || n;
    for (const j of links[i].length ? links[i] : Array.from({ length: n }, (_, k) => k)) {
      next[j] += damping * ranks[i] / out;
    }
  }
  return next;
}

export const DEMO_GRAPH = [
  [1, 2],
  [0, 2],
  [0, 1],
  [1],
];

export function redDropProb(queueFill: number, minThresh: number, maxThresh: number): number {
  if (queueFill < minThresh) return 0;
  if (queueFill >= maxThresh) return 1;
  return (queueFill - minThresh) / (maxThresh - minThresh);
}

export function mctsValue(exploration: number, wins: number, visits: number, parentVisits: number): number {
  if (visits === 0) return Infinity;
  return wins / visits + exploration * Math.sqrt(Math.log(parentVisits + 1) / visits);
}

export function attentionWeights(q: number[], k: number[]): number[] {
  const scores = k.map((kv, i) => q[i] * kv);
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => e / sum);
}

export function moeRoute(token: number[], experts: number[][], topK: number): number[] {
  const scores = experts.map((e) => e.reduce((s, w, i) => s + w * token[i], 0));
  const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
  return indexed.slice(0, topK).map((x) => x.i);
}

export function versionVectorMerge(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged: Record<string, number> = {};
  for (const k of keys) merged[k] = Math.max(a[k] ?? 0, b[k] ?? 0);
  return merged;
}

export function mapReduceProgress(tasks: number, failedAt: number | null): number[] {
  const stages = ["map", "shuffle", "reduce"];
  const progress: number[] = [];
  for (let t = 0; t < tasks; t++) {
    for (let s = 0; s < stages.length; s++) {
      if (failedAt !== null && t === failedAt && s === 1) continue;
      progress.push((t * 3 + s + 1) / (tasks * 3));
    }
  }
  return progress;
}

export function bayesianUpdate(prior: number, likelihood: number): number {
  const notH = 1 - prior;
  const notE = 1 - likelihood;
  const num = prior * likelihood;
  const den = num + notH * notE;
  return den > 0 ? num / den : prior;
}

export function probabilisticFinality(rounds: number, honestPct: number): number {
  return 1 - Math.pow(1 - honestPct, rounds);
}

export function windowAggregate(events: number[], windowSize: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < events.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    out.push(events.slice(start, i + 1).reduce((a, b) => a + b, 0));
  }
  return out;
}

export function schedulingHistogram(tasks: number, workers: number, seed = 42): number[] {
  let s = seed;
  const loads = Array(workers).fill(0);
  for (let i = 0; i < tasks; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    loads[s % workers]++;
  }
  return loads;
}

export function uncertainQuery(confidence: number, threshold: number): boolean {
  return confidence >= threshold;
}

export function cacheHitRatio(bloomFpr: number, cmsError: number): number {
  return Math.max(0, 1 - bloomFpr - cmsError * 0.1);
}

export function gossipVsRaftRound(mode: "raft" | "gossip", round: number, n: number): number {
  if (mode === "raft") return round >= 1 ? 100 : 0;
  return Math.min(100, (1 - Math.pow(1 - 2 / n, round)) * 100);
}

export function distributedQueueLag(partitions: number, skew: number): number {
  return partitions * skew * 0.5;
}

export function mctsTreeDepth(maxDepth: number, exploration: number): number {
  return Math.min(maxDepth, Math.floor(3 + exploration * 2));
}

export function lasVegasSuccess(trials: number, p: number): number {
  return 1 - Math.pow(1 - p, trials);
}

export function probDbTupleConfidence(values: number[]): number {
  return values.reduce((a, b) => a * b, 1);
}

export function bayesianNetworkBelief(prior: number, evidenceStrength: number): number {
  return bayesianUpdate(prior, evidenceStrength);
}

export function streamingSketchDemo(events: number): { cms: number; hll: number; bloom: number } {
  return {
    cms: Math.min(events, events * 0.02),
    hll: Math.log2(events + 1) * 10,
    bloom: events * 0.001,
  };
}

export function transformerDotProductScale(dim: number): number {
  return 1 / Math.sqrt(dim);
}

export function tokenRoutingLoad(experts: number, tokens: number, topK: number): number[] {
  const loads = Array(experts).fill(0);
  for (let t = 0; t < tokens; t++) {
    loads[t % experts]++;
    if (topK > 1) loads[(t + 1) % experts]++;
  }
  return loads;
}

export function consensusLogEntries(round: number, replicas: number): number {
  return round * replicas;
}

export function probabilisticConsensusThreshold(rounds: number, threshold: number): boolean {
  return rounds >= threshold;
}

export function eventTimelineWatermark(events: number, lateness: number): number {
  return Math.max(0, events - lateness);
}

export function approximateCacheBloomBits(items: number, fpr: number): number {
  return Math.ceil(-(items * Math.log(fpr)) / (Math.LN2 * Math.LN2));
}
