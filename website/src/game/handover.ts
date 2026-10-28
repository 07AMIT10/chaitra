import type { Move, Status } from "./types";

export const HANDOVER_KEY = "chaitra_algorithms_game_handover_v1";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Returns true if the user has already seen the handover for this board view grammar.
 * Fails closed (returns false) if storage is unavailable, corrupt, or unparseable.
 */
export function handoverSeen(storage?: StorageLike | null, viewKind?: string): boolean {
  if (!viewKind) return false;
  const store = storage === undefined ? defaultStorage() : storage;
  if (!store) return false;
  try {
    const raw = store.getItem(HANDOVER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.includes(viewKind);
  } catch {
    return false;
  }
}

/**
 * Marks the board view grammar as seen in storage.
 * Gracefully ignores quota or permission errors.
 */
export function markHandoverSeen(storage?: StorageLike | null, viewKind?: string): void {
  if (!viewKind) return;
  const store = storage === undefined ? defaultStorage() : storage;
  if (!store) return;
  try {
    let list: string[] = [];
    const raw = store.getItem(HANDOVER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        list = [];
      }
    }
    if (!list.includes(viewKind)) {
      list.push(viewKind);
    }
    store.setItem(HANDOVER_KEY, JSON.stringify(list));
  } catch {
    // Storage disabled or quota exceeded
  }
}

/**
 * Returns the first legal (non-disabled) move from `level.moves(session.state)`,
 * or null if no legal move is available.
 */
export function chooseHandoverMove(
  level: { moves: (state: any) => Move[] },
  session: { state: any },
): Move | null {
  try {
    const moves = level.moves(session.state);
    return moves.find((move) => !move.disabled) ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true ONLY when the session is currently playing, no moves have been made yet,
 * and the handover has not yet been seen for this grammar.
 */
export function shouldHandover(params: {
  moveCount: number;
  seen: boolean;
  status: Status;
}): boolean {
  return params.status === "playing" && params.moveCount === 0 && !params.seen;
}
