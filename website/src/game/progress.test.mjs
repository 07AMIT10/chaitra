import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPTY_PROGRESS,
  PROGRESS_KEY,
  loadProgress,
  resetProgress,
  saveSolved,
  solvedCount,
  starCount,
} from "./progress.ts";

class FakeStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
    this.failure = null;
  }

  getItem(key) {
    if (this.failure === "get") throw new Error("storage denied");
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    if (this.failure === "set") throw new Error("QuotaExceededError");
    this.map.set(key, String(value));
  }

  removeItem(key) {
    if (this.failure === "remove") throw new Error("storage denied");
    this.map.delete(key);
  }
}

function withWindow(storage) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const previous = globalThis.window;
  globalThis.window = storage === null ? undefined : { localStorage: storage };
  if (storage === null) delete globalThis.window;
  return () => {
    if (hadWindow) globalThis.window = previous;
    else delete globalThis.window;
  };
}

function record(stars, moves, at = "2026-01-01T00:00:00.000Z") {
  return { stars, moves, at };
}

test("missing browser storage fails soft", () => {
  const restore = withWindow(null);
  try {
    assert.deepEqual(loadProgress(), EMPTY_PROGRESS);
    const saved = saveSolved("union-find", 3, 5);
    assert.equal(saved.ok, false);
    assert.equal(saved.reason, "disabled");
    assert.equal(saved.progress.levels["union-find"].stars, 3);
    assert.deepEqual(resetProgress(), EMPTY_PROGRESS);
  } finally {
    restore();
  }
});

test("corrupt progress JSON, wrong versions, and bad records are discarded", () => {
  const invalid = [
    "{",
    "null",
    "[]",
    JSON.stringify({ version: 2, levels: {} }),
    JSON.stringify({ version: 1, levels: [] }),
    JSON.stringify({ version: 1, levels: "nope" }),
  ];
  for (const raw of invalid) {
    const storage = new FakeStorage({ [PROGRESS_KEY]: raw });
    const restore = withWindow(storage);
    try {
      assert.deepEqual(loadProgress(), EMPTY_PROGRESS, `raw=${raw}`);
    } finally {
      restore();
    }
  }

  const mixed = {
    version: 1,
    levels: {
      "union-find": record(3, 5),
      "binary-search": record(2.5, 7),
      "coin-change": record(9, 3),
      "knapsack-0-1": record(2, -1),
      "stable-matching": record(2, 4, 17),
      "longest-common-subsequence": { stars: 3, moves: 5 },
      extra: record(1, 1),
    },
  };
  const storage = new FakeStorage({ [PROGRESS_KEY]: JSON.stringify(mixed) });
  const restore = withWindow(storage);
  try {
    const progress = loadProgress();
    assert.deepEqual(Object.keys(progress.levels).sort(), ["extra", "union-find"]);
    assert.deepEqual(progress.levels["union-find"], record(3, 5));
    assert.equal("unknown" in progress.levels["union-find"], false, "records are rebuilt with known fields only");
  } finally {
    restore();
  }
});

test("loadProgress never lets a stored __proto__ key pollute the registry", () => {
  const raw = JSON.stringify({
    version: 1,
    levels: {
      ["__proto__"]: record(3, 1),
      "union-find": record(2, 6),
    },
  });
  const storage = new FakeStorage({ [PROGRESS_KEY]: raw });
  const restore = withWindow(storage);
  try {
    const progress = loadProgress();
    assert.equal(Object.getPrototypeOf(progress.levels), Object.prototype);
    assert.equal(Object.prototype.stars, undefined);
    assert.deepEqual(Object.keys(progress.levels), ["union-find"]);
    assert.equal(progress.levels["union-find"].stars, 2);
  } finally {
    restore();
  }
});

