import test from "node:test";
import assert from "node:assert/strict";

import { EMPTY_PROGRESS } from "./progress.ts";
import { ACT_LORE, ENDING, LORE } from "./lore.ts";
import { LEVEL_META } from "./levels/meta/index.ts";
import {
  CHECKPOINT_CADENCE,
  SESSION_KEY,
  acknowledgeCheckpoint,
  actProgress,
  actTransition,
  applyRepairToSession,
  cleanRuns,
  deckOf,
  emptySessionSummary,
  endingSummary,
  isActComplete,
  isCampaignComplete,
  lastRepair,
  loadSessionSummary,
  logProgress,
  loreEntriesFromLore,
  missionMap,
  nextMission,
  optionalConstraintsMet,
  personalBest,
  recordSessionRepair,
  repairedCount,
  repairsSinceCheckpoint,
  resetSessionSummary,
  resumeSummary,
  saveCheckpointAcknowledged,
  sessionCheckpoint,
  winActions,
  writeSessionSummary,
} from "./progression.ts";
import { GAME_MAP_PATH } from "./routes.ts";

function progressFor(
  slugs,
  { stars = 3, moves = 5, at = "2026-10-26T10:00:00.000Z" } = {},
) {
  const levels = {};
  for (const slug of slugs) levels[slug] = { stars, moves, at };
  return { version: 1, levels };
}

function allSlugs() {
  return LEVEL_META.map((meta) => meta.slug);
}

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("deckOf maps the three acts to stable labels", () => {
  assert.deepEqual(
    { label: deckOf(1).label, promise: deckOf(1).promise },
    { label: "DECK 1 · CADET", promise: "One verb per system." },
  );
  assert.equal(deckOf(2).label, "DECK 2 · ENGINEER");
  assert.equal(deckOf(3).label, "DECK 3 · ARCHITECT");
  assert.equal(deckOf(LEVEL_META[8]).act, 2);
});

test("campaign counts ignore stale slugs and count clean runs honestly", () => {
  const progress = progressFor([LEVEL_META[0].slug], { stars: 3, moves: 5 });
  progress.levels["removed-mission"] = {
    stars: 3,
    moves: 1,
    at: "2026-10-26T10:00:00.000Z",
  };
  assert.equal(repairedCount(LEVEL_META, progress), 1);
  assert.equal(cleanRuns(LEVEL_META, progress), 1);
  assert.equal(
    cleanRuns(LEVEL_META, progressFor([LEVEL_META[0].slug], { stars: 2 })),
    0,
  );
});

test("actProgress reports the deck's next system and never mutates metas", () => {
  const progress = progressFor([LEVEL_META[0].slug, LEVEL_META[1].slug]);
  const act = actProgress(LEVEL_META, progress, 1);
  assert.equal(act.total, 8);
  assert.equal(act.repaired, 2);
  assert.equal(act.remaining, 6);
  assert.equal(act.percent, 25);
  assert.equal(act.next?.slug, LEVEL_META[2].slug);
  assert.equal(act.complete, false);
  assert.equal(act.started, true);
  assert.deepEqual(
    LEVEL_META.map((meta) => meta.number),
    [...LEVEL_META].map((meta) => meta.number).sort((a, b) => a - b),
  );
});

test("isActComplete requires every mission on that deck", () => {
  const actOne = LEVEL_META.filter((meta) => meta.act === 1);
  const seven = progressFor(actOne.slice(0, -1).map((meta) => meta.slug));
  const eight = progressFor(actOne.map((meta) => meta.slug));
  assert.equal(isActComplete(LEVEL_META, seven, 1), false);
  assert.equal(isActComplete(LEVEL_META, eight, 1), true);
  assert.equal(isActComplete(LEVEL_META, EMPTY_PROGRESS, 1), false);
});

