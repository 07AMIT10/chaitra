#!/usr/bin/env python3
"""Toy PageRank power iteration on a 4-node graph."""

from __future__ import annotations

# adjacency: out-links per node (0..3)
GRAPH = {
    0: [1, 2],
    1: [2],
    2: [3],
    3: [0],
}
DAMPING = 0.85
N = len(GRAPH)
TELEPORT = (1 - DAMPING) / N


def pagerank(iterations: int = 40) -> list[float]:
    rank = [1.0 / N] * N
    for _ in range(iterations):
        next_rank = [TELEPORT] * N
        for src, outs in GRAPH.items():
            if not outs:
                share = rank[src] / N
                for j in range(N):
                    next_rank[j] += DAMPING * share
            else:
                share = DAMPING * rank[src] / len(outs)
                for dst in outs:
                    next_rank[dst] += share
        rank = next_rank
    return rank


if __name__ == "__main__":
    r = pagerank()
    for i, p in enumerate(r):
        print(f"node {i}: {p:.4f}")
