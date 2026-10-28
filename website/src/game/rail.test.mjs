import test from "node:test";
import assert from "node:assert/strict";
import { HELP_IDLE_MS, shouldOfferHelp } from "./rail.ts";

test("help is hidden at rest", () => {
  const offer = shouldOfferHelp({
    hintIndex: 0,
    hasRejection: false,
    status: "playing",
    now: 10_000,
    lastAcceptedAt: 5_000,
  });
  assert.equal(offer, false);
});

test("help appears after a rejection", () => {
  const offer = shouldOfferHelp({
    hintIndex: 0,
    hasRejection: true,
    status: "playing",
    now: 10_000,
    lastAcceptedAt: 9_000,
  });
  assert.equal(offer, true);
});

test("help appears after 25 seconds without an accepted move", () => {
  const offer = shouldOfferHelp({
    hintIndex: 0,
    hasRejection: false,
    status: "playing",
    now: 35_000,
    lastAcceptedAt: 10_000,
  });
  assert.equal(offer, true);

  const offerJustBefore = shouldOfferHelp({
    hintIndex: 0,
    hasRejection: false,
    status: "playing",
    now: 34_999,
    lastAcceptedAt: 10_000,
  });
  assert.equal(offerJustBefore, false);
});

test("an accepted move resets the idle state", () => {
  const start = 10_000;
  assert.equal(
    shouldOfferHelp({
      hintIndex: 0,
      hasRejection: false,
      status: "playing",
      now: start + HELP_IDLE_MS,
      lastAcceptedAt: start,
    }),
    true,
  );

  const acceptedAt = start + HELP_IDLE_MS;
  assert.equal(
    shouldOfferHelp({
      hintIndex: 0,
      hasRejection: false,
      status: "playing",
      now: acceptedAt + 1_000,
      lastAcceptedAt: acceptedAt,
    }),
    false,
  );
});

test("a revealed hint keeps help visible", () => {
  const offer = shouldOfferHelp({
    hintIndex: 1,
    hasRejection: false,
    status: "playing",
    now: 10_000,
    lastAcceptedAt: 9_500,
  });
  assert.equal(offer, true);
});

test("help is never offered when the mission is terminal", () => {
  for (const status of ["won", "lost"]) {
    assert.equal(
      shouldOfferHelp({
        hintIndex: 2,
        hasRejection: true,
        status: status,
        now: 100_000,
        lastAcceptedAt: 0,
      }),
      false,
    );
  }
});
