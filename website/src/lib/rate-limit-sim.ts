import type { TokenBucketState } from "./sketches/types";

export function createTokenBucket(
  capacity: number,
  refillRate: number,
  initialTokens = capacity
): TokenBucketState {
  return {
    tokens: Math.min(capacity, Math.max(0, initialTokens)),
    capacity,
    refillRate,
    lastRefillMs: 0,
  };
}

export type SimulateBurstOptions = {
  durationSec?: number;
  initialTokens?: number;
};

export function refillBucket(state: TokenBucketState, nowMs: number): TokenBucketState {
  const elapsed = (nowMs - state.lastRefillMs) / 1000;
  const added = elapsed * state.refillRate;
  return {
    ...state,
    tokens: Math.min(state.capacity, state.tokens + added),
    lastRefillMs: nowMs,
  };
}

export function tryConsume(state: TokenBucketState, cost = 1): { state: TokenBucketState; allowed: boolean } {
  if (state.tokens >= cost) {
    return { state: { ...state, tokens: state.tokens - cost }, allowed: true };
  }
  return { state, allowed: false };
}

export type RequestResult = { time: number; allowed: boolean; tokens: number };

/** Simulate bursty requests against a token bucket. */
export function simulateBurst(
  capacity: number,
  refillRate: number,
  requestRate: number,
  durationSec = 3,
  options: SimulateBurstOptions = {}
): RequestResult[] {
  const { initialTokens = capacity } = options;
  const results: RequestResult[] = [];
  let state = createTokenBucket(capacity, refillRate, initialTokens);
  const interval = requestRate > 0 ? 1 / requestRate : 1;
  for (let t = 0; t < durationSec; t += interval) {
    const now = t * 1000;
    state = refillBucket(state, now);
    const { state: next, allowed } = tryConsume(state);
    state = next;
    results.push({ time: t, allowed, tokens: state.tokens });
  }
  return results;
}

export function summarizeResults(results: RequestResult[]): {
  accepted: number;
  dropped: number;
  total: number;
} {
  const accepted = results.filter((r) => r.allowed).length;
  return { accepted, dropped: results.length - accepted, total: results.length };
}

export function acceptRate(results: RequestResult[]): number {
  if (results.length === 0) return 0;
  return summarizeResults(results).accepted / results.length;
}
