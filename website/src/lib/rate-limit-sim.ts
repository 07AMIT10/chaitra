import type { TokenBucketState } from "./sketches/types";

export function createTokenBucket(capacity: number, refillRate: number): TokenBucketState {
  return { tokens: capacity, capacity, refillRate, lastRefillMs: Date.now() };
}

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
  durationSec: number
): RequestResult[] {
  const results: RequestResult[] = [];
  let state = createTokenBucket(capacity, refillRate);
  const interval = 1 / requestRate;
  for (let t = 0; t < durationSec; t += interval) {
    const now = t * 1000;
    state = refillBucket(state, now);
    const { state: next, allowed } = tryConsume(state);
    state = next;
    results.push({ time: t, allowed, tokens: state.tokens });
  }
  return results;
}

export function acceptRate(results: RequestResult[]): number {
  if (results.length === 0) return 0;
  return results.filter((r) => r.allowed).length / results.length;
}
