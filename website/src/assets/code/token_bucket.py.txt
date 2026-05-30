#!/usr/bin/env python3
"""Token bucket: accept or reject requests."""

from __future__ import annotations


class TokenBucket:
    def __init__(self, rate: float, capacity: float) -> None:
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.time = 0.0

    def allow(self, now: float, cost: float = 1.0) -> bool:
        elapsed = max(0.0, now - self.time)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.time = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(rate=2.0, capacity=5.0)
    for t in [0, 0.5, 1.0, 1.0, 2.0]:
        print(t, "accept" if bucket.allow(t) else "reject")
