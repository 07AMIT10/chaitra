/**
 * Random Early Detection formulas (RANDOM_EARLY_DETECTION/README.md).
 */

/** EWMA: avg ← (1 − wq)·avg + wq·q */
export function ewmaUpdate(prevAvg: number, instantQ: number, wq: number): number {
  const w = Math.min(1, Math.max(0, wq));
  return (1 - w) * prevAvg + w * instantQ;
}

/** Base drop probability Pb in the linear region (0 below min, 1 at/above max). */
export function baseDropProbability(
  avgQ: number,
  capacity: number,
  minTh: number,
  maxTh: number,
  pMax: number
): number {
  if (capacity <= 0) return 0;
  const fill = avgQ / capacity;
  if (fill < minTh) return 0;
  if (fill >= maxTh) return 1;
  const span = maxTh - minTh;
  if (span <= 0) return pMax;
  return pMax * ((fill - minTh) / span);
}

/** Actual drop probability Pa = Pb / (1 − count·Pb) with guard for denominator. */
export function actualDropProbability(pb: number, countSinceLastDrop: number): number {
  const p = Math.min(1, Math.max(0, pb));
  if (p <= 0) return 0;
  const denom = 1 - countSinceLastDrop * p;
  if (denom <= 0) return 1;
  return Math.min(1, p / denom);
}

/** Tail-drop: accept until buffer full, then drop all (step at 100% fill). */
export function tailDropProbability(instantFill: number): number {
  return instantFill >= 1 ? 1 : 0;
}

/** RED policy zone from average queue fill. */
export function redZone(
  avgFill: number,
  minTh: number,
  maxTh: number
): "accept" | "prob" | "drop_all" {
  if (avgFill < minTh) return "accept";
  if (avgFill >= maxTh) return "drop_all";
  return "prob";
}

export function formatPercent(fraction: number): string {
  return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(0)}%`;
}

export function formatFill(fraction: number): string {
  return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(0)}%`;
}

export function formatPb(pb: number): string {
  if (pb <= 0) return "0";
  if (pb >= 1) return "1";
  return pb.toFixed(3);
}
