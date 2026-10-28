import test from "node:test";
import assert from "node:assert/strict";

import { canonicalJson, hash32, scenarioHash } from "./hash.ts";

test("canonicalJson sorts object keys recursively and preserves array order", () => {
  const a = { b: 2, a: { d: 4, c: [3, 1] } };
  const b = { a: { c: [3, 1], d: 4 }, b: 2 };
  assert.equal(canonicalJson(a), '{"a":{"c":[3,1],"d":4},"b":2}');
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
});

test("canonicalJson omits undefined object fields and encodes undefined array slots as null", () => {
  assert.equal(canonicalJson({ a: undefined, b: 1 }), '{"b":1}');
  assert.equal(canonicalJson([undefined, 1]), "[null,1]");
});

test("hash32 is stable, eight hex characters, and changes with input", () => {
  assert.match(hash32("chaitra"), /^[0-9a-f]{8}$/);
  assert.equal(hash32("chaitra"), hash32("chaitra"));
  assert.notEqual(hash32("chaitra"), hash32("chaitra "));
});

test("scenarioHash ignores object key order and is stable", () => {
  const one = {
    schema: 1,
    id: "least-label",
    title: "Least Label",
    substrate: "graph",
    strategy: "dijkstra",
    model: {
      kind: "graph",
      nodes: [{ id: "A", label: "A", x: 0, y: 0 }],
      edges: [],
      start: "A",
      directed: true,
    },
    params: { framing: "traffic" },
  };
  const two = {
    params: { framing: "traffic" },
    model: {
      directed: true,
      start: "A",
      edges: [],
      nodes: [{ label: "A", id: "A", x: 0, y: 0 }],
      kind: "graph",
    },
    strategy: "dijkstra",
    substrate: "graph",
    title: "Least Label",
    id: "least-label",
    schema: 1,
  };
  assert.equal(scenarioHash(one), scenarioHash(two));
  assert.equal(scenarioHash(one), hash32(canonicalJson(one)));
});