test("throwing localStorage getters and setters are contained", () => {
  const storage = new FakeStorage();
  storage.failure = "get";
  let restore = withWindow(storage);
  try {
    assert.deepEqual(loadProgress(), EMPTY_PROGRESS);
  } finally {
    restore();
  }

  storage.failure = null;
  restore = withWindow(storage);
  try {
    storage.failure = "set";
    const saved = saveSolved("union-find", 2, 7);
    assert.equal(saved.ok, false);
    assert.equal(saved.reason, "quota");
    assert.equal(saved.progress.levels["union-find"].stars, 2);
    assert.equal(storage.map.has(PROGRESS_KEY), false);

    storage.failure = null;
    const loaded = loadProgress();
    assert.deepEqual(loaded, EMPTY_PROGRESS, "a failed write must not pretend to be durable");
  } finally {
    restore();
  }
});

test("saveSolved keeps the best stars and fewest moves across replays", () => {
  const storage = new FakeStorage();
  const restore = withWindow(storage);
  try {
    const first = saveSolved("union-find", 2, 12);
    assert.equal(first.ok, true);
    assert.deepEqual(first.progress.levels["union-find"], { ...record(2, 12), at: first.progress.levels["union-find"].at });

    const betterStars = saveSolved("union-find", 3, 20);
    assert.equal(betterStars.progress.levels["union-find"].stars, 3);
    assert.equal(betterStars.progress.levels["union-find"].moves, 12);

    const worseReplay = saveSolved("union-find", 1, 30);
    assert.equal(worseReplay.progress.levels["union-find"].stars, 3);
    assert.equal(worseReplay.progress.levels["union-find"].moves, 12);

    const fewerMoves = saveSolved("union-find", 3, 8);
    assert.equal(fewerMoves.progress.levels["union-find"].stars, 3);
    assert.equal(fewerMoves.progress.levels["union-find"].moves, 8);

    const stored = JSON.parse(storage.getItem(PROGRESS_KEY));
    assert.deepEqual(stored, fewerMoves.progress);
  } finally {
    restore();
  }
});

test("saveSolved clamps hostile star and move values", () => {
  const storage = new FakeStorage();
  const restore = withWindow(storage);
  try {
    const weird = saveSolved("weird", Number.NaN, Number.NaN);
    assert.equal(weird.progress.levels.weird.stars, 1);
    assert.equal(weird.progress.levels.weird.moves, 0);

    const high = saveSolved("high", Number.POSITIVE_INFINITY, -12);
    assert.equal(high.progress.levels.high.stars, 3);
    assert.equal(high.progress.levels.high.moves, 0);

    const fractional = saveSolved("fractional", 4.6, 3.4);
    assert.equal(fractional.progress.levels.fractional.stars, 3);
    assert.equal(fractional.progress.levels.fractional.moves, 3);
  } finally {
    restore();
  }
});

test("counts ignore malformed records and reset clears storage", () => {
  const storage = new FakeStorage();
  const restore = withWindow(storage);
  try {
    saveSolved("union-find", 3, 5);
    saveSolved("binary-search", 1, 9);

    const progress = {
      version: 1,
      levels: {
        ...loadProgress().levels,
        broken: { stars: 99, moves: 1, at: "x" },
      },
    };
    assert.equal(solvedCount(progress), 2);
    assert.equal(starCount(progress), 4);

    const empty = resetProgress();
    assert.deepEqual(empty, EMPTY_PROGRESS);
    assert.equal(storage.getItem(PROGRESS_KEY), null);
    assert.equal(solvedCount(empty), 0);
    assert.equal(starCount(empty), 0);
  } finally {
    restore();
  }
});

test("loadProgress returns independent objects", () => {
  const storage = new FakeStorage();
  const restore = withWindow(storage);
  try {
    const first = loadProgress();
    first.levels.injected = record(3, 1);
    first.version = 99;
    const second = loadProgress();
    assert.deepEqual(second, EMPTY_PROGRESS);
    assert.equal("injected" in second.levels, false);
  } finally {
    restore();
  }
});