test("nextMission is the first unsolved mission, with its preview hook", () => {
  const progress = progressFor(
    LEVEL_META.slice(0, 3).map((meta) => meta.slug),
  );
  const next = nextMission(LEVEL_META, progress);
  assert.ok(next);
  assert.equal(next.meta.number, 4);
  assert.equal(next.meta.slug, "topological-sort");
  assert.equal(next.deck.label, "DECK 1 · CADET");
  assert.equal(next.previous?.slug, "breadth-first-search");
  assert.ok(next.hook.length > 10);
  assert.equal(next.label, "MISSION 04 · FIVE SHADOWS");

  const none = nextMission(LEVEL_META, progressFor(allSlugs()));
  assert.equal(none, null);
});

test("nextMission finds the earliest hole after an out-of-order solve", () => {
  const progress = progressFor([LEVEL_META[1].slug]);
  assert.equal(nextMission(LEVEL_META, progress)?.meta.number, 1);
});

test("missionMap marks repaired, next, open, and sealed nodes", () => {
  const progress = progressFor([LEVEL_META[0].slug, LEVEL_META[1].slug]);
  const nodes = missionMap(LEVEL_META, progress);
  assert.equal(nodes.length, 24);
  assert.equal(nodes[0].state, "repaired");
  assert.equal(nodes[0].replayable, true);
  assert.equal(nodes[0].clean, true);
  assert.equal(nodes[1].state, "repaired");
  assert.equal(nodes[2].state, "next");
  assert.equal(nodes[3].state, "locked");
  assert.match(nodes[3].label, /Repair 03 first/);

  const outOfOrder = missionMap(LEVEL_META, progressFor([LEVEL_META[1].slug]));
  assert.equal(outOfOrder[0].state, "next");
  assert.equal(outOfOrder[1].state, "repaired");
  assert.equal(outOfOrder[2].state, "open");
  assert.equal(outOfOrder[3].state, "locked");
});

test("lastRepair selects the newest record, not the highest number", () => {
  const progress = {
    version: 1,
    levels: {
      [LEVEL_META[0].slug]: {
        stars: 3,
        moves: 5,
        at: "2026-10-26T10:00:00.000Z",
      },
      [LEVEL_META[1].slug]: {
        stars: 2,
        moves: 6,
        at: "2026-10-26T12:00:00.000Z",
      },
    },
  };
  const last = lastRepair(LEVEL_META, progress);
  assert.equal(last?.meta.number, 2);
  assert.equal(last?.clean, false);
  assert.equal(last?.detail, "6 moves");
});

test("personalBest reads the stored best without inventing a run", () => {
  const progress = progressFor([LEVEL_META[0].slug], { stars: 2, moves: 7 });
  assert.deepEqual(personalBest(progress, LEVEL_META[0].slug), {
    stars: 2,
    moves: 7,
    at: "2026-10-26T10:00:00.000Z",
    clean: false,
  });
  assert.equal(personalBest(progress, "not-installed"), null);
});

test("logProgress gives one fragment per repair and withholds the ending", () => {
  const two = progressFor(LEVEL_META.slice(0, 2).map((meta) => meta.slug));
  const partial = logProgress(LEVEL_META, two);
  assert.equal(partial.total, 24);
  assert.equal(partial.unlocked, 2);
  assert.equal(partial.remaining, 22);
  assert.equal(partial.endingUnlocked, false);
  assert.equal(partial.nextSlug, LEVEL_META[2].slug);

  const complete = logProgress(LEVEL_META, progressFor(allSlugs()));
  assert.equal(complete.unlocked, 24);
  assert.equal(complete.remaining, 0);
  assert.equal(complete.endingUnlocked, true);
  assert.equal(complete.nextSlug, null);
});

test("logProgress adapts to lore entries, interludes, and the ending", () => {
  const lore = [
    { id: "f1", mission: "union-find", kind: "fragment", title: "First" },
    { id: "i1", mission: "binary-search", kind: "interlude", title: "Interlude" },
    { id: "f2", unlocksAt: 3, kind: "fragment", title: "Third" },
    { id: "end", kind: "ending", title: "Landing" },
  ];
  const one = logProgress(
    LEVEL_META,
    progressFor([LEVEL_META[0].slug]),
    lore,
  );
  assert.equal(one.total, 2);
  assert.equal(one.unlocked, 1);
  assert.equal(one.remaining, 1);
  assert.equal(one.entries.length, 4);
  assert.equal(one.endingUnlocked, false);
  assert.equal(one.ending?.unlocked, false);

  const all = logProgress(LEVEL_META, progressFor(allSlugs()), lore);
  assert.equal(all.endingUnlocked, true);
  assert.equal(all.ending?.unlocked, true);
  assert.equal(all.nextSlug, null);
});

