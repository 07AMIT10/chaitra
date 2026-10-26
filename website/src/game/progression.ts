/**
 * Progression and sitting-level state for The Long Repair.
 *
 * This module is deliberately UI-free: it computes deck membership, act
 * progress, the next repair, the ship's-log count, the ending summary, and a
 * per-tab session summary. Nothing here renders, schedules, animates, or talks
 * to a server. Campaign progress stays in `Progress`; the session summary is a
 * separate, versioned sessionStorage record so closing the tab is a clean exit,
 * not a lost streak.
 *
 * Honesty rules:
 * - A system counts as repaired only when the current registry has a matching
 *   record in `Progress`. Stale slugs in storage are ignored.
 * - A clean run means the level's own score awarded all three marks. Replays
 *   may improve a record, never lower it; `saveSolved` already keeps the best.
 * - There is no streak, daily challenge, timer, leaderboard, or loot state.
 */

import { ACTS } from "./levels/meta";
import type { Progress, SolvedLevel } from "./progress";
import type { Act, LevelMeta } from "./types";

/** Three repairs is the default checkpoint cadence. Two is allowed. */
export const CHECKPOINT_CADENCE = 3;

/** Session summaries are per-tab and versioned like the durable progress key. */
export const SESSION_KEY = "chaitra_algorithms_game_session";
export const SESSION_VERSION = 1 as const;

const SESSION_REPAIR_LIMIT = 64;

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

export type Deck = {
  act: Act;
  name: string;
  promise: string;
  /** "DECK 2 · ENGINEER" */
  label: string;
  /** "DECK 2" */
  short: string;
};

const FALLBACK_DECK = {
  act: 1 as Act,
  name: "Cadet",
  subtitle: "One verb per system.",
};

export function deckOf(input: Act | Pick<LevelMeta, "act">): Deck {
  const act = typeof input === "number" ? input : input.act;
  const entry = ACTS.find((candidate) => candidate.act === act) ?? FALLBACK_DECK;
  return {
    act: entry.act,
    name: entry.name,
    promise: entry.subtitle,
    label: `DECK ${entry.act} · ${entry.name.toUpperCase()}`,
    short: `DECK ${entry.act}`,
  };
}

function campaignOrder(metas: readonly LevelMeta[]): LevelMeta[] {
  return [...metas].sort((a, b) => a.number - b.number);
}

