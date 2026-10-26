import type { GameEvent, LevelModule, Move } from "../../types";
import { stableMatchingMeta } from "../meta/stable-matching";

type MatchingState = {
  selected: string | null;
  holds: Record<string, string | null>;
  proposed: Record<string, string[]>;
  offers: number;
  rejections: number;
};

const APPLICANTS = ["A", "B", "C", "D"] as const;
const POSTS = ["w", "x", "y", "z"] as const;

/** Left side: applicants, ranked over posts. */
const APPLICANT_PREFS: Record<string, string[]> = {
  A: ["w", "x", "y", "z"],
  B: ["x", "w", "y", "z"],
  C: ["x", "y", "w", "z"],
  D: ["y", "x", "z", "w"],
};

/** Right side: posts, ranked over applicants. */
const POST_PREFS: Record<string, string[]> = {
  w: ["B", "A", "C", "D"],
  x: ["A", "B", "C", "D"],
  y: ["D", "C", "B", "A"],
  z: ["C", "D", "A", "B"],
};

function initialState(): MatchingState {
  const holds: Record<string, string | null> = {};
  for (const post of POSTS) holds[post] = null;
  const proposed: Record<string, string[]> = {};
  for (const applicant of APPLICANTS) proposed[applicant] = [];
  return { selected: null, holds, proposed, offers: 0, rejections: 0 };
}

function holderOf(state: MatchingState, applicant: string): string | null {
  const post = POSTS.find((entry) => state.holds[entry] === applicant);
  return post ?? null;
}

/** The post's rank of an applicant; lower is better. */
function postRankOf(post: string, applicant: string): number {
  return POST_PREFS[post].indexOf(applicant);
}

/** The applicant's rank of a post; lower is better. */
function applicantRankOf(applicant: string, post: string): number {
  return APPLICANT_PREFS[applicant].indexOf(post);
}

function isComplete(state: MatchingState): boolean {
  return APPLICANTS.every((applicant) => holderOf(state, applicant) !== null);
}

/** The canonical deferred-acceptance walk: every list is walked in order. */
function isCanonicalRun(state: MatchingState): boolean {
  const a = state.proposed.A;
  const b = state.proposed.B;
  const c = state.proposed.C;
  const d = state.proposed.D;
  return (
    a.length === 1 &&
    a[0] === "w" &&
    b.length === 1 &&
    b[0] === "x" &&
    c.length === 4 &&
    c[0] === "x" &&
    c[1] === "y" &&
    c[2] === "w" &&
    c[3] === "z" &&
    d.length === 1 &&
    d[0] === "y"
  );
}

function nextPost(state: MatchingState, applicant: string): string | null {
  const post = APPLICANT_PREFS[applicant].find((entry) => !state.proposed[applicant].includes(entry));
  return post ?? null;
}

function blockingPairs(state: MatchingState): { applicant: string; post: string }[] {
  const pairs: { applicant: string; post: string }[] = [];
  for (const applicant of APPLICANTS) {
    const heldPost = holderOf(state, applicant);
    for (const post of POSTS) {
      if (heldPost === post) continue;
      const heldApplicant = state.holds[post];
      if (heldApplicant === applicant) continue;
      const applicantWants =
        heldPost === null || applicantRankOf(applicant, post) < applicantRankOf(applicant, heldPost);
      const postWants =
        heldApplicant === null || postRankOf(post, applicant) < postRankOf(post, heldApplicant);
      if (applicantWants && postWants) pairs.push({ applicant, post });
    }
  }
  return pairs;
}

function statusOf(state: MatchingState): "playing" | "won" | "lost" {
  if (!isComplete(state)) return "playing";
  return blockingPairs(state).length === 0 ? "won" : "lost";
}