test("lore.ts maps to 24 fragments, act interludes, and the ending", () => {
  const entries = loreEntriesFromLore(LORE, ACT_LORE, ENDING, LEVEL_META);
  assert.equal(entries.length, 24 + 6 + 1);

  const fresh = logProgress(LEVEL_META, EMPTY_PROGRESS, entries);
  assert.equal(fresh.total, 24);
  assert.equal(fresh.unlocked, 0);
  assert.equal(fresh.remaining, 24);
  assert.equal(fresh.entries.length, 31);
  assert.equal(fresh.entries[0].id, "act:1:intro");
  assert.equal(fresh.entries[0].unlocked, true);
  assert.equal(fresh.endingUnlocked, false);
  assert.equal(fresh.ending?.title, ENDING.title);

  const actOne = logProgress(
    LEVEL_META,
    progressFor(LEVEL_META.slice(0, 8).map((meta) => meta.slug)),
    entries,
  );
  assert.equal(actOne.unlocked, 8);
  assert.equal(actOne.remaining, 16);
  assert.equal(
    actOne.entries.find((entry) => entry.id === "act:1:outro")?.unlocked,
    true,
  );
  assert.equal(
    actOne.entries.find((entry) => entry.id === "act:2:intro")?.unlocked,
    true,
  );
  assert.equal(
    actOne.entries.find((entry) => entry.id === "act:2:outro")?.unlocked,
    false,
  );

  const complete = logProgress(LEVEL_META, progressFor(allSlugs()), entries);
  assert.equal(complete.total, 24);
  assert.equal(complete.unlocked, 24);
  assert.equal(complete.remaining, 0);
  assert.equal(complete.endingUnlocked, true);
  assert.equal(complete.ending?.unlocked, true);
  assert.equal(complete.nextSlug, null);

  const pilot = logProgress(LEVEL_META.slice(0, 2), EMPTY_PROGRESS, entries);
  assert.equal(pilot.total, 2);
  assert.equal(pilot.remaining, 2);
  assert.equal(
    pilot.entries.some((entry) => entry.id === "act:2:intro"),
    false,
  );
  assert.equal(pilot.ending?.unlocked, false);
});

test("endingSummary stays in approach until the registry is complete", () => {
  const partial = endingSummary(
    LEVEL_META,
    progressFor(LEVEL_META.slice(0, 5).map((meta) => meta.slug)),
  );
  assert.equal(partial.unlocked, false);
  assert.equal(partial.systemsRepaired, 5);
  assert.equal(partial.totalSystems, 24);
  assert.equal(partial.landing.state, "approach");
  assert.equal(partial.reason, null);

  const progress = progressFor(allSlugs(), { stars: 3, moves: 4 });
  const complete = endingSummary(LEVEL_META, progress);
  assert.equal(complete.unlocked, true);
  assert.equal(complete.systemsRepaired, 24);
  assert.equal(complete.cleanRuns, 24);
  assert.equal(complete.fragments.unlocked, 24);
  assert.equal(complete.fragments.remaining, 0);
  assert.equal(complete.landing.state, "landed");
  assert.equal(complete.landing.title, "THE SHIP LANDS.");
  assert.match(complete.landing.line, /Twenty-four systems/);
  assert.ok(complete.reason);
  assert.equal(complete.decks.length, 3);
  assert.equal(complete.decksCleared, 3);
  assert.equal(partial.decksCleared, 0);
});

