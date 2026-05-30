#!/usr/bin/env python3
"""TinyLFU admission: compare sketch frequency vs cache victim."""

from __future__ import annotations

from collections import Counter


def admit(candidate_freq: int, victim_freq: int) -> bool:
    return candidate_freq > victim_freq


if __name__ == "__main__":
    window = Counter(["a", "b", "a", "c", "a", "b"])
    print("admit d over b?", admit(window["d"], window["b"]))