function cleanRecord(record: SolvedLevel | undefined): boolean {
  return Boolean(record && record.stars >= 3);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

// ---------------------------------------------------------------------------
// Campaign counts
// ---------------------------------------------------------------------------

/** Repaired systems in the current registry, not stale slugs in storage. */
export function repairedCount(metas: readonly LevelMeta[], progress: Progress): number {
  return campaignOrder(metas).filter((meta) => Boolean(progress.levels[meta.slug])).length;
}

/** Clean runs (three marks) among the current registry's missions. */
export function cleanRuns(metas: readonly LevelMeta[], progress: Progress): number {
  return campaignOrder(metas).filter((meta) => cleanRecord(progress.levels[meta.slug])).length;
}

export function isActComplete(
  metas: readonly LevelMeta[],
  progress: Progress,
  act: Act,
): boolean {
  const levels = metas.filter((meta) => meta.act === act);
  return levels.length > 0 && levels.every((meta) => Boolean(progress.levels[meta.slug]));
}

export function isCampaignComplete(metas: readonly LevelMeta[], progress: Progress): boolean {
  const ordered = campaignOrder(metas);
  return ordered.length > 0 && ordered.every((meta) => Boolean(progress.levels[meta.slug]));
}

export type ActProgress = {
  act: Act;
  deck: Deck;
  total: number;
  repaired: number;
  clean: number;
  remaining: number;
  complete: boolean;
  started: boolean;
  /** Rounded repaired / total, for an honest deck meter. */
  percent: number;
  next: LevelMeta | null;
  levels: LevelMeta[];
  repairedLevels: LevelMeta[];
  cleanLevels: LevelMeta[];
  remainingLevels: LevelMeta[];
};

export function actProgress(
  metas: readonly LevelMeta[],
  progress: Progress,
  act: Act,
): ActProgress {
  const ordered = campaignOrder(metas);
  const levels = ordered.filter((meta) => meta.act === act);
  const repairedLevels = levels.filter((meta) => Boolean(progress.levels[meta.slug]));
  const cleanLevels = levels.filter((meta) => cleanRecord(progress.levels[meta.slug]));
  const remainingLevels = levels.filter((meta) => !progress.levels[meta.slug]);
  const total = levels.length;
  const repaired = repairedLevels.length;

  return {
    act,
    deck: deckOf(act),
    total,
    repaired,
    clean: cleanLevels.length,
    remaining: total - repaired,
    complete: total > 0 && repaired === total,
    started: repaired > 0,
    percent: total > 0 ? Math.round((repaired / total) * 100) : 0,
    next: remainingLevels[0] ?? null,
    levels,
    repairedLevels,
    cleanLevels,
    remainingLevels,
  };
}

// ---------------------------------------------------------------------------
// The next repair
// ---------------------------------------------------------------------------

export type NextMission = {
  meta: LevelMeta;
  deck: Deck;
  /** 0-based position in campaign order. */
  index: number;
  previous: LevelMeta | null;
  /** One-line hook for the end-of-mission preview. */
  hook: string;
  /** "MISSION 04 · FIVE SHADOWS" */
  label: string;
};

/**
 * The first unsolved mission in campaign order. This is what the hub should
 * offer as "next repair"; direct links may have solved later missions, but the
 * map still presents the earliest hole. Returns null only when every mission
 * in the supplied registry is repaired.
 */
export function nextMission(
  metas: readonly LevelMeta[],
  progress: Progress,
): NextMission | null {
  const ordered = campaignOrder(metas);
  const index = ordered.findIndex((meta) => !progress.levels[meta.slug]);
  if (index < 0) return null;

  const meta = ordered[index];
  if (!meta) return null;

  return {
    meta,
    deck: deckOf(meta),
    index,
    previous: ordered[index - 1] ?? null,
    hook: missionHook(meta),
    label: `MISSION ${pad2(meta.number)} · ${meta.title.toUpperCase()}`,
  };
}

/**
 * One-line, non-spoiling previews in the ship's voice. A new mission without a
 * hook falls back to its goal, so the preview never invents a fact.
 */
export const MISSION_HOOKS: Readonly<Record<string, string>> = {
  "union-find": "Six compartments. One hull. Nine writes.",
  "binary-search": "Thirty-one tiles. One crack. Five tests.",
  "breadth-first-search": "The seal is four hops out. The chart can prove three.",
  "topological-sort": "Six stages wait on their arcs. Five orders respect all of them.",
  "huffman-coding": "Six frequencies. One downlink. The bill must read 2.25.",
  "coin-change": "Six liters to drain. Two canisters will do it.",
  "merge-sort": "Eight ribbons, three levels, seventeen comparisons.",
  "depth-first-search": "Twelve ticks for six chambers. One edge points back.",
  dijkstra: "The nearest town is not the next one to settle.",
  "minimum-spanning-tree": "Twenty-four spanning grids. Two weigh six.",
  quicksort: "Sixteen keys, already sorted. Do not build the chain.",
  "edit-distance": "Eight mismatches. Two edits. One manifest.",
  "longest-increasing-subsequence": "Six readings. A rising chain of three.",
  "knapsack-0-1": "Ten kilos, three modules, one corner at 58.",
  "stable-matching": "Four applicants, four posts, no blocking pair.",
  "longest-common-subsequence": "Two logs survived. Four letters are shared.",
  "bellman-ford": "One negative road. The fourth round is the certificate.",
  "maximum-flow": "A greedy flow stops at five. The cut is worth seven.",
  "floyd-warshall": "One cell, two arithmetics: distance 2, routes 3.",
  "bipartite-matching": "Three berths. One resignation chain opens the third.",
  "newton-method": "Four firings for twelve digits of √2.",
  "fixed-point-iteration": "Nineteen steps. The step size is still a lie.",
  "karatsuba-multiplication": "Three products for 1234 × 5678.",
  "strassen-matrix-multiplication": "Seven products for a 2×2 block at dimension 2³⁰.",
};

export function missionHook(meta: LevelMeta): string {
  return MISSION_HOOKS[meta.slug] ?? meta.goal;
}

// ---------------------------------------------------------------------------
// Last repair, map states, replay
// ---------------------------------------------------------------------------

export type LastRepair = {
  meta: LevelMeta;
  deck: Deck;
  record: SolvedLevel;
  clean: boolean;
  /** "06 · Six Liters, Two Canisters" */
  label: string;
  /** "4 moves · clean run" */
  detail: string;
};

export function lastRepair(
  metas: readonly LevelMeta[],
  progress: Progress,
): LastRepair | null {
  let found: { meta: LevelMeta; record: SolvedLevel; time: number } | null = null;

  for (const meta of campaignOrder(metas)) {
    const record = progress.levels[meta.slug];
    if (!record) continue;
    const parsed = Date.parse(record.at);
    const time = Number.isFinite(parsed) ? parsed : 0;
    if (
      !found ||
      time > found.time ||
      (time === found.time && meta.number > found.meta.number)
    ) {
      found = { meta, record, time };
    }
  }

  if (!found) return null;
  const clean = cleanRecord(found.record);
  return {
    meta: found.meta,
    deck: deckOf(found.meta),
    record: found.record,
    clean,
    label: `${pad2(found.meta.number)} · ${found.meta.title}`,
    detail: `${found.record.moves} ${plural(found.record.moves, "move")}${clean ? " · clean run" : ""}`,
  };
}

export type MapNodeState = "repaired" | "next" | "open" | "locked";

export type MapNode = {
  meta: LevelMeta;
  deck: Deck;
  state: MapNodeState;
  clean: boolean;
  replayable: boolean;
  /** Screen-reader sentence, e.g. "Mission 04, Five Shadows, ... Next repair." */
  label: string;
};

function mapStateLabel(state: MapNodeState): string {
  if (state === "repaired") return "Repaired";
  if (state === "next") return "Next repair";
  if (state === "open") return "Open";
  return "Sealed";
}

/**
 * The map's honest states. A solved mission stays replayable; the next node is
 * the visual focus; a sealed node names the system that must come first.
 */
export function missionMap(
  metas: readonly LevelMeta[],
  progress: Progress,
): MapNode[] {
  const ordered = campaignOrder(metas);
  const nextSlug = nextMission(ordered, progress)?.meta.slug ?? null;

  return ordered.map((meta, index) => {
    const record = progress.levels[meta.slug];
    const previous = ordered[index - 1] ?? null;
    let state: MapNodeState;

    if (record) {
      state = "repaired";
    } else if (meta.slug === nextSlug) {
      state = "next";
    } else if (previous && progress.levels[previous.slug]) {
      state = "open";
    } else {
      state = "locked";
    }

    const clean = cleanRecord(record);
    const label = `Mission ${pad2(meta.number)}, ${meta.title}, ${meta.algorithm}, ${meta.minutes} minutes. ${mapStateLabel(state)}${clean ? ", clean run" : ""}${
      state === "locked" && previous
        ? `. Repair ${pad2(previous.number)} first`
        : ""
    }.`;

    return {
      meta,
      deck: deckOf(meta),
      state,
      clean,
      replayable: Boolean(record),
      label,
    };
  });
}

export type CleanRunEntry = {
  meta: LevelMeta;
  deck: Deck;
  record: SolvedLevel;
};

export function cleanRunLedger(
  metas: readonly LevelMeta[],
  progress: Progress,
): CleanRunEntry[] {
  return campaignOrder(metas)
    .filter((meta) => cleanRecord(progress.levels[meta.slug]))
    .map((meta) => ({
      meta,
      deck: deckOf(meta),
      record: progress.levels[meta.slug] as SolvedLevel,
    }));
}

export type PersonalBest = {
  stars: number;
  moves: number;
  at: string;
  clean: boolean;
};

export function personalBest(progress: Progress, slug: string): PersonalBest | null {
  const record = progress.levels[slug];
  if (!record) return null;
  return {
    stars: record.stars,
    moves: record.moves,
    at: record.at,
    clean: cleanRecord(record),
  };
}

// ---------------------------------------------------------------------------
// Optional replay constraints (self-imposed, never rewards)
// ---------------------------------------------------------------------------

export type OptionalConstraintId = "clean-run" | "no-hints" | "no-undo" | "under-best";

export type OptionalConstraint = {
  id: OptionalConstraintId;
  label: string;
  description: string;
};

/**
 * Replay modifiers only. They are not badges, not persisted, and never counted
 * on the hub. The mission's own end card may report which ones a run met.
 */
export const OPTIONAL_CONSTRAINTS: readonly OptionalConstraint[] = [
  {
    id: "clean-run",
    label: "CLEAN RUN",
    description: "Finish at the mission's clean-run rating.",
  },
  {
    id: "no-hints",
    label: "NO HINTS",
    description: "Reveal nothing.",
  },
  {
    id: "no-undo",
    label: "NO UNDO",
    description: "Undo no accepted move.",
  },
  {
    id: "under-best",
    label: "UNDER BEST",
    description: "Finish below your previous move count.",
  },
];

export type RunFacts = {
  stars: number;
  moves: number;
  hints?: number;
  undos?: number;
  previousBestMoves?: number | null;
};

export type OptionalConstraintResult = {
  id: OptionalConstraintId;
  label: string;
  met: boolean;
  available: boolean;
};

export function optionalConstraintsMet(run: RunFacts): OptionalConstraintResult[] {
  return OPTIONAL_CONSTRAINTS.map((constraint) => {
    if (constraint.id === "clean-run") {
      return { id: constraint.id, label: constraint.label, met: run.stars >= 3, available: true };
    }
    if (constraint.id === "no-hints") {
      return {
        id: constraint.id,
        label: constraint.label,
        met: run.hints === 0,
        available: run.hints != null,
      };
    }
    if (constraint.id === "no-undo") {
      return {
        id: constraint.id,
        label: constraint.label,
        met: run.undos === 0,
        available: run.undos != null,
      };
    }
    return {
      id: constraint.id,
      label: constraint.label,
      met: run.previousBestMoves != null && run.moves < run.previousBestMoves,
      available: run.previousBestMoves != null,
    };
  });
}

// ---------------------------------------------------------------------------
// Ship's log fragments
// ---------------------------------------------------------------------------

/**
 * Structural adapter for `lore.ts`. Progression never imports lore content, so
 * the narrative can land after the logic without a build dependency. An entry
 * unlocks when its mission is repaired; an ending entry unlocks only when the
 * whole campaign is complete. `unlocksAt` is a mission number and is used when
 * the lore file identifies fragments by number rather than slug.
 */
export type LoreEntry = {
  id: string;
  kind?: "fragment" | "interlude" | "ending";
  mission?: string;
  unlocksAt?: number;
  /** Act interludes: the deck the entry belongs to. */
  act?: Act;
  /** Act interludes: `intro` opens the deck; `outro` closes it. */
  phase?: "intro" | "outro";
  title?: string;
};

export type FragmentEntry = {
  id: string;
  kind: "fragment" | "interlude" | "ending";
  mission: string | null;
  number: number | null;
  title: string | null;
  act: Act | null;
  phase: "intro" | "outro" | null;
  unlocked: boolean;
};

export type LoreText = { title?: string };
export type ActLoreText = { intro?: LoreText; outro?: LoreText };

/** Adapter for a lore file shaped like `lore.ts` (fragments, act pairs, ending). */
export function loreEntriesFromLore(
  fragments: Readonly<Record<string, LoreText>>,
  actLore?: Readonly<Partial<Record<Act, ActLoreText>>>,
  ending?: LoreText | null,
  metas?: readonly LevelMeta[],
): LoreEntry[] {
  const fragmentEntries: LoreEntry[] = Object.entries(fragments).map(([mission, text]) => ({
    id: `fragment:${mission}`,
    kind: "fragment",
    mission,
    title: text.title,
  }));

  const entries: LoreEntry[] = [];
  const pushAct = (act: Act, phase: "intro" | "outro", text?: LoreText) => {
    if (!text) return;
    entries.push({
      id: `act:${act}:${phase}`,
      kind: "interlude",
      act,
      phase,
      title: text.title,
    });
  };

  if (metas && metas.length > 0) {
    const ordered = campaignOrder(metas);
    const byMission = new Map(
      fragmentEntries.map((entry) => [entry.mission ?? "", entry] as const),
    );
    const used = new Set<string>();
    for (const act of [1, 2, 3] as const) {
      const pair = actLore?.[act];
      pushAct(act, "intro", pair?.intro);
      for (const meta of ordered.filter((entry) => entry.act === act)) {
        const fragment = byMission.get(meta.slug);
        if (!fragment) continue;
        entries.push(fragment);
        used.add(meta.slug);
      }
      pushAct(act, "outro", pair?.outro);
    }
    for (const fragment of fragmentEntries) {
      if (!used.has(fragment.mission ?? "")) entries.push(fragment);
    }
  } else {
    entries.push(...fragmentEntries);
    for (const act of [1, 2, 3] as const) {
      const pair = actLore?.[act];
      pushAct(act, "intro", pair?.intro);
      pushAct(act, "outro", pair?.outro);
    }
  }

  if (ending) entries.push({ id: "ending", kind: "ending", title: ending.title });
  return entries;
}

export type FragmentProgress = {
  /** Fragment entries only; interludes and the ending are separate log entries. */
  total: number;
  unlocked: number;
  remaining: number;
  endingUnlocked: boolean;
  ending: FragmentEntry | null;
  nextSlug: string | null;
  nextNumber: number | null;
  entries: FragmentEntry[];
};

function defaultLore(metas: readonly LevelMeta[]): LoreEntry[] {
  return metas.map((meta) => ({
    id: meta.slug,
    kind: "fragment",
    mission: meta.slug,
    unlocksAt: meta.number,
    title: meta.title,
  }));
}

/**
 * The ship's log. With no lore argument, each mission contributes exactly one
 * fragment, which keeps the hub honest while the narrative file is in flight.
 */
export function logProgress(
  metas: readonly LevelMeta[],
  progress: Progress,
  lore?: readonly LoreEntry[],
): FragmentProgress {
  const ordered = campaignOrder(metas);
  const complete = ordered.length > 0 && ordered.every((meta) => Boolean(progress.levels[meta.slug]));
  const byNumber = new Map(ordered.map((meta) => [meta.number, meta] as const));

  const provided = lore ?? [];
  const hasLoreFragments = provided.some(
    (entry) => (entry.kind ?? "fragment") === "fragment",
  );
  // Interludes and the ending are log entries, not fragments. If the lore file
  // supplies no fragments at all, fall back to one per mission so the count
  // remains honest rather than reading 0 / 0.
  const rawSource = hasLoreFragments
    ? [...provided]
    : [...defaultLore(ordered), ...provided];

  // A partial registry must not advertise fragments for uninstalled missions or
  // decks. The full build sees all 24; a pilot build sees only what exists.
  const knownSlugs = new Set(ordered.map((meta) => meta.slug));
  const knownActs = new Set(ordered.map((meta) => meta.act));
  const source = rawSource.filter((entry) => {
    const kind = entry.kind ?? "fragment";
    if (kind === "ending") return true;
    if (entry.phase != null && entry.act != null) {
      return knownActs.has(entry.act);
    }
    const mission =
      entry.mission ??
      (entry.unlocksAt != null ? byNumber.get(entry.unlocksAt)?.slug : undefined);
    if (mission == null) return kind === "interlude";
    return knownSlugs.has(mission);
  });

  const entries: FragmentEntry[] = source.map((entry) => {
    const kind = entry.kind ?? "fragment";
    const missionMeta = entry.mission
      ? ordered.find((meta) => meta.slug === entry.mission) ?? null
      : entry.unlocksAt != null
        ? byNumber.get(entry.unlocksAt) ?? null
        : null;
    const mission = entry.mission ?? missionMeta?.slug ?? null;

    let unlocked: boolean;
    if (kind === "ending") {
      unlocked = complete;
    } else if (entry.phase != null && entry.act != null) {
      if (entry.phase === "intro") {
        // Deck 1's introduction is available from the first screen; later
        // introductions open when the preceding deck is complete.
        unlocked =
          entry.act === 1 ||
          isActComplete(ordered, progress, (entry.act - 1) as Act);
      } else {
        unlocked = isActComplete(ordered, progress, entry.act);
      }
    } else {
      unlocked = mission != null ? Boolean(progress.levels[mission]) : false;
    }

    return {
      id: entry.id,
      kind,
      mission,
      number: entry.unlocksAt ?? missionMeta?.number ?? null,
      title: entry.title ?? missionMeta?.title ?? null,
      act: entry.act ?? missionMeta?.act ?? null,
      phase: entry.phase ?? null,
      unlocked,
    };
  });

  const ending = entries.find((entry) => entry.kind === "ending") ?? null;
  const fragmentEntries = entries.filter((entry) => entry.kind === "fragment");
  const unlocked = fragmentEntries.filter((entry) => entry.unlocked).length;
  const nextFragment = fragmentEntries.find((entry) => !entry.unlocked && entry.mission);
  const nextMeta =
    (nextFragment?.mission
      ? ordered.find((meta) => meta.slug === nextFragment.mission)
      : undefined) ?? ordered.find((meta) => !progress.levels[meta.slug]);

  return {
    total: fragmentEntries.length,
    unlocked,
    remaining: fragmentEntries.length - unlocked,
    endingUnlocked: complete,
    ending,
    nextSlug: nextMeta?.slug ?? null,
    nextNumber: nextFragment?.number ?? nextMeta?.number ?? null,
    entries,
  };
}

// ---------------------------------------------------------------------------
// Act transitions
// ---------------------------------------------------------------------------

export type ActTransition = {
  /** True only for decks 1 and 2, when every system on the deck is online. */
  due: boolean;
  act: Act;
  deck: Deck;
  completed: ActProgress;
  nextDeck: Deck | null;
  kicker: string;
  title: string;
  body: string;
  nextLine: string | null;
  primaryLabel: string;
  pauseLabel: string;
};

/**
 * A deck-boundary moment for the win card. Deck 3 does not use this: its last
 * repair hands over to the ending, not to another deck.
 */
export function actTransition(
  metas: readonly LevelMeta[],
  progress: Progress,
  act: Act,
): ActTransition {
  const completed = actProgress(metas, progress, act);
  const nextAct = (act + 1) as Act;
  const hasNext = act < 3 && ACTS.some((entry) => entry.act === nextAct);
  const nextDeck = hasNext ? deckOf(nextAct) : null;
  const due = completed.complete && nextDeck != null;

  const title =
    act === 1 ? "THE HULL HOLDS." : act === 2 ? "THE SHIP IS HOLDING." : "THE SHIP LANDS.";
  const body =
    act === 1
      ? "The deck is sealed. The failures ahead are not missing parts; they are missing rules."
      : act === 2
        ? "The deck is sealed. What remains will not fail politely; it will argue."
        : "The last deck is sealed. The ship is holding.";

  return {
    due,
    act,
    deck: completed.deck,
    completed,
    nextDeck,
    kicker: `DECK ${pad2(completed.act)} CLOSED · ${pad2(completed.repaired)} / ${pad2(completed.total)}`,
    title,
    body,
    nextLine: nextDeck ? `${nextDeck.label} — ${nextDeck.promise}` : null,
    primaryLabel: nextDeck ? "STEP THROUGH" : "READ THE ENDING",
    pauseLabel: "PAUSE HERE",
  };
}

// ---------------------------------------------------------------------------
// Ending and resume
// ---------------------------------------------------------------------------

export type EndingSummary = {
  unlocked: boolean;
  systemsRepaired: number;
  totalSystems: number;
  cleanRuns: number;
  fragments: FragmentProgress;
  decks: ActProgress[];
  decksCleared: number;
  lastRepair: LastRepair | null;
  landing: {
    state: "approach" | "landed";
    kicker: string;
    title: string;
    line: string;
    note: string | null;
  };
  reason: string | null;
};

/**
 * The finale is data, not a route. The hub renders it when every mission in the
 * full installed campaign is repaired; the final repair unlocks it. The helper is
 * registry-relative so integration builds do not crash, but the hub must not show
 * this from a partial registry. Clean runs stay optional.
 */
export function endingSummary(
  metas: readonly LevelMeta[],
  progress: Progress,
  options: { lore?: readonly LoreEntry[] } = {},
): EndingSummary {
  const ordered = campaignOrder(metas);
  const totalSystems = ordered.length;
  const systemsRepaired = repairedCount(ordered, progress);
  const complete = totalSystems > 0 && systemsRepaired === totalSystems;
  const fragments = logProgress(ordered, progress, options.lore);
  const decks = ACTS.map((entry) => actProgress(ordered, progress, entry.act));

  return {
    unlocked: complete,
    systemsRepaired,
    totalSystems,
    cleanRuns: cleanRuns(ordered, progress),
    fragments,
    decks,
    decksCleared: decks.filter((deck) => deck.complete).length,
    lastRepair: lastRepair(ordered, progress),
    landing: complete
      ? {
          state: "landed",
          kicker: "FINAL APPROACH · CV CHAITRA",
          title: "THE SHIP LANDS.",
          line: `${totalSystems === 24 ? "Twenty-four" : String(totalSystems)} systems. One hull. The log is whole.`,
          note: "Clean runs remain open. They change the record, not the ending.",
        }
      : {
          state: "approach",
          kicker: "FINAL APPROACH · CV CHAITRA",
          title: "FINAL APPROACH.",
          line: `${totalSystems - systemsRepaired} ${plural(totalSystems - systemsRepaired, "system")} remain${totalSystems - systemsRepaired === 1 ? "s" : ""}. The log is incomplete.`,
          note: null,
        },
    reason: complete ? "The mathematics was the manual. The log was the reason." : null,
  };
}

export type ResumeSummary = {
  returning: boolean;
  complete: boolean;
  next: NextMission | null;
  lastRepair: LastRepair | null;
  repaired: number;
  total: number;
  cleanRuns: number;
  fragments: FragmentProgress;
  decks: ActProgress[];
  currentDeck: Deck;
  ending: EndingSummary;
  headline: "BEGIN REPAIR" | "NEXT REPAIR" | "THE SHIP LANDS.";
};

/**
 * Everything the hub needs on load. There is no "welcome back" state and no
 * daily gate: a returning player sees the next repair, the log count, and the
 * last repair; a new player sees the first repair.
 */
export function resumeSummary(
  metas: readonly LevelMeta[],
  progress: Progress,
  options: { lore?: readonly LoreEntry[] } = {},
): ResumeSummary {
  const ordered = campaignOrder(metas);
  const ending = endingSummary(ordered, progress, options);
  const next = nextMission(ordered, progress);
  const last = ending.lastRepair;

  return {
    returning: ending.systemsRepaired > 0,
    complete: ending.unlocked,
    next,
    lastRepair: last,
    repaired: ending.systemsRepaired,
    total: ending.totalSystems,
    cleanRuns: ending.cleanRuns,
    fragments: ending.fragments,
    decks: ending.decks,
    currentDeck: next?.deck ?? last?.deck ?? deckOf(1),
    ending,
    headline: ending.unlocked
      ? "THE SHIP LANDS."
      : ending.systemsRepaired > 0
        ? "NEXT REPAIR"
        : "BEGIN REPAIR",
  };
}

// ---------------------------------------------------------------------------
// Session summary (per-tab, versioned, soft-failing)
// ---------------------------------------------------------------------------

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type SessionRepair = {
  slug: string;
  number: number;
  title: string;
  act: Act;
  stars: number;
  moves: number;
  at: string;
};

export type SessionCheckpointState = {
  /** Repairs already acknowledged at a checkpoint or act boundary. */
  seenAt: number;
  at: string | null;
};

export type SessionSummary = {
  version: 1;
  startedAt: string;
  updatedAt: string;
  /** Unique systems repaired in this tab, in first-repair order. */
  repairs: SessionRepair[];
  lastRepairSlug: string | null;
  checkpoint: SessionCheckpointState;
};

function browserSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isoNow(now?: Date): string {
  const value = now ?? new Date();
  return Number.isFinite(value.getTime()) ? value.toISOString() : new Date().toISOString();
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function clampStars(value: number): number {
  return Math.max(1, Math.min(3, Math.round(value)));
}

function isActValue(value: unknown): value is Act {
  return value === 1 || value === 2 || value === 3;
}

function isSessionRepair(value: unknown): value is SessionRepair {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.slug === "string" &&
    typeof v.number === "number" &&
    Number.isFinite(v.number) &&
    typeof v.title === "string" &&
    isActValue(v.act) &&
    typeof v.stars === "number" &&
    Number.isFinite(v.stars) &&
    typeof v.moves === "number" &&
    Number.isFinite(v.moves) &&
    validIso(v.at)
  );
}

export function emptySessionSummary(now?: Date): SessionSummary {
  const at = isoNow(now);
  return {
    version: SESSION_VERSION,
    startedAt: at,
    updatedAt: at,
    repairs: [],
    lastRepairSlug: null,
    checkpoint: { seenAt: 0, at: null },
  };
}

function normalizeSessionRepairs(value: unknown): SessionRepair[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const repairs: SessionRepair[] = [];
  for (const item of value) {
    if (!isSessionRepair(item) || seen.has(item.slug)) continue;
    seen.add(item.slug);
    repairs.push({
      slug: item.slug,
      number: Math.round(item.number),
      title: item.title,
      act: item.act,
      stars: clampStars(item.stars),
      moves: Math.max(0, Math.round(item.moves)),
      at: item.at,
    });
    if (repairs.length >= SESSION_REPAIR_LIMIT) break;
  }
  return repairs;
}

/**
 * Read the current tab's session summary. Corrupt or old-version data resets to
 * an empty summary rather than crashing; a disabled sessionStorage still lets
 * the caller use the returned in-memory value for this render.
 */
export function loadSessionSummary(storage?: StorageLike | null): SessionSummary {
  const store = storage === undefined ? browserSessionStorage() : storage;
  if (!store) return emptySessionSummary();

  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return emptySessionSummary();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptySessionSummary();
    const p = parsed as Record<string, unknown>;
    if (p.version !== SESSION_VERSION) return emptySessionSummary();

    const repairs = normalizeSessionRepairs(p.repairs);
    const now = isoNow();
    const startedAt = validIso(p.startedAt) ? p.startedAt : now;
    const updatedAt = validIso(p.updatedAt) ? p.updatedAt : startedAt;
    const checkpointRaw =
      typeof p.checkpoint === "object" && p.checkpoint !== null
        ? (p.checkpoint as Record<string, unknown>)
        : {};
    const seenAtRaw =
      typeof checkpointRaw.seenAt === "number" && Number.isFinite(checkpointRaw.seenAt)
        ? Math.round(checkpointRaw.seenAt)
        : 0;
    const checkpointAt = validIso(checkpointRaw.at) ? checkpointRaw.at : null;
    const lastSlug =
      typeof p.lastRepairSlug === "string" &&
      repairs.some((repair) => repair.slug === p.lastRepairSlug)
        ? p.lastRepairSlug
        : repairs[repairs.length - 1]?.slug ?? null;

    return {
      version: SESSION_VERSION,
      startedAt,
      updatedAt,
      repairs,
      lastRepairSlug: lastSlug,
      checkpoint: {
        seenAt: Math.max(0, Math.min(seenAtRaw, repairs.length)),
        at: checkpointAt,
      },
    };
  } catch {
    return emptySessionSummary();
  }
}