test("actTransition fires only at the first two deck boundaries", () => {
  const actOne = LEVEL_META.filter((meta) => meta.act === 1);
  const doneOne = progressFor(actOne.map((meta) => meta.slug));
  const first = actTransition(LEVEL_META, doneOne, 1);
  assert.equal(first.due, true);
  assert.equal(first.kicker, "DECK 01 CLOSED · 08 / 08");
  assert.equal(first.title, "THE HULL HOLDS.");
  assert.equal(first.nextDeck?.label, "DECK 2 · ENGINEER");
  assert.match(first.nextLine ?? "", /The rules stop holding your hand/);

  assert.equal(actTransition(LEVEL_META, progressFor([]), 1).due, false);

  const doneAll = progressFor(allSlugs());
  const last = actTransition(LEVEL_META, doneAll, 3);
  assert.equal(last.due, false);
  assert.equal(last.nextDeck, null);
});

test("resumeSummary distinguishes a new run, a return, and the landing", () => {
  const fresh = resumeSummary(LEVEL_META, EMPTY_PROGRESS);
  assert.equal(fresh.returning, false);
  assert.equal(fresh.headline, "BEGIN REPAIR");
  assert.equal(fresh.next?.meta.number, 1);
  assert.equal(fresh.fragments.unlocked, 0);
  assert.equal(fresh.lastRepair, null);

  const returning = resumeSummary(
    LEVEL_META,
    progressFor(LEVEL_META.slice(0, 4).map((meta) => meta.slug)),
  );
  assert.equal(returning.returning, true);
  assert.equal(returning.headline, "NEXT REPAIR");
  assert.equal(returning.next?.meta.number, 5);
  assert.equal(returning.fragments.unlocked, 4);
  assert.equal(returning.fragments.remaining, 20);

  const complete = resumeSummary(LEVEL_META, progressFor(allSlugs()));
  assert.equal(complete.complete, true);
  assert.equal(complete.headline, "THE SHIP LANDS.");
  assert.equal(complete.next, null);
});

test("optional constraints are self-imposed and never persisted", () => {
  const results = optionalConstraintsMet({
    stars: 3,
    moves: 6,
    hints: 0,
    undos: 1,
    previousBestMoves: 8,
  });
  const byId = Object.fromEntries(results.map((result) => [result.id, result]));
  assert.equal(byId["clean-run"].met, true);
  assert.equal(byId["no-hints"].met, true);
  assert.equal(byId["no-undo"].met, false);
  assert.equal(byId["under-best"].met, true);
  assert.equal(byId["under-best"].available, true);

  const noBest = optionalConstraintsMet({ stars: 2, moves: 9 });
  assert.equal(noBest.find((result) => result.id === "under-best")?.available, false);
  assert.equal(noBest.find((result) => result.id === "no-hints")?.available, false);
});

test("session summary reaches a checkpoint at the cadence, then resets", () => {
  let summary = emptySessionSummary(new Date("2026-10-26T10:00:00.000Z"));
  summary = applyRepairToSession(summary, LEVEL_META[0], {
    stars: 3,
    moves: 5,
    at: "2026-10-26T10:01:00.000Z",
  });
  summary = applyRepairToSession(summary, LEVEL_META[1], {
    stars: 2,
    moves: 6,
    at: "2026-10-26T10:02:00.000Z",
  });

  const progress = progressFor(LEVEL_META.slice(0, 2).map((meta) => meta.slug));
  const early = sessionCheckpoint(summary, LEVEL_META, progress);
  assert.equal(early.due, false);
  assert.equal(early.count, 2);
  assert.equal(early.sinceCheckpoint, 2);

  summary = applyRepairToSession(summary, LEVEL_META[2], {
    stars: 3,
    moves: 4,
    at: "2026-10-26T10:03:00.000Z",
  });
  progress.levels[LEVEL_META[2].slug] = {
    stars: 3,
    moves: 4,
    at: "2026-10-26T10:03:00.000Z",
  };
  const due = sessionCheckpoint(summary, LEVEL_META, progress);
  assert.equal(due.due, true);
  assert.equal(due.title, "THREE SYSTEMS ONLINE.");
  assert.equal(due.repairs.length, 3);
  assert.equal(due.clean, 2);
  assert.equal(due.next?.meta.number, 4);
  assert.equal(due.pauseLabel, "PAUSE HERE");
  assert.equal(due.continueLabel, "NEXT REPAIR");

  const seen = acknowledgeCheckpoint(summary, "2026-10-26T10:04:00.000Z");
  assert.equal(seen.checkpoint.seenAt, 3);
  assert.equal(repairsSinceCheckpoint(seen), 0);
  assert.equal(
    sessionCheckpoint(seen, LEVEL_META, progress).due,
    false,
  );

  let next = seen;
  for (const offset of [3, 4, 5]) {
    next = applyRepairToSession(next, LEVEL_META[offset], {
      stars: 1,
      moves: 9,
      at: `2026-10-26T10:0${offset + 1}:00.000Z`,
    });
  }
  const second = sessionCheckpoint(next, LEVEL_META, progress);
  assert.equal(second.due, true);
  assert.equal(second.title, "THREE MORE SYSTEMS ONLINE.");
  assert.equal(second.sinceCheckpoint, CHECKPOINT_CADENCE);
});

