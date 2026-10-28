/**
 * Campaign progress lives in this browser only. Nothing is sent anywhere.
 * The key mirrors the Drishti storage convention; a version field lets a
 * later migration drop incompatible data rather than crash on it.
 */

import { SESSION_SNAPSHOT_VERSION, type SessionSnapshot } from "./engine";

export const PROGRESS_KEY = "chaitra_algorithms_game";

export type SolvedLevel = {
  stars: number;
  moves: number;
  at: string;
};

export type Progress = {
  version: 1;
  levels: Record<string, SolvedLevel>;
};

export const EMPTY_PROGRESS: Progress = { version: 1, levels: {} };

/** Keys that would mutate a prototype when assigned to a plain object. */
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function emptyProgress(): Progress {
  return { version: 1, levels: {} };
}

function isSolvedLevel(value: unknown): value is SolvedLevel {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.stars === "number" &&
    Number.isInteger(v.stars) &&
    v.stars >= 1 &&
    v.stars <= 3 &&
    typeof v.moves === "number" &&
    Number.isInteger(v.moves) &&
    v.moves >= 0 &&
    typeof v.at === "string"
  );
}

function cleanLevel(value: SolvedLevel): SolvedLevel {
  return { stars: value.stars, moves: value.moves, at: value.at };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyProgress();
    const p = parsed as Record<string, unknown>;
    if (
      p.version !== 1 ||
      typeof p.levels !== "object" ||
      p.levels === null ||
      Array.isArray(p.levels)
    ) {
      return emptyProgress();
    }
    const levels: Record<string, SolvedLevel> = {};
    for (const [slug, value] of Object.entries(p.levels as Record<string, unknown>)) {
      if (UNSAFE_KEYS.has(slug)) continue;
      if (isSolvedLevel(value)) levels[slug] = cleanLevel(value);
    }
    return { version: 1, levels };
  } catch {
    return emptyProgress();
  }
}

export function saveSolved(
  slug: string,
  stars: number,
  moves: number,
): { progress: Progress; ok: boolean; reason?: "disabled" | "quota" } {
  const progress = loadProgress();
  const candidate = progress.levels[slug];
  const previous = isSolvedLevel(candidate) ? candidate : undefined;
  const numericStars = Number(stars);
  const cleanStars = Number.isNaN(numericStars)
    ? 1
    : Math.max(1, Math.min(3, Math.round(numericStars)));
  const cleanMoves = Number.isFinite(moves) ? Math.max(0, Math.round(moves)) : 0;
  const bestStars = Math.max(previous?.stars ?? 0, cleanStars);
  const bestMoves = previous ? Math.min(previous.moves, cleanMoves) : cleanMoves;
  const next: Progress = {
    version: 1,
    levels: {
      ...progress.levels,
      [slug]: {
        stars: bestStars,
        moves: bestMoves,
        at: new Date().toISOString(),
      },
    },
  };

  if (typeof window === "undefined") return { progress: next, ok: false, reason: "disabled" };
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    return { progress: next, ok: true };
  } catch {
    return { progress: next, ok: false, reason: "quota" };
  }
}

export function resetProgress(): Progress {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* storage disabled; the in-memory state still resets */
    }
  }
  return emptyProgress();
}

export function solvedCount(progress: Progress): number {
  return Object.entries(progress.levels).filter(
    ([slug, level]) => !UNSAFE_KEYS.has(slug) && isSolvedLevel(level),
  ).length;
}

