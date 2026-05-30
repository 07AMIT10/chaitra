import { falsePositiveRate, hashCountFromSizing } from "./bloom-math";
import { cmsDimensions } from "./cms-math";
import { hllStandardError } from "./hll-math";

export type SketchChainConfig = {
  cmsEpsilon: number;
  cmsDelta: number;
  hllB: number;
  bloomM: number;
  bloomK: number;
};

export const DEFAULT_CHAIN_CONFIG: SketchChainConfig = {
  cmsEpsilon: 0.01,
  cmsDelta: 0.05,
  hllB: 8,
  bloomM: 256,
  bloomK: 3,
};

/** Fixed RAM for CMS matrix + HLL registers + Bloom bit array (bytes). */
export function sketchChainMemoryBytes(config: SketchChainConfig): number {
  const { width, depth } = cmsDimensions(config.cmsEpsilon, config.cmsDelta);
  const cmsBytes = width * depth * 4;
  const hllBytes = 1 << config.hllB;
  const bloomBytes = Math.ceil(config.bloomM / 8);
  return cmsBytes + hllBytes + bloomBytes;
}

/** Rough bytes if we stored every distinct key + full event log. */
export function naiveExactMemoryBytes(distinctKeys: number, streamLen: number): number {
  const mapBytes = distinctKeys * 32;
  const logBytes = streamLen * 16;
  return mapBytes + logBytes;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function bloomFpEstimate(
  config: SketchChainConfig,
  distinctInBloom: number
): number {
  const k =
    config.bloomK > 0
      ? config.bloomK
      : hashCountFromSizing(config.bloomM, Math.max(distinctInBloom, 1));
  return falsePositiveRate(config.bloomM, distinctInBloom, k);
}

export function hllSigmaPercent(b: number): number {
  return hllStandardError(b) * 100;
}

export function cmsSketchShape(config: SketchChainConfig): { width: number; depth: number } {
  return cmsDimensions(config.cmsEpsilon, config.cmsDelta);
}