test("replaying a system updates the best but does not inflate the session", () => {
  let summary = emptySessionSummary(new Date("2026-10-26T10:00:00.000Z"));
  summary = applyRepairToSession(summary, LEVEL_META[0], {
    stars: 1,
    moves: 9,
    at: "2026-10-26T10:01:00.000Z",
  });
  summary = applyRepairToSession(summary, LEVEL_META[0], {
    stars: 3,
    moves: 5,
    at: "2026-10-26T10:02:00.000Z",
  });
  assert.equal(summary.repairs.length, 1);
  assert.equal(summary.repairs[0].stars, 3);
  assert.equal(summary.repairs[0].moves, 5);
  assert.equal(summary.lastRepairSlug, LEVEL_META[0].slug);
  assert.equal(summary.updatedAt, "2026-10-26T10:02:00.000Z");
});

test("session summary persists per tab and fails soft when storage is gone", () => {
  const storage = fakeStorage();
  const first = recordSessionRepair(
    LEVEL_META[0],
    { stars: 3, moves: 5, at: "2026-10-26T10:01:00.000Z" },
    storage,
  );
  assert.equal(first.ok, true);
  assert.ok(storage.getItem(SESSION_KEY));

  const loaded = loadSessionSummary(storage);
  assert.equal(loaded.repairs.length, 1);
  assert.equal(loaded.repairs[0].slug, LEVEL_META[0].slug);
  assert.equal(loaded.lastRepairSlug, LEVEL_META[0].slug);

  const second = recordSessionRepair(
    LEVEL_META[1],
    { stars: 2, moves: 6, at: "2026-10-26T10:02:00.000Z" },
    storage,
  );
  assert.equal(second.ok, true);
  assert.equal(loadSessionSummary(storage).repairs.length, 2);

  const noStorage = recordSessionRepair(
    LEVEL_META[2],
    { stars: 1, moves: 9 },
    null,
  );
  assert.equal(noStorage.ok, false);
  assert.equal(noStorage.reason, "unavailable");
  assert.equal(noStorage.summary.repairs.length, 1);

  const failed = writeSessionSummary(
    emptySessionSummary(),
    {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    },
  );
  assert.deepEqual(failed, { ok: false, reason: "quota" });
});

test("corrupt or old session data resets instead of crashing", () => {
  const bad = fakeStorage({
    [SESSION_KEY]: JSON.stringify({
      version: 1,
      repairs: [{ slug: 3, at: "not-a-date" }],
      checkpoint: { seenAt: 99 },
    }),
  });
  const loaded = loadSessionSummary(bad);
  assert.equal(loaded.repairs.length, 0);
  assert.equal(loaded.checkpoint.seenAt, 0);

  const old = fakeStorage({
    [SESSION_KEY]: JSON.stringify({
      version: 2,
      repairs: [{ slug: "x", number: 1, title: "x", act: 1, stars: 3, moves: 1, at: "2026-10-26T10:00:00.000Z" }],
    }),
  });
  assert.equal(loadSessionSummary(old).repairs.length, 0);

  const reset = resetSessionSummary(bad);
  assert.equal(reset.repairs.length, 0);
  assert.equal(bad.getItem(SESSION_KEY), null);
});

