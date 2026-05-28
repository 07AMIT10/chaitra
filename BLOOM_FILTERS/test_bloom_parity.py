import json
from pathlib import Path

import pytest

from bloom_filter import BloomFilter

FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "tests"
    / "fixtures"
    / "bloom_filter"
    / "cases.json"
)


@pytest.mark.parametrize("case", json.loads(FIXTURE.read_text()))
def test_bloom_ops(case):
    bf = BloomFilter(items_count=100, fp_prob=0.01)
    for op in case["ops"]:
        if op[0] == "add":
            bf.add(op[1])
    last = case["ops"][-1]
    assert last[0] == "query"
    assert bf.check(last[1]) == case["expect_contains"]
