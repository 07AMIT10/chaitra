import { buildBitArray, bloomMaybeContains } from "./bloom-sim";
import { CountMinSketch } from "./cms-sim";
import { HyperLogLog, exactDistinct } from "./hll-sim";
import {
  DEFAULT_CHAIN_CONFIG,
  type SketchChainConfig,
} from "./streaming-algo-math";
import {
  distinctKeys,
  shuffleStream,
  streamPrefix,
  syntheticStream,
  truthFromStream,
  type StreamEvent,
} from "./sketches";

const HEAVY_IP = "10.0.0.1";
const MEDIUM_IP = "10.0.0.2";
const LIGHT_IP = "10.0.0.3";
const NOISE_COUNT = 120;

/** Synthetic router packet stream — one shuffle, shared by all three sketches. */
export const ROUTER_TRAFFIC_STREAM: StreamEvent[] = shuffleStream(
  syntheticStream(
    [HEAVY_IP, MEDIUM_IP, LIGHT_IP],
    [800, 120, 40],
    Array.from({ length: NOISE_COUNT }, (_, i) => `noise_${i}`)
  )
);

export const QUERY_KEYS = [HEAVY_IP, MEDIUM_IP, "noise_0", "noise_50", "1.2.3.4"] as const;

export type SketchChainSnapshot = {
  prefix: StreamEvent[];
  truth: Map<string, number>;
  distinctExact: number;
  cms: CountMinSketch;
  hll: HyperLogLog;
  bloomBits: Uint8Array;
  bloomDistinct: number;
  queryKey: string;
  cmsEstimate: number;
  cmsActual: number;
  hllEstimate: number;
  bloomPresent: boolean;
  bloomIndices: number[];
  exactSeen: boolean;
  isBloomFalsePositive: boolean;
};

export function runSketchChain(
  streamIdx: number,
  queryKey: string,
  config: SketchChainConfig = DEFAULT_CHAIN_CONFIG
): SketchChainSnapshot {
  const prefix = streamPrefix(ROUTER_TRAFFIC_STREAM, streamIdx);
  const truth = truthFromStream(prefix);
  const distinctExact = exactDistinct(prefix);
  const seenKeys = distinctKeys(prefix);

  const cms = new CountMinSketch(config.cmsEpsilon, config.cmsDelta);
  cms.ingest(prefix);

  const hll = new HyperLogLog(config.hllB);
  hll.ingest(prefix);

  const bloomBits = buildBitArray(seenKeys, config.bloomK, config.bloomM);
  const probe = bloomMaybeContains(bloomBits, queryKey, config.bloomK, config.bloomM);
  const exactSeen = truth.has(queryKey);

  return {
    prefix,
    truth,
    distinctExact,
    cms,
    hll,
    bloomBits,
    bloomDistinct: seenKeys.length,
    queryKey,
    cmsEstimate: cms.getCount(queryKey),
    cmsActual: truth.get(queryKey) ?? 0,
    hllEstimate: hll.count(),
    bloomPresent: probe.present,
    bloomIndices: probe.indices,
    exactSeen,
    isBloomFalsePositive: probe.present && !exactSeen,
  };
}

export const DDOS_PRESET = {
  streamIdx: ROUTER_TRAFFIC_STREAM.length - 1,
  queryKey: HEAVY_IP,
} as const;

export const EARLY_STREAM_PRESET = {
  streamIdx: 80,
  queryKey: MEDIUM_IP,
} as const;

export const LONG_TAIL_PRESET = {
  streamIdx: ROUTER_TRAFFIC_STREAM.length - 1,
  queryKey: "noise_0",
} as const;

export function recentStreamKeys(prefix: StreamEvent[], tail = 24): string[] {
  return prefix.slice(-tail).map((e) => e.key);
}

export function keyCategory(key: string): "heavy" | "medium" | "light" | "noise" | "absent" {
  if (key === HEAVY_IP) return "heavy";
  if (key === MEDIUM_IP) return "medium";
  if (key === LIGHT_IP) return "light";
  if (key.startsWith("noise_")) return "noise";
  return "absent";
}