export function writeSessionSummary(
  summary: SessionSummary,
  storage?: StorageLike | null,
): { ok: boolean; reason?: "unavailable" | "quota" } {
  const store = storage === undefined ? browserSessionStorage() : storage;
  if (!store) return { ok: false, reason: "unavailable" };
  try {
    store.setItem(SESSION_KEY, JSON.stringify(summary));
    return { ok: true };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

/**
 * Pure reducer: record a solved mission in this tab. A replay updates the
 * existing entry's best marks and moves but does not inflate the repair count,
 * so the checkpoint cadence cannot be gamed by replaying the same system.
 */
export function applyRepairToSession(
  summary: SessionSummary,
  meta: Pick<LevelMeta, "slug" | "number" | "title" | "act">,
  result: { stars: number; moves: number; at?: string },
): SessionSummary {
  const at = validIso(result.at) ? result.at : isoNow();
  const stars = clampStars(result.stars);
  const moves = Math.max(0, Math.round(result.moves));
  const existingIndex = summary.repairs.findIndex((repair) => repair.slug === meta.slug);
  const repaired: SessionRepair = {
    slug: meta.slug,
    number: meta.number,
    title: meta.title,
    act: meta.act,
    stars,
    moves,
    at,
  };

  const repairs =
    existingIndex >= 0
      ? summary.repairs.map((repair, index) => {
          if (index !== existingIndex) return repair;
          return {
            ...repair,
            stars: Math.max(repair.stars, stars),
            moves: Math.min(repair.moves, moves),
            at,
          };
        })
      : [...summary.repairs, repaired];

  return {
    ...summary,
    updatedAt: at,
    repairs,
    lastRepairSlug: meta.slug,
    checkpoint: {
      ...summary.checkpoint,
      seenAt: Math.min(summary.checkpoint.seenAt, repairs.length),
    },
  };
}

/** Pure pause-state helpers. */
export function repairsSinceCheckpoint(summary: SessionSummary): number {
  return Math.max(0, summary.repairs.length - summary.checkpoint.seenAt);
}

export function acknowledgeCheckpoint(
  summary: SessionSummary,
  at?: string,
): SessionSummary {
  const stamp = validIso(at) ? at : isoNow();
  return {
    ...summary,
    updatedAt: stamp,
    checkpoint: {
      seenAt: Math.max(summary.checkpoint.seenAt, summary.repairs.length),
      at: stamp,
    },
  };
}

export type SessionCheckpoint = {
  due: boolean;
  /** Unique systems repaired this tab. */
  count: number;
  /** How many repairs are in the card's batch. */
  batchCount: number;
  sinceCheckpoint: number;
  repairs: SessionRepair[];
  clean: number;
  lastRepair: SessionRepair | null;
  next: NextMission | null;
  kicker: string;
  title: string;
  body: string;
  pauseLabel: string;
  continueLabel: string;
};

const COUNT_WORDS = [
  "NO",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
  "TWENTY",
  "TWENTY-ONE",
  "TWENTY-TWO",
  "TWENTY-THREE",
  "TWENTY-FOUR",
];

function countWord(value: number): string {
  return COUNT_WORDS[value] ?? String(value);
}

/**
 * The quiet checkpoint after a batch of repairs. It is a real exit: `due` is
 * false after the campaign, after every known system is repaired, and until the
 * cadence is reached. It never says "do not lose progress" or "come back".
 */
export function sessionCheckpoint(
  summary: SessionSummary,
  metas: readonly LevelMeta[],
  progress: Progress,
  cadence = CHECKPOINT_CADENCE,
): SessionCheckpoint {
  const step = Math.max(1, Math.floor(cadence));
  const next = nextMission(metas, progress);
  const complete = isCampaignComplete(metas, progress);
  const sinceCheckpoint = repairsSinceCheckpoint(summary);
  const batch = summary.repairs.slice(summary.checkpoint.seenAt);
  const repairs =
    batch.length > 0
      ? batch
      : summary.repairs.slice(-Math.max(1, Math.min(step, summary.repairs.length)));
  const count = repairs.length;
  const clean = repairs.filter((repair) => repair.stars >= 3).length;
  const lastRepair =
    summary.repairs.find((repair) => repair.slug === summary.lastRepairSlug) ??
    repairs[repairs.length - 1] ??
    null;
  const due =
    Boolean(next) &&
    !complete &&
    summary.repairs.length > 0 &&
    sinceCheckpoint >= step;
  const more = summary.checkpoint.seenAt > 0;
  const noun = count === 1 ? "SYSTEM" : "SYSTEMS";
  const title =
    count === 0
      ? "SYSTEMS ONLINE."
      : `${countWord(count)} ${more ? "MORE " : ""}${noun} ONLINE.`;

  return {
    due,
    count: summary.repairs.length,
    batchCount: count,
    sinceCheckpoint,
    repairs,
    clean,
    lastRepair,
    next,
    kicker: "SESSION CHECKPOINT",
    title,
    body: "A quiet place to stop. The next repair will wait.",
    pauseLabel: "PAUSE HERE",
    continueLabel: next ? "NEXT REPAIR" : "MISSION MAP",
  };
}

/** Storage-backed session API. All writes fail soft. */
export function recordSessionRepair(
  meta: Pick<LevelMeta, "slug" | "number" | "title" | "act">,
  result: { stars: number; moves: number; at?: string },
  storage?: StorageLike | null,
): { summary: SessionSummary; ok: boolean; reason?: "unavailable" | "quota" } {
  const summary = applyRepairToSession(loadSessionSummary(storage), meta, result);
  const written = writeSessionSummary(summary, storage);
  return { summary, ...written };
}

export function saveCheckpointAcknowledged(
  summary: SessionSummary,
  storage?: StorageLike | null,
): { summary: SessionSummary; ok: boolean; reason?: "unavailable" | "quota" } {
  const next = acknowledgeCheckpoint(summary);
  const written = writeSessionSummary(next, storage);
  return { summary: next, ...written };
}

export function resetSessionSummary(
  storage?: StorageLike | null,
): SessionSummary {
  const store = storage === undefined ? browserSessionStorage() : storage;
  if (store) {
    try {
      store.removeItem(SESSION_KEY);
    } catch {
      /* storage disabled; the returned summary is still empty */
    }
  }
  return emptySessionSummary();
}
