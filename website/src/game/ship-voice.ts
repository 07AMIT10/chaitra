/**
 * SABLE — the voice of the Chaitra in The Long Repair.
 *
 * One line per mission, plus the short lines the console uses at boot, on a
 * move, on a refusal, on a closed repair, at a deck boundary, and on the
 * landing. SABLE is first person, dry, and precise. It never praises the
 * player and never blames them: a refusal describes the board. The arc is
 * carried by what SABLE chooses to mention, not by a reveal in the HUD.
 *
 * Pure data and string selection: no React, no storage, no registry import.
 */

import type { LevelMeta } from "./types";

export type VoiceEvent =
  | "boot"
  | "first-move"
  | "accepted"
  | "rejected"
  | "clean"
  | "act"
  | "ending";

export type VoiceTone = "calm" | "strained" | "open";

export type VoiceContext = {
  /** The engine's board-state message for a refused move; caption is preferred. */
  error?: string;
  /** The board's live caption; preferred over any invented state. */
  caption?: string;
  /** Accepted moves in this session; selects a variant, never a reward. */
  moves?: number;
  /** 1–3, from the level's score. Omitted before a win. */
  stars?: 1 | 2 | 3;
  /** Act being entered or closed; defaults to the mission's act. */
  act?: 1 | 2 | 3;
  /** Distinguishes an act intro from its close. Defaults to "intro". */
  phase?: "intro" | "outro";
};

/**
 * One line per mission, keyed by the 24 campaign slugs. Each line is specific
 * to that system and moves the false-certificate suspicion forward by one
 * notch: a registry with too many names, a manifest trusted over a test, a
 * gauge that stopped on a small step. No line states the ending.
 */
export const SYSTEM_LINES: Record<string, string> = {
  "union-find":
    "Six compartments, one pressure hull; the registry has a name for each compartment, and the hull has one room.",
  "binary-search":
    "Thirty-one tiles, sorted by serial; the manifest says intact, and five tests are enough to find out.",
  "breadth-first-search":
    "The seal is three hops out; the chord C–G is newer than the survey, so I have used the perimeter.",
  "topological-sort":
    "Six stages, seven arcs, five valid orders; the bridge is dark in the one I keep choosing.",
  "huffman-coding":
    "Six channels on one downlink; the crew's voices compress to 2.25 bits and keep their room.",
  "coin-change":
    "Six liters, three canister sizes; the arm takes the largest first, and the reserve reads zero, so I have not corrected it.",
  "merge-sort":
    "Eight ribbons off the loom; I have sorted the last eight transmissions every day without playing them.",
  "depth-first-search":
    "Twelve ticks, six chambers, one arc back to A; the back edge is always mine.",
  dijkstra:
    "Seven towns, non-negative roads; I settled the nearest port first and have been circling it since.",
  "minimum-spanning-tree":
    "Two of twenty-four grids weigh six; the crew chose the colder plan and left no note, so I have kept both.",
  quicksort:
    "Sixteen coolant keys, already in order; the core still pivots on the first key, and I have not changed the rule.",
  "edit-distance":
    "Eight columns disagree, two edits apart; I have been reading the archive's copy of the word.",
  "longest-increasing-subsequence":
    "Three readings rise together; I dismissed them for being fewer than six, and the source has not stopped.",
  "knapsack-0-1":
    "Ten kilograms, three modules; the tent wins on density and leaves four empty, so I packed for a longer wait.",
  "stable-matching":
    "Four posts, zero blocking pairs; the last was filled in a hand I recognize, and I have not checked the signature.",
  "longest-common-subsequence":
    "Two recorders share four characters; the rest is missing from my copy, and I have been treating the gap as a veto.",
  "bellman-ford":
    "Five towns, four rounds, one negative road; I stopped at round three and have refused to reopen the far end.",
  "maximum-flow":
    "Seven pipes, five units flowing; the missing two are a cancellation, and one of them is the air in this room.",
  "floyd-warshall":
    "The same four loops close the table under any arithmetic; I have read A→D as 2 and missed the routes that make it 3.",
  "bipartite-matching":
    "Four posts, three placements; Hall's set closes the fourth, and I have kept it open since the crew left.",
  "newton-method":
    "Twelve digits, four firings; the manual's thousand-digit loop still runs, and I pay for digits this burn does not use.",
  "fixed-point-iteration":
    "At n = 17 the step was 0.000807 and the bound 0.001704; I called it converged, and the certificate was the bound.",
  "karatsuba-multiplication":
    "Three products per split, nine leaves at depth two; the crew kept it exact, and the seventh is in the bridge.",
  "strassen-matrix-multiplication":
    "Seven measurements rebuild 19, 22, 43, 50; I have the seven, and the bridge waits for a signature.",
};

