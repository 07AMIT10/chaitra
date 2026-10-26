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
