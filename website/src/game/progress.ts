/**
 * Campaign progress lives in this browser only. Nothing is sent anywhere.
 * The key mirrors the Drishti storage convention; a version field lets a
 * later migration drop incompatible data rather than crash on it.
 */

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