export function starCount(progress: Progress): number {
  return Object.values(progress.levels).reduce(
    (sum, level) => sum + (isSolvedLevel(level) ? level.stars : 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Mid-level resume (per-tab, per-level, versioned)
// ---------------------------------------------------------------------------

/**
 * A playing board is a session concern, not durable campaign progress: it
 * lives in sessionStorage under one key per level, separate from the solved
 * registry and from the session-summary/checkpoint key. Only a started,
 * still-playing snapshot is resumable; won, lost, and fresh boards are not.
 */
export const RESUME_KEY_PREFIX = "chaitra_algorithms_game_resume:";
/**
 * The resume envelope tracks the engine's snapshot schema directly, so a
 * schema bump cannot leave a "version 1" envelope wrapping an incompatible
 * board. `progress` imports the value only; `engine` never imports `progress`,
 * so there is no cycle.
 */
export const RESUME_VERSION = SESSION_SNAPSHOT_VERSION;

export type ResumeStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type ResumeEnvelope = {
  version: typeof SESSION_SNAPSHOT_VERSION;
  slug: string;
  at: string;
  snapshot: SessionSnapshot;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatusValue(value: unknown): boolean {
  return value === "playing" || value === "won" || value === "lost";
}

function isEventValue(value: unknown): boolean {
  if (!isPlainObject(value) || typeof value.text !== "string") return false;
  return (
    value.kind === undefined ||
    value.kind === "info" ||
    value.kind === "good" ||
    value.kind === "bad"
  );
}

/** One undo snapshot, complete enough that `undo` cannot rebuild a bad board. */
function isHistoryEntry(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (!isPlainObject(value.state)) return false;
  if (
    typeof value.logLength !== "number" ||
    !Number.isInteger(value.logLength) ||
    value.logLength < 0
  ) {
    return false;
  }
  if (!isStatusValue(value.status)) return false;
  if (!Array.isArray(value.log) || !value.log.every(isEventValue)) return false;
  return value.log.length === value.logLength;
}

/**
 * Structural gate for a stored board. A schema change that still looks like a
 * snapshot is caught later by the shell's trial `view()`; everything a state
 * machine could trip over before that must be rejected here.
 */
function isStoredSnapshot(value: unknown, slug: string): value is SessionSnapshot {
  if (!isPlainObject(value)) return false;
  if (value.version !== SESSION_SNAPSHOT_VERSION) return false;
  if (typeof value.slug !== "string" || value.slug !== slug) return false;
  if (value.status !== "playing") return false;
  if (
    typeof value.moves !== "number" ||
    !Number.isInteger(value.moves) ||
    value.moves <= 0
  ) {
    return false;
  }
  if (
    typeof value.hints !== "number" ||
    !Number.isInteger(value.hints) ||
    value.hints < 0
  ) {
    return false;
  }
  if (!isPlainObject(value.state)) return false;
  if (!Array.isArray(value.history) || value.history.length !== value.moves) return false;
  if (!value.history.every(isHistoryEntry)) return false;
  if (!Array.isArray(value.log) || !value.log.every(isEventValue)) return false;
  return true;
}

export function resumeKey(slug: string): string {
  return `${RESUME_KEY_PREFIX}${slug}`;
}

function browserResumeStore(): ResumeStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** A started board is worth resuming; a terminal or untouched board is not. */
export function isResumable(
  snapshot: SessionSnapshot | null | undefined,
): snapshot is SessionSnapshot {
  return Boolean(snapshot && isStoredSnapshot(snapshot, snapshot.slug));
}

/** Wrap a snapshot, or return null when it must not be saved at all. */
export function makeResumeEnvelope(
  slug: string,
  snapshot: SessionSnapshot,
  at: Date = new Date(),
): ResumeEnvelope | null {
  if (!isResumable(snapshot) || snapshot.slug !== slug) return null;
  const stamp = Number.isFinite(at.getTime()) ? at.toISOString() : new Date().toISOString();
  return { version: RESUME_VERSION, slug, at: stamp, snapshot };
}

/**
 * Parse one stored envelope. Corrupt JSON, a different version or slug, an
 * incompatible snapshot schema, and a terminal snapshot all fail closed. The
 * shell still trial-renders the restored board once (`view`/`moves`) before it
 * hands the state to React, because only the level knows its own schema.
 */
export function parseResumeEnvelope(
  raw: string | null,
  slug: string,
): ResumeEnvelope | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    const p = parsed;
    if (p.version !== SESSION_SNAPSHOT_VERSION || p.slug !== slug) return null;
    if (typeof p.at !== "string" || !Number.isFinite(Date.parse(p.at))) return null;
    if (!isStoredSnapshot(p.snapshot, slug)) return null;
    return {
      version: RESUME_VERSION,
      slug,
      at: p.at,
      snapshot: p.snapshot,
    };
  } catch {
    return null;
  }
}

export function loadResume(
  slug: string,
  storage?: ResumeStore | null,
): ResumeEnvelope | null {
  const store = storage === undefined ? browserResumeStore() : storage;
  if (!store) return null;
  try {
    return parseResumeEnvelope(store.getItem(resumeKey(slug)), slug);
  } catch {
    return null;
  }
}

export function saveResume(
  slug: string,
  snapshot: SessionSnapshot,
  storage?: ResumeStore | null,
  at?: Date,
): boolean {
  const envelope = makeResumeEnvelope(slug, snapshot, at);
  if (!envelope) return false;
  const store = storage === undefined ? browserResumeStore() : storage;
  if (!store) return false;
  try {
    store.setItem(resumeKey(slug), JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function clearResume(slug: string, storage?: ResumeStore | null): void {
  const store = storage === undefined ? browserResumeStore() : storage;
  if (!store) return;
  try {
    store.removeItem(resumeKey(slug));
  } catch {
    /* storage disabled; the stale snapshot simply will not be read */
  }
}
