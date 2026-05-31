/**
 * Approximate computing formulas (APPROXIMATE_COMPUTING/README.md).
 */

export function scaleFactor(alpha: number, beta: number, bits: number): number {
  const levels = 2 ** bits;
  if (levels <= 1) return beta - alpha;
  return (beta - alpha) / (levels - 1);
}

export function quantize(x: number, alpha: number, beta: number, bits: number): number {
  const S = scaleFactor(alpha, beta, bits);
  if (S === 0) return x;
  const q = Math.round((x - alpha) / S) * S + alpha;
  return Math.min(beta, Math.max(alpha, q));
}

export function quantizationError(x: number, xq: number): number {
  return x - xq;
}

/** Uniform bucket model: Var(ε) = S²/12 */
export function quantizationVariance(S: number): number {
  return (S * S) / 12;
}

/** Heuristic memory vs FP32 (32 bits). */
export function memoryFactorVsFp32(bits: number): number {
  return bits > 0 ? 32 / bits : 0;
}

export function quantLevelValues(alpha: number, beta: number, bits: number): number[] {
  const S = scaleFactor(alpha, beta, bits);
  const n = Math.max(1, 2 ** bits);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(alpha + i * S);
  return out;
}

/** Relative dynamic power P ∝ V² (normalized to V=1). */
export function normalizedPower(voltage: number): number {
  return voltage * voltage;
}

/**
 * Illustrative timing error rate vs supply voltage (pedagogical, not SPICE).
 * Low V → higher P_err.
 */
export function timingErrorRate(voltage: number, vTh = 0.85, k = 40): number {
  return 1 / (1 + Math.exp(k * (voltage - vTh)));
}

export function isInSafeVoltageRegion(errorRate: number, budgetPct: number): boolean {
  return errorRate * 100 <= budgetPct;
}

export function loopSpeedup(skipRate: number): number {
  const executed = 1 - skipRate;
  return executed > 0 ? 1 / executed : 0;
}

export function formatSci(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)) {
    return n.toExponential(digits);
  }
  return n.toFixed(Math.min(digits, 4));
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
