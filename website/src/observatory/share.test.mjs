import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeShare,
  encodeShare,
  exportBranch,
  importBranch,
  shareUrl,
} from "./share.ts";

function b64url(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function validScenario(over = {}) {
  return {
    schema: 1,
    id: "least-label",
    title: "Least Label — न्यूनतम",
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
    ...over,
  };
}

function validMutation(id = "m1", over = {}) {
  return {
    id,
    card: "modify",
    op: "set-weight",
    label: "Heavier ✲",
    payload: { weight: 2 },
    ...over,
  };
}

function validPayload(over = {}) {
  return {
    v: 1,
    scenario: validScenario(),
    mutations: [validMutation()],
    lens: "what-flows",
    frameIndex: 3,
    ...over,
  };
}

function largePayload({ nodeLabelFill = 0, mutationLabelFill = 0 } = {}) {
  const nodeCount = 30;
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}${"x".repeat(nodeLabelFill)}`,
    x: index * 10,
    y: index * 7,
  }));
  const edges = Array.from({ length: 60 }, (_, index) => ({
    id: `edge-${index}`,
    from: `node-${index % nodeCount}`,
    to: `node-${(index * 7 + 3) % nodeCount}`,
    weight: (index % 9) + 1,
  }));
  const mutations = Array.from({ length: 12 }, (_, index) => ({
    id: `mutation-${index}`,
    card: "modify",
    op: "set-weight",
    label: `Adjustment ${index}${"y".repeat(mutationLabelFill)}`,
    payload: { weight: index + 1 },
  }));
  return {
    v: 1,
    scenario: {
      schema: 1,
      id: "large-share",
      title: "Large share payload",
      substrate: "graph",
      strategy: "dijkstra",
      model: {
        kind: "graph",
        nodes,
        edges,
        start: "node-0",
        target: "node-29",
        directed: true,
      },
      params: { framing: "traffic" },
    },
    mutations,
    lens: "what-flows",
    frameIndex: 12,
  };
}

function validBranch(over = {}) {
  return {
    version: 1,
    id: "b1",
    title: "Branch b1",
    scenario: validScenario(),
    mutations: [validMutation()],
    lens: "what-persists",
    frameIndex: 4,
    note: "a note with unicode ✓",
    createdAt: 1,
    updatedAt: 2,
    ...over,
  };
}

test("encodeShare/decodeShare round-trips unicode payloads exactly", () => {
  const payload = validPayload();
  const encoded = encodeShare(payload);
  assert.ok(encoded.startsWith("#b="));
  assert.match(encoded.slice(3), /^[A-Za-z0-9_-]+$/);
  const decoded = decodeShare(encoded);
  assert.ok(decoded.ok);
  assert.deepEqual(decoded.payload, payload);
});

test("shareUrl returns a usable URL and never carries a note", () => {
  const payload = { ...validPayload(), note: "private note" };
  const url = shareUrl("https://example.com/observatory", payload);
  assert.ok(url.startsWith("https://example.com/observatory#b="));
  assert.ok(!url.includes("private"));
  const decoded = decodeShare(url);
  assert.ok(decoded.ok);
  assert.deepEqual(decoded.payload, validPayload());
  // An existing hash fragment is replaced, not doubled.
  assert.ok(shareUrl("https://example.com/o#stale", payload).startsWith("https://example.com/o#b="));
});

test("decodeShare accepts full URL, hash fragment, and raw encoded forms", () => {
  const payload = validPayload();
  const encoded = encodeShare(payload);
  const forms = [
    `https://example.com/observatory${encoded}`,
    `https://example.com/o?src=link${encoded}`,
    encoded,
    encoded.replace("#b=", ""), // the raw encoded value without the hash prefix
    `  ${encoded}  `,
  ];
  for (const form of forms) {
    const decoded = decodeShare(form);
    assert.ok(decoded.ok, `form should decode: ${form.slice(0, 40)}`);
    assert.deepEqual(decoded.payload, payload);
  }
});

test("share payload field set is exactly v/scenario/mutations/lens/frameIndex", () => {
  const encoded = encodeShare(validPayload());
  const json = JSON.parse(Buffer.from(encoded.slice(3), "base64url").toString("utf8"));
  assert.deepEqual(Object.keys(json).sort(), [
    "frameIndex",
    "lens",
    "mutations",
    "scenario",
    "v",
  ]);
});