const level: LevelModule<MatchingState> = {
  meta: stableMatchingMeta,
  initial: initialState(),

  moves(state) {
    if (isComplete(state)) return [];

    const moves: Move[] = APPLICANTS
      .filter((applicant) => applicant !== state.selected)
      .map((applicant) => ({
        id: `select:${applicant}`,
        label: `Select ${applicant}`,
      }));

    if (state.selected !== null) {
      for (const post of POSTS) {
        moves.push({
          id: `propose:${state.selected}:${post}`,
          label: `Offer ${state.selected} to ${post}`,
        });
      }
      moves.push({ id: "clear", label: "Clear selection", placement: "tray" });
    }

    return moves;
  },

  apply(state, moveId) {
    if (moveId === "clear") {
      return { state: { ...state, selected: null }, events: [] };
    }

    if (moveId.startsWith("select:")) {
      const applicant = moveId.slice("select:".length);
      if (!APPLICANTS.includes(applicant as (typeof APPLICANTS)[number])) {
        return { state, events: [], error: `${applicant} is not on the applicant list.` };
      }
      const held = holderOf(state, applicant);
      if (held !== null) {
        return {
          state,
          events: [],
          error: `${applicant} is held by ${held}; a post holds one offer, so ${applicant} is not free to propose.`,
        };
      }
      if (state.selected === applicant) {
        return {
          state,
          events: [],
          error: `${applicant} is already selected. Choose a post or clear the selection.`,
        };
      }

      return {
        state: { ...state, selected: applicant },
        events: [
          {
            text: `${applicant} is free. Its list: ${APPLICANT_PREFS[applicant].join(" > ")}.`,
            kind: "info",
          },
        ],
      };
    }

    if (!moveId.startsWith("propose:")) {
      return { state, events: [], error: "Unknown move." };
    }

    const [, applicant, post] = moveId.split(":");
    if (
      !APPLICANTS.includes(applicant as (typeof APPLICANTS)[number]) ||
      !POSTS.includes(post as (typeof POSTS)[number])
    ) {
      return { state, events: [], error: "Unknown applicant or post." };
    }
    if (state.selected !== applicant) {
      return { state, events: [], error: `Select ${applicant} before offering to ${post}.` };
    }

    const held = holderOf(state, applicant);
    if (held !== null) {
      return {
        state,
        events: [],
        error: `${applicant} is held by ${held}; only a free applicant can make an offer.`,
      };
    }

    if (state.proposed[applicant].includes(post)) {
      const next = nextPost(state, applicant);
      return {
        state,
        events: [],
        error: `${applicant} already offered to ${post}; a post is never offered twice. ${
          next === null ? `${applicant} has no untried post.` : `The first untried post is ${next}.`
        }`,
      };
    }

    const holder = state.holds[post];
    const offers = state.offers + 1;
    const proposed = {
      ...state.proposed,
      [applicant]: [...state.proposed[applicant], post],
    };
    const events: GameEvent[] = [];
    let holds = state.holds;
    let rejections = state.rejections;
    let selected: string | null = null;

    if (holder === null) {
      holds = { ...state.holds, [post]: applicant };
      events.push({
        text: `${post} holds ${applicant} at rank ${postRankOf(post, applicant) + 1} of 4.`,
        kind: "info",
      });
    } else if (postRankOf(post, applicant) < postRankOf(post, holder)) {
      holds = { ...state.holds, [post]: applicant };
      rejections += 1;
      events.push({
        text: `${post} drops ${holder} (rank ${postRankOf(post, holder) + 1}) for ${applicant} (rank ${
          postRankOf(post, applicant) + 1
        }). ${holder} is free.`,
        kind: "info",
      });
    } else {
      rejections += 1;
      selected = applicant;
      const next = APPLICANT_PREFS[applicant].find((entry) => !proposed[applicant].includes(entry));
      events.push({
        text: `${post} holds ${holder} at rank ${postRankOf(post, holder) + 1}; ${applicant} is rank ${
          postRankOf(post, applicant) + 1
        }. ${post} rejects ${applicant}. ${
          next === undefined ? `${applicant} has no untried post.` : `${applicant}'s next untried post is ${next}.`
        }`,
        kind: "info",
      });
    }

    const nextState: MatchingState = { ...state, selected, holds, proposed, offers, rejections };
    const pairs = blockingPairs(nextState);

    if (isComplete(nextState)) {
      if (pairs.length === 0) {
        events.push({
          text: "All four posts hold one offer. Blocking pairs: 0.",
          kind: "good",
        });
      } else {
        const first = pairs[0];
        events.push({
          text: `All four are held, but ${first.applicant}–${first.post} blocks: both prefer each other to their assigned partners. Blocking pairs: ${pairs.length}.`,
          kind: "bad",
        });
      }
    }

    return { state: nextState, events };
  },

  view(state) {
    const pairs = blockingPairs(state);
    const holds = POSTS.filter((post) => state.holds[post] !== null).length;
    const scan =
      pairs.length === 0
        ? "0"
        : pairs.length === 1
          ? `1 (${pairs[0].applicant}–${pairs[0].post})`
          : `${pairs.length} (${pairs[0].applicant}–${pairs[0].post} first)`;
    const open = !isComplete(state);

    return {
      kind: "pairing",
      left: APPLICANTS.map((applicant) => {
        const held = holderOf(state, applicant);
        let stateLabel: "active" | "done" | "target" = "active";
        if (state.selected === applicant) stateLabel = "target";
        else if (held !== null) stateLabel = "done";
        return {
          id: applicant,
          label: `${applicant} · ${APPLICANT_PREFS[applicant].join(">")}`,
          state: stateLabel,
          moveId:
            open && state.selected !== applicant ? `select:${applicant}` : undefined,
        };
      }),
      right: POSTS.map((post) => {
        return {
          id: post,
          label: `${post} · ${POST_PREFS[post].join(">")}`,
          state: (state.selected !== null ? "active" : "idle") as "active" | "idle",
          moveId: open && state.selected !== null ? `propose:${state.selected}:${post}` : undefined,
        };
      }),
      links: POSTS.filter((post) => state.holds[post] !== null).map((post) => ({
        left: state.holds[post] as string,
        right: post,
        state: "done" as const,
      })),
      caption: `Offers ${state.offers} · Rejections ${state.rejections} · Holds ${holds}/4 · Blocking pairs ${scan}`,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (!isComplete(state) || blockingPairs(state).length > 0) {
      return { stars: 1, detail: "The roster is not stable." };
    }
    if (isCanonicalRun(state)) {
      return {
        stars: 3,
        detail: "Seven offers, three rejections: x, y and w each send C back down. Blocking pairs 0.",
      };
    }
    if (state.offers <= 9) {
      if (state.offers === 4 && state.rejections === 0) {
        const receiverOptimal =
          state.holds.w === "B" &&
          state.holds.x === "A" &&
          state.holds.y === "D" &&
          state.holds.z === "C";
        return {
          stars: 2,
          detail: receiverOptimal
            ? "Four offers, zero rejections: the receiver-optimal extreme, not the canonical seven and three."
            : "Four offers, zero rejections: the canonical matching, but C skipped x, y, w; the clean walk takes seven offers and three rejections.",
        };
      }
      return {
        stars: 2,
        detail:
          state.offers === 7 && state.rejections === 3
            ? "Seven offers, three rejections, but a list was skipped; the clean walk sends C down x, y, w before z."
            : `${state.offers} offers, ${state.rejections} rejection${
                state.rejections === 1 ? "" : "s"
              }; a stable roster, not the canonical seven and three.`,
      };
    }
    return {
      stars: 1,
      detail: `${state.offers} offers, ${state.rejections} rejections; the clean run is seven offers and three rejections.`,
    };
  },

  solution: [
    "select:A",
    "propose:A:w",
    "select:B",
    "propose:B:x",
    "select:C",
    "propose:C:x",
    "select:D",
    "propose:D:y",
    "select:C",
    "propose:C:y",
    "propose:C:w",
    "propose:C:z",
  ],
};

export default level;
