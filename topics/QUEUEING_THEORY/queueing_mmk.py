#!/usr/bin/env python3
"""M/M/1 queue metrics: utilization, mean queue length, mean wait."""

from __future__ import annotations


def utilization(lam: float, mu: float) -> float:
    if mu <= 0:
        return 1.0
    return min(lam / mu, 0.999)


def mean_queue_length(rho: float) -> float:
    if rho >= 1:
        return float("inf")
    return rho / (1 - rho)


def mean_wait(rho: float, mu: float) -> float:
    return mean_queue_length(rho) / mu


if __name__ == "__main__":
    lam, mu = 4.0, 5.0
    rho = utilization(lam, mu)
    print(f"rho={rho:.3f} L={mean_queue_length(rho):.3f} W={mean_wait(rho, mu):.3f}")