test("acknowledging a checkpoint stores the pause point", () => {
  const storage = fakeStorage();
  const recorded = recordSessionRepair(
    LEVEL_META[0],
    { stars: 3, moves: 5 },
    storage,
  );
  const acknowledged = saveCheckpointAcknowledged(recorded.summary, storage);
  assert.equal(acknowledged.ok, true);
  assert.equal(loadSessionSummary(storage).checkpoint.seenAt, 1);
  assert.ok(loadSessionSummary(storage).checkpoint.at);
});

test("checkpoint stays quiet when the campaign is complete", () => {
  let summary = emptySessionSummary(new Date("2026-10-26T10:00:00.000Z"));
  for (const meta of LEVEL_META) {
    summary = applyRepairToSession(summary, meta, { stars: 2, moves: 6 });
  }
  const complete = progressFor(allSlugs());
  assert.equal(isCampaignComplete(LEVEL_META, complete), true);
  const checkpoint = sessionCheckpoint(summary, LEVEL_META, complete);
  assert.equal(checkpoint.count, 24);
  assert.equal(checkpoint.due, false);
  assert.equal(checkpoint.next, null);
});

test("win actions are close, mathematics, and next", () => {
  const meta1 = LEVEL_META[0];
  const meta2 = LEVEL_META[1];
  const actions = winActions(meta1, meta2, false);

  assert.equal(actions.length, 3);
  assert.deepEqual(
    actions.map((a) => a.id),
    ["close", "math", "next"],
  );

  assert.equal(actions[0].id, "close");
  assert.equal(actions[0].label, "CLOSE THE CONSOLE");
  assert.equal(actions[0].href, GAME_MAP_PATH);

  assert.equal(actions[1].id, "math");
  assert.equal(actions[1].label, "READ THE MATHEMATICS");
  assert.equal(actions[1].href, meta1.page);

  assert.equal(actions[2].id, "next");
  assert.equal(
    actions[2].label,
    `OPEN THE NEXT REPAIR · ${meta2.title.toUpperCase()}`,
  );
  assert.equal(actions[2].href, `/algorithms/game/${meta2.slug}`);
});

test("ending has no next action", () => {
  const metaFinal = LEVEL_META[LEVEL_META.length - 1];
  const actionsEnding = winActions(metaFinal, null, true);

  assert.equal(actionsEnding.length, 2);
  assert.deepEqual(
    actionsEnding.map((a) => a.id),
    ["close", "math"],
  );
  assert.equal(actionsEnding[0].id, "close");
  assert.equal(actionsEnding[0].href, GAME_MAP_PATH);
  assert.equal(actionsEnding[1].id, "math");
  assert.equal(actionsEnding[1].href, metaFinal.page);

  // Even if next is provided, ending = true suppresses next
  const actionsWithNextButEnding = winActions(metaFinal, LEVEL_META[0], true);
  assert.equal(actionsWithNextButEnding.length, 2);
});

test("next action uses the next mission’s title and slug", () => {
  const metaA = LEVEL_META[2];
  const metaB = LEVEL_META[3];
  const actions = winActions(metaA, metaB, false);
  const nextAction = actions.find((a) => a.id === "next");

  assert.ok(nextAction);
  assert.equal(
    nextAction.label,
    `OPEN THE NEXT REPAIR · ${metaB.title.toUpperCase()}`,
  );
  assert.equal(nextAction.href, `/algorithms/game/${metaB.slug}`);
});

test("close always uses the map path", () => {
  const metaFirst = LEVEL_META[0];
  const metaMid = LEVEL_META[5];
  const metaLast = LEVEL_META[LEVEL_META.length - 1];

  for (const [meta, next, ending] of [
    [metaFirst, LEVEL_META[1], false],
    [metaMid, LEVEL_META[6], false],
    [metaLast, null, true],
    [metaMid, null, false],
  ]) {
    const actions = winActions(meta, next, ending);
    const closeAction = actions.find((a) => a.id === "close");
    assert.ok(closeAction);
    assert.equal(closeAction.href, GAME_MAP_PATH);
    assert.equal(closeAction.label, "CLOSE THE CONSOLE");
  }
});
