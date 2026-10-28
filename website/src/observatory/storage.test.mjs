import test from "node:test";
import assert from "node:assert/strict";

import {
  LIMITS,
  STORAGE_KEYS,
  clearBranches,
  clearReaderBenches,
  deleteBranch,
  deleteReaderBench,
  loadBranches,
  loadDraft,
  loadReaderBenches,
  saveBranch,
  saveDraft,
  saveReaderBench,
} from "./storage.ts";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
    get length() {
      return map.size;
    },
  };
}

/** A storage whose writes always throw, simulating quota/serialization errors. */
function failingWriteStorage(inner, message = "QuotaExceededError") {
  return {
    getItem: (key) => inner.getItem(key),
    setItem: () => {
      throw new Error(message);
    },
    removeItem: (key) => inner.removeItem(key),
    key: (index) => inner.key(index),
    get length() {
      return inner.length;
    },
  };
}

/** A storage whose removals always throw, simulating a locked-down store. */
function failingRemoveStorage(inner, message = "SecurityError") {
  return {
    getItem: (key) => inner.getItem(key),
    setItem: (key, value) => inner.setItem(key, value),
    removeItem: () => {
      throw new Error(message);
    },
    key: (index) => inner.key(index),
    get length() {
      return inner.length;
    },
  };
}

function validScenario(over = {}) {
  return {
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
    ...over,
  };
}

