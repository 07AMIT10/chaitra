#!/usr/bin/env python3
"""Push gossip until all nodes are informed."""

from __future__ import annotations

import random


def gossip_rounds(n: int, fanout: int, seed: int = 42) -> int:
    rng = random.Random(seed)
    informed = {0}
    rounds = 0
    while len(informed) < n:
        rounds += 1
        newly = set()
        for node in list(informed):
            targets = [i for i in range(n) if i not in informed]
            if not targets:
                continue
            k = min(fanout, len(targets))
            for t in rng.sample(targets, k):
                newly.add(t)
        informed |= newly
        if rounds > n * 20:
            break
    return rounds


if __name__ == "__main__":
    print("rounds to full spread:", gossip_rounds(16, 2))