test("decodeShare rejects malformed input and invalid payloads", () => {
  assert.equal(decodeShare("").ok, false);
  assert.equal(decodeShare("#b=").ok, false);
  assert.equal(decodeShare("!!!!not-base64!!").ok, false);
  assert.equal(decodeShare("#b=%$#@").ok, false);
  // Valid base64url but invalid JSON.
  assert.equal(decodeShare(b64url("{oops...")).ok, false);
  // Valid JSON but not a share payload.
  assert.equal(decodeShare(b64url(JSON.stringify({ hello: 1 }))).ok, false);
  // Payload-shaped but bad fields.
  assert.equal(decodeShare(b64url(JSON.stringify({ ...validPayload(), v: 2 }))).ok, false);
  assert.equal(
    decodeShare(b64url(JSON.stringify({ ...validPayload(), lens: "no-such-lens" }))).ok,
    false,
  );
  assert.equal(decodeShare(b64url(JSON.stringify({ ...validPayload(), frameIndex: -1 }))).ok, false);
  assert.equal(
    decodeShare(b64url(JSON.stringify({ ...validPayload(), mutations: [{ nope: 1 }] }))).ok,
    false,
  );
  // Extra field (note-like) makes the payload shape invalid.
  assert.equal(
    decodeShare(b64url(JSON.stringify({ ...validPayload(), note: "sneaky" }))).ok,
    false,
  );
});

test("payload hard cap: oversized payloads are refused on both ends", () => {
  const big = {
    ...validPayload(),
    scenario: validScenario({ params: { framing: "x".repeat(9100) } }),
  };
  const text = JSON.stringify({
    v: 1,
    scenario: big.scenario,
    mutations: big.mutations,
    lens: big.lens,
    frameIndex: big.frameIndex,
  });
  assert.ok(text.length > 9000);
  const result = decodeShare(b64url(text));
  assert.ok(!result.ok);
  // encodeShare refuses to produce a link decodeShare would reject.
  assert.throws(() => encodeShare(big), /exceeds 9000 characters/);
});

test("large 30-node/60-edge graph with 12 mutations stays within the 9000-character link cap", () => {
  const payload = largePayload();
  const encoded = encodeShare(payload);
  assert.ok(encoded.length > 8000, `expected a genuinely large fragment, got ${encoded.length}`);
  assert.ok(encoded.length <= 9000, `fragment is ${encoded.length} characters`);
  const url = shareUrl("https://example.com/observatory", payload);
  assert.ok(url.length <= 9000, `full URL is ${url.length} characters`);
  const decoded = decodeShare(url);
  assert.ok(decoded.ok);
  assert.deepEqual(decoded.payload, payload);
});

test("share cap applies to the encoded fragment, not the raw JSON text", () => {
  // 30 nodes/60 edges with longer labels: raw JSON is under the old 9000-char
  // text cap, but base64url pushes the actual link past 9000.
  const payload = largePayload({ nodeLabelFill: 40 });
  const text = JSON.stringify(payload);
  const encoded = b64url(text);
  assert.ok(text.length < 9000, `raw JSON is ${text.length} characters`);
  assert.ok(encoded.length > 9000, `encoded payload is ${encoded.length} characters`);
  assert.throws(() => encodeShare(payload), /exceeds 9000 characters/);
  assert.throws(() => shareUrl("https://example.com/observatory", payload), /exceeds 9000 characters/);
  // Oversized encoded input is refused before it is decoded.
  assert.equal(decodeShare(`#b=${encoded}`).ok, false);
  assert.equal(decodeShare(`https://example.com/observatory#b=${encoded}`).ok, false);
  assert.equal(decodeShare(encoded).ok, false);
});

test("share payloads reject a 13-mutation stack and accept the 12-mutation cap", () => {
  const build = (count) => ({
    v: 1,
    scenario: validScenario(),
    mutations: Array.from({ length: count }, (_, index) => validMutation(`m${index}`)),
    lens: "what-flows",
    frameIndex: 0,
  });
  const atCap = build(12);
  assert.ok(encodeShare(atCap).length <= 9000);
  const decodedAtCap = decodeShare(encodeShare(atCap));
  assert.ok(decodedAtCap.ok);
  assert.equal(decodedAtCap.payload.mutations.length, 12);

  const overCap = build(13);
  const text = JSON.stringify(overCap);
  assert.ok(text.length < 6000, "rejection must come from the mutation cap, not the size cap");
  assert.equal(decodeShare(b64url(text)).ok, false);
});

test("exportBranch/importBranch round-trips a valid branch", () => {
  const branch = validBranch();
  const exported = exportBranch(branch);
  assert.match(exported, /^\{"format":"chaitra-observatory","version":1,"branch":/);
  const imported = importBranch(exported);
  assert.ok(imported.ok);
  assert.deepEqual(imported.branch, branch);
});

test("importBranch rejects wrong format, bad shape, and oversized input", () => {
  assert.equal(
    importBranch(JSON.stringify({ format: "other", version: 1, branch: validBranch() })).ok,
    false,
  );
  assert.equal(
    importBranch(JSON.stringify({ format: "chaitra-observatory", version: 2, branch: validBranch() }))
      .ok,
    false,
  );
  assert.equal(
    importBranch(JSON.stringify({ format: "chaitra-observatory", version: 1, branch: { nope: 1 } }))
      .ok,
    false,
  );
  assert.equal(importBranch("not json at all").ok, false);
  assert.equal(importBranch("").ok, false);
  assert.equal(importBranch("x".repeat(70000)).ok, false);
});

test("exportBranch refuses invalid branches", () => {
  assert.throws(() => exportBranch({ nope: true }), /validation/);
});
