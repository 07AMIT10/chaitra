import test from "node:test";
import assert from "node:assert/strict";
import { isMoveInteractive } from "./board-access.ts";
import bfs from "./levels/modules/breadth-first-search.ts";

test("without a legal set, every bound move is interactive", () => {
  assert.equal(isMoveInteractive("probe:3", undefined), true);
  assert.equal(isMoveInteractive("stamp:A", undefined), true);
  assert.equal(isMoveInteractive(undefined, undefined), false);
});

test("a bound move outside the legal set is not interactive", () => {
  const legal = new Set(["probe:3", "probe:5"]);
  assert.equal(isMoveInteractive("probe:3", legal), true);
  assert.equal(isMoveInteractive("probe:4", legal), false);
  assert.equal(isMoveInteractive(undefined, legal), false);
});

test("a blocked BFS town is not a button but remains in the view", () => {
  const initial = bfs.initial;
  const view = bfs.view(initial);
  const moves = bfs.moves(initial);
  const legalMoveIds = new Set(moves.filter((m) => !m.disabled).map((m) => m.id));

  // In the initial BFS state, C is not a neighbour of queue front S.
  const townC = view.nodes.find((node) => node.id === "C");
  assert.ok(townC, "Town C must exist in BFS view");
  assert.equal(townC.moveId, "stamp:C", "Town C remains bound with its moveId");
  assert.equal(
    isMoveInteractive(townC.moveId, legalMoveIds),
    false,
    "Town C is outside legalMoveIds and therefore not interactive",
  );
});

test("a legal BFS town is interactive", () => {
  const initial = bfs.initial;
  const view = bfs.view(initial);
  const moves = bfs.moves(initial);
  const legalMoveIds = new Set(moves.filter((m) => !m.disabled).map((m) => m.id));

  // In the initial BFS state, A and B are neighbours of queue front S.
  const townA = view.nodes.find((node) => node.id === "A");
  assert.ok(townA, "Town A must exist in BFS view");
  assert.equal(townA.moveId, "stamp:A", "Town A remains bound with its moveId");
  assert.equal(
    isMoveInteractive(townA.moveId, legalMoveIds),
    true,
    "Town A is in legalMoveIds and therefore interactive",
  );
});