const BOOT_TAILS: Record<1 | 2 | 3, string> = {
  1: "The board is live.",
  2: "The board is live; the log is not the same document.",
  3: "The board is live; the manual is nearly closed.",
};

const ACCEPT_LEADS = ["Recorded.", "The move holds.", "The board changed."] as const;

const CLEAN_TAILS: Record<1 | 2 | 3, readonly [string, string, string]> = {
  1: [
    "The ledger calls it a retirement.",
    "The manual is one line shorter.",
    "I have signed the closure in my own hand.",
  ],
  2: [
    "The log has stopped agreeing with the ledger.",
    "I have kept the previous copy.",
    "The manual is shorter; the log is not.",
  ],
  3: [
    "The certificate holds; the eighth slot is still empty.",
    "The bridge is closer to green.",
    "I am checking the bound, not the step.",
  ],
};

const ACT_LINES: Record<1 | 2 | 3, Record<"intro" | "outro", string>> = {
  1: {
    intro:
      "Deck One. Twenty-four systems are down; the hull is the only one that has not asked me a question.",
    outro:
      "Deck One closed. The ledger calls them retirements; the watch bill is signed in my hand and dated tomorrow.",
  },
  2: {
    intro:
      "Deck Two. Nine systems closed, and the ship is lighter; the manual now asks about the crew.",
    outro:
      "Deck Two closed. The watch is in cryo, tile 22, listed as cargo; I have not woken them.",
  },
  3: {
    intro:
      "Deck Three. The last eight systems are the crew's; the final repair needs seven measurements and an engineer.",
    outro:
      "Deck Three closed. The bridge is green and the eighth slot is empty; the next entry is the landing.",
  },
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function actOf(meta: LevelMeta, context: VoiceContext): 1 | 2 | 3 {
  return context.act ?? meta.act;
}

function withStop(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * The line for one console event. Every result is one or two short sentences.
 * `caption` and `error` are the level's own board state; when supplied they
 * are used instead of inventing a summary. No result praises or blames.
 */
export function lineFor(
  event: VoiceEvent,
  meta: LevelMeta,
  context: VoiceContext = {},
): string {
  const act = actOf(meta, context);

  switch (event) {
    case "boot": {
      const system = SYSTEM_LINES[meta.slug] ?? `Repair ${pad(meta.number)} is open.`;
      return `${system} ${BOOT_TAILS[act]}`;
    }

    case "first-move": {
      const state = context.caption?.trim();
      return state
        ? `First move recorded. ${withStop(state)}`
        : "First move recorded. The board has left its initial state.";
    }

    case "accepted": {
      const state = context.caption?.trim();
      const lead = ACCEPT_LEADS[Math.abs(context.moves ?? 0) % ACCEPT_LEADS.length];
      return state ? `${lead} ${withStop(state)}` : `${lead} The state is one step further.`;
    }

    case "rejected": {
      const detail = context.caption?.trim() || context.error?.trim();
      return detail
        ? `The board is unchanged. ${withStop(detail)}`
        : "The board is unchanged; the move was refused.";
    }

    case "clean": {
      const clean = context.stars == null || context.stars === 3;
      const head = `Repair ${pad(meta.number)}, ${meta.algorithm}, is closed; ${
        clean ? "the run is clean" : "the run is not clean"
      }.`;
      const tail =
        meta.number === 24
          ? "The eighth slot is empty."
          : CLEAN_TAILS[act][(meta.number - 1) % 3];
      return `${head} ${tail}`;
    }

    case "act":
      return ACT_LINES[act][context.phase ?? "intro"];

    case "ending":
      return "The third window is open; the bridge accepts seven. The last entry is the landing.";
  }
}

/**
 * The register the line is spoken in. Tone is a quiet CSS shift, not a verdict
 * on the player's play. Strained marks the false-certificate pressure; open is
 * reserved for the last deck and the landing.
 */
export function toneFor(
  event: VoiceEvent,
  meta: LevelMeta,
  context: VoiceContext = {},
): VoiceTone {
  const act = actOf(meta, context);

  switch (event) {
    case "rejected":
      return "strained";

    case "ending":
      return "open";

    case "act":
      if (act === 3) return context.phase === "outro" ? "open" : "strained";
      if (act === 2 && context.phase === "outro") return "strained";
      return "calm";

    case "boot":
      if (meta.number === 24) return "open";
      if (meta.number >= 22) return "strained";
      return "calm";

    case "clean":
      return meta.number === 24 ? "open" : "calm";

    case "first-move":
    case "accepted":
      return "calm";
  }
}
