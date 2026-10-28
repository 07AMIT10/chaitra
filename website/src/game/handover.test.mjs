import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseHandoverMove,
  handoverSeen,
  markHandoverSeen,
  shouldHandover,
} from "./handover.ts";
import { play, start } from "./engine.ts";
import { loadLevel } from "./levels/index.ts";

test("the handover move is the first legal move, not the solution’s first move", () => {
  const fakeLevel = {
    moves: () => [
      { id: "move-b", label: "Move B" },
      { id: "move-a", label: "Move A" },
    ],
    solution: ["move-a"],
  };
  const fakeSession = { state: {}, moves: 0, status: "playing" };
  const chosen = chooseHandoverMove(fakeLevel, fakeSession);
  assert.equal(chosen?.id, "move-b");
  assert.notEqual(chosen?.id, fakeLevel.solution[0]);

  // Disabled moves are skipped
  const fakeLevelWithDisabled = {
    moves: () => [
      { id: "disabled-first", label: "Disabled", disabled: true },
      { id: "legal-second", label: "Legal" },
    ],
    solution: ["disabled-first"],
  };
  const chosenLegal = chooseHandoverMove(fakeLevelWithDisabled, fakeSession);
  assert.equal(chosenLegal?.id, "legal-second");
});

test("a seen grammar does not hand over again", () => {
  const store = new Map();
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  };

  assert.equal(handoverSeen(storage, "graph"), false);
  assert.equal(
    shouldHandover({ moveCount: 0, seen: handoverSeen(storage, "graph"), status: "playing" }),
    true,
  );

  markHandoverSeen(storage, "graph");
  assert.equal(handoverSeen(storage, "graph"), true);
  assert.equal(
    shouldHandover({ moveCount: 0, seen: handoverSeen(storage, "graph"), status: "playing" }),
    false,
  );

  // Another unseen grammar still hands over
  assert.equal(handoverSeen(storage, "tree"), false);
  assert.equal(
    shouldHandover({ moveCount: 0, seen: handoverSeen(storage, "tree"), status: "playing" }),
    true,
  );
});

test("a terminal session does not hand over", () => {
  assert.equal(shouldHandover({ moveCount: 0, seen: false, status: "won" }), false);
  assert.equal(shouldHandover({ moveCount: 0, seen: false, status: "lost" }), false);
});

test("a session with an accepted move does not hand over", () => {
  assert.equal(shouldHandover({ moveCount: 1, seen: false, status: "playing" }), false);
  assert.equal(shouldHandover({ moveCount: 5, seen: false, status: "playing" }), false);
});

test("corrupt/old handover storage fails closed", () => {
  const testCases = [
    "{not json",
    "123",
    "\"graph\"",
    "null",
    "{\"seen\": true}",
    "[123, null]",
  ];

  for (const bad of testCases) {
    const storage = {
      getItem: () => bad,
      setItem: () => {},
    };
    assert.equal(handoverSeen(storage, "graph"), false);
  }

  // Storage that throws on getItem
  const throwingStorage = {
    getItem: () => {
      throw new Error("SecurityError: access denied");
    },
    setItem: () => {},
  };
  assert.equal(handoverSeen(throwingStorage, "graph"), false);

  // Recover from corrupt storage via markHandoverSeen
  let saved = null;
  const recoverStorage = {
    getItem: () => "{bad json",
    setItem: (_k, v) => {
      saved = v;
    },
  };
  markHandoverSeen(recoverStorage, "graph");
  assert.deepEqual(JSON.parse(saved), ["graph"]);

  // Null storage
  assert.equal(handoverSeen(null, "graph"), false);
  markHandoverSeen(null, "graph"); // does not throw
});

test("union-find starts with A selected and offers merge:A:B first", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  const session = start(level);

  assert.equal(session.state.selected, "A");
  const moves = level.moves(session.state);
  assert.ok(moves.length > 0);
  assert.equal(moves[0].id, "merge:A:B");

  const firstMove = chooseHandoverMove(level, session);
  assert.ok(firstMove);
  assert.equal(firstMove.id, "merge:A:B");

  // Board view also binds merge:A:B to node B
  const view = level.view(session.state);
  const nodeB = view.nodes.find((n) => n.id === "B");
  assert.ok(nodeB);
  assert.equal(nodeB.moveId, "merge:A:B");

  // Node A has clear
  const nodeA = view.nodes.find((n) => n.id === "A");
  assert.ok(nodeA);
  assert.equal(nodeA.moveId, "clear");
  assert.equal(nodeA.state, "target");
});

test("the union-find solution still wins", async () => {
  const level = await loadLevel("union-find");
  assert.ok(level);
  assert.equal(level.solution[0], "merge:A:B");
  assert.equal(level.solution.length, 9);

  let session = start(level);
  for (const moveId of level.solution) {
    const result = play(level, session, moveId);
    assert.equal(result.error, undefined, `${moveId}: ${result.error}`);
    session = result.session;
  }

  assert.equal(session.status, "won");
  assert.equal(session.moves, 9);
  const score = level.score(session.state);
  assert.equal(score.stars, 3);
});