function validBranch(over = {}) {
  return {
    version: 1,
    id: "b1",
    title: "Branch b1",
    scenario: validScenario(),
    mutations: [],
    lens: "what-exists",
    frameIndex: 0,
    note: "",
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

function validBench(over = {}) {
  return {
    version: 1,
    id: "r1",
    title: "Bench r1",
    framing: "traffic flow",
    substrate: "graph",
    strategy: "dijkstra",
    scenario: validScenario(),
    createdAt: 1,
    ...over,
  };
}

test("loadBranches isolates corrupt records and keeps valid ones", () => {
  const good = validBranch({ id: "good" });
  const storage = memoryStorage({
    [STORAGE_KEYS.branches]: JSON.stringify([good, { version: 1, garbage: true }, "junk", null]),
  });
  const { branches, dropped, corrupt } = loadBranches(storage);
  assert.deepEqual(branches, [good]);
  assert.equal(dropped, 3);
  assert.equal(corrupt, false);
});

test("loadBranches flags missing, unparseable, and non-array stores", () => {
  assert.deepEqual(loadBranches(memoryStorage()), {
    branches: [],
    dropped: 0,
    corrupt: false,
  });
  assert.deepEqual(loadBranches(memoryStorage({ [STORAGE_KEYS.branches]: "{not json" })), {
    branches: [],
    dropped: 0,
    corrupt: true,
  });
  assert.deepEqual(loadBranches(memoryStorage({ [STORAGE_KEYS.branches]: '{"a":1}' })), {
    branches: [],
    dropped: 0,
    corrupt: true,
  });
  assert.deepEqual(loadBranches(memoryStorage({ [STORAGE_KEYS.branches]: '"junk"' })), {
    branches: [],
    dropped: 0,
    corrupt: true,
  });
});

test("loadReaderBenches flags a corrupt top-level store", () => {
  assert.deepEqual(loadReaderBenches(memoryStorage({ [STORAGE_KEYS.benches]: "{nope" })), {
    benches: [],
    dropped: 0,
    corrupt: true,
  });
});

test("saveBranch refuses to overwrite a corrupt store and keeps the raw payload", () => {
  for (const raw of ["{not json", '{"a":1}', '"junk"']) {
    const storage = memoryStorage({ [STORAGE_KEYS.branches]: raw });
    const result = saveBranch(storage, validBranch());
    assert.equal(result.ok, false);
    assert.equal(result.code, "corrupt");
    assert.match(result.error, /clear/);
    assert.deepEqual(result.branches, []);
    assert.equal(storage.getItem(STORAGE_KEYS.branches), raw);
  }
});

test("clearBranches removes the key and surfaces removal failures", () => {
  const storage = memoryStorage({ [STORAGE_KEYS.branches]: "{not json" });
  clearBranches(storage);
  assert.equal(storage.getItem(STORAGE_KEYS.branches), null);
  assert.deepEqual(loadBranches(storage), { branches: [], dropped: 0, corrupt: false });

  const failing = failingRemoveStorage(
    memoryStorage({ [STORAGE_KEYS.branches]: JSON.stringify([validBranch()]) }),
  );
  assert.throws(() => clearBranches(failing), /could not clear branches: SecurityError/);
  assert.notEqual(failing.getItem(STORAGE_KEYS.branches), null);
});

test("saveBranch persists a new branch and the round-trip is exact", () => {
  const storage = memoryStorage();
  const branch = validBranch();
  const result = saveBranch(storage, branch);
  assert.ok(result.ok);
  const { branches, dropped, corrupt } = loadBranches(storage);
  assert.deepEqual(branches, [branch]);
  assert.equal(dropped, 0);
  assert.equal(corrupt, false);
});

test("saveBranch rejects an oversized branch and does not overwrite the store", () => {
  const existing = validBranch({ id: "keep" });
  const storage = memoryStorage({
    [STORAGE_KEYS.branches]: JSON.stringify([existing]),
  });
  const oversizedNote = validBranch({ id: "big-note", note: "x".repeat(LIMITS.noteChars + 1) });
  const noteResult = saveBranch(storage, oversizedNote);
  assert.ok(!noteResult.ok);
  assert.equal(noteResult.code, "size");
  assert.match(noteResult.error, /note/);

  const hugeScenario = validBranch({
    id: "big-bytes",
    scenario: validScenario({ params: { framing: "x".repeat(9000) } }),
  });
  const bytesResult = saveBranch(storage, hugeScenario);
  assert.ok(!bytesResult.ok);
  assert.equal(bytesResult.code, "size");

  assert.deepEqual(loadBranches(storage), { branches: [existing], dropped: 0, corrupt: false });
});

test("saveBranch rejects a mutation list over the cap", () => {
  const storage = memoryStorage();
  const mutations = Array.from({ length: LIMITS.mutations + 1 }, (_, index) => ({
    id: `m${index}`,
    card: "substitute",
    op: "noop",
    label: `Mutation ${index}`,
    payload: {},
  }));
  const result = saveBranch(storage, validBranch({ mutations }));
  assert.ok(!result.ok);
  assert.equal(result.code, "size");
  assert.deepEqual(loadBranches(storage), { branches: [], dropped: 0, corrupt: false });
});

test("saveBranch rejects an invalid branch without touching the store", () => {
  const existing = validBranch({ id: "keep" });
  const storage = memoryStorage({
    [STORAGE_KEYS.branches]: JSON.stringify([existing]),
  });
  const result = saveBranch(storage, { hello: "world" });
  assert.ok(!result.ok);
  assert.equal(result.code, "invalid");
  assert.deepEqual(loadBranches(storage), { branches: [existing], dropped: 0, corrupt: false });
});

test("saveBranch rejects a new branch at the cap, never FIFO-clobbering", () => {
  const full = Array.from({ length: LIMITS.branches }, (_, index) =>
    validBranch({ id: `b${index}` }),
  );
  const storage = memoryStorage({ [STORAGE_KEYS.branches]: JSON.stringify(full) });
  const fresh = validBranch({ id: "fresh" });
  const result = saveBranch(storage, fresh);
  assert.ok(!result.ok);
  assert.equal(result.code, "cap");
  assert.deepEqual(result.branches, full);
  assert.deepEqual(loadBranches(storage), { branches: full, dropped: 0, corrupt: false });
});

test("saveBranch replaces an existing id in place and updates content", () => {
  const storage = memoryStorage({
    [STORAGE_KEYS.branches]: JSON.stringify([
      validBranch({ id: "b0", title: "Old title" }),
      validBranch({ id: "b1" }),
    ]),
  });
  const replacement = validBranch({ id: "b0", title: "New title" });
  const result = saveBranch(storage, replacement);
  assert.ok(result.ok);
  const { branches } = loadBranches(storage);
  assert.equal(branches.length, 2);
  assert.deepEqual(branches[0], replacement);
  assert.equal(branches[1].id, "b1");
  // At cap, replacing an existing id is still allowed.
  const full = Array.from({ length: LIMITS.branches }, (_, index) =>
    validBranch({ id: `b${index}`, updatedAt: index }),
  );
  const capped = memoryStorage({ [STORAGE_KEYS.branches]: JSON.stringify(full) });
  const replaced = saveBranch(capped, validBranch({ id: "b0", updatedAt: 999 }));
  assert.ok(replaced.ok);
  assert.equal(loadBranches(capped).branches.length, LIMITS.branches);
  assert.equal(loadBranches(capped).branches[0].updatedAt, 999);
});

test("saveBranch surfaces storage write errors and writes nothing", () => {
  const storage = failingWriteStorage(memoryStorage());
  const result = saveBranch(storage, validBranch());
  assert.ok(!result.ok);
  assert.equal(result.code, "storage");
  assert.deepEqual(loadBranches(storage), { branches: [], dropped: 0, corrupt: false });
});

test("deleteBranch removes only the target id", () => {
  const a = validBranch({ id: "a" });
  const b = validBranch({ id: "b" });
  const storage = memoryStorage({ [STORAGE_KEYS.branches]: JSON.stringify([a, b]) });
  const remaining = deleteBranch(storage, "a");
  assert.deepEqual(remaining, [b]);
  assert.deepEqual(loadBranches(storage), { branches: [b], dropped: 0, corrupt: false });
  assert.deepEqual(deleteBranch(storage, "missing"), [b]);
});

test("deleteBranch throws and leaves the store intact when the write fails", () => {
  const a = validBranch({ id: "a" });
  const b = validBranch({ id: "b" });
  const inner = memoryStorage({ [STORAGE_KEYS.branches]: JSON.stringify([a, b]) });
  const storage = failingWriteStorage(inner);
  assert.throws(() => deleteBranch(storage, "a"), /could not delete branch: QuotaExceededError/);
  assert.deepEqual(loadBranches(inner), { branches: [a, b], dropped: 0, corrupt: false });
  // A missing id never needs a write, so it still succeeds quietly.
  assert.deepEqual(deleteBranch(storage, "missing"), [a, b]);
});

test("draft round-trips and garbage drafts read back as null", () => {
  const storage = memoryStorage();
  assert.equal(loadDraft(storage), null);
  const draft = {
    version: 1,
    savedAt: 5,
    scenario: validScenario(),
    mutations: [],
    lens: "what-flows",
    frameIndex: 2,
    title: "My draft",
    note: "draft note",
  };
  assert.deepEqual(saveDraft(storage, draft), { ok: true });
  const loaded = loadDraft(storage);
  assert.deepEqual(loaded, draft);

  storage.setItem(STORAGE_KEYS.draft, "{nope");
  assert.equal(loadDraft(storage), null);
  storage.setItem(STORAGE_KEYS.draft, JSON.stringify({ version: 2 }));
  assert.equal(loadDraft(storage), null);

  const bad = { ...draft, note: "x".repeat(801) };
  const result = saveDraft(storage, bad);
  assert.equal(result.ok, false);
  assert.ok(result.error.length > 0);
});

test("reader benches round-trip, cap, and size-guard exactly like branches", () => {
  const storage = memoryStorage();
  const bench = validBench();
  const saved = saveReaderBench(storage, bench);
  assert.ok(saved.ok);
  assert.deepEqual(loadReaderBenches(storage), { benches: [bench], dropped: 0, corrupt: false });

  const full = Array.from({ length: LIMITS.readerBenches }, (_, index) =>
    validBench({ id: `r${index}` }),
  );
  const capped = memoryStorage({ [STORAGE_KEYS.benches]: JSON.stringify(full) });
  const rejected = saveReaderBench(capped, validBench({ id: "new" }));
  assert.ok(!rejected.ok);
  assert.equal(rejected.code, "cap");
  assert.deepEqual(loadReaderBenches(capped), { benches: full, dropped: 0, corrupt: false });

  const replaced = saveReaderBench(capped, validBench({ id: "r0", createdAt: 999 }));
  assert.ok(replaced.ok);
  assert.equal(loadReaderBenches(capped).benches.length, LIMITS.readerBenches);
  assert.equal(loadReaderBenches(capped).benches[0].createdAt, 999);

  const oversized = validBench({
    scenario: validScenario({ params: { framing: "x".repeat(9000) } }),
  });
  const sizeResult = saveReaderBench(capped, oversized);
  assert.ok(!sizeResult.ok);
  assert.equal(sizeResult.code, "size");

  const invalid = saveReaderBench(capped, { nope: true });
  assert.ok(!invalid.ok);
  assert.equal(invalid.code, "invalid");

  const failing = failingWriteStorage(memoryStorage());
  const storageResult = saveReaderBench(failing, validBench());
  assert.ok(!storageResult.ok);
  assert.equal(storageResult.code, "storage");

  deleteReaderBench(capped, "r0");
  assert.deepEqual(
    loadReaderBenches(capped).benches.map((item) => item.id),
    full.slice(1).map((item) => item.id),
  );
});

test("saveReaderBench refuses to overwrite a corrupt store", () => {
  const raw = "{not json";
  const storage = memoryStorage({ [STORAGE_KEYS.benches]: raw });
  const result = saveReaderBench(storage, validBench());
  assert.equal(result.ok, false);
  assert.equal(result.code, "corrupt");
  assert.deepEqual(result.benches, []);
  assert.equal(storage.getItem(STORAGE_KEYS.benches), raw);
});

test("deleteReaderBench throws and leaves the store intact when the write fails", () => {
  const bench = validBench({ id: "r0" });
  const keep = validBench({ id: "r1" });
  const inner = memoryStorage({ [STORAGE_KEYS.benches]: JSON.stringify([bench, keep]) });
  const storage = failingWriteStorage(inner);
  assert.throws(
    () => deleteReaderBench(storage, "r0"),
    /could not delete reader bench: QuotaExceededError/,
  );
  assert.deepEqual(loadReaderBenches(inner), {
    benches: [bench, keep],
    dropped: 0,
    corrupt: false,
  });
});

test("clearReaderBenches removes the key and surfaces removal failures", () => {
  const storage = memoryStorage({ [STORAGE_KEYS.benches]: "{not json" });
  clearReaderBenches(storage);
  assert.equal(storage.getItem(STORAGE_KEYS.benches), null);
  assert.deepEqual(loadReaderBenches(storage), { benches: [], dropped: 0, corrupt: false });

  const failing = failingRemoveStorage(
    memoryStorage({ [STORAGE_KEYS.benches]: JSON.stringify([validBench()]) }),
  );
  assert.throws(
    () => clearReaderBenches(failing),
    /could not clear reader benches: SecurityError/,
  );
  assert.notEqual(failing.getItem(STORAGE_KEYS.benches), null);
});
