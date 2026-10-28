import type { GameEvent, LevelModule, Status } from "./types";

export type Snapshot = {
  state: any;
  logLength: number;
  status: Status;
  /** The exact log before the move; logLength alone cannot rebuild a capped log. */
  log?: GameEvent[];
};

export type Session = {
  state: any;
  history: Snapshot[];
  log: GameEvent[];
  status: Status;
  moves: number;
  hints: number;
};

export type PlayResult = { session: Session; error?: string };

export const SESSION_SNAPSHOT_VERSION = 1;

/**
 * A JSON-safe copy of a session that can be written to storage and restored
 * without the UI. `slug` and the version make stale or cross-level snapshots
 * fail closed instead of resuming the wrong puzzle.
 */
export type SessionSnapshot = {
  version: 1;
  slug: string;
  state: any;
  history: Snapshot[];
  log: GameEvent[];
  status: Status;
  moves: number;
  hints: number;
};

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function isStatus(value: unknown): value is Status {
  return value === "playing" || value === "won" || value === "lost";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!isObject(value)) return false;
  if (
    !isObject(value.state) ||
    typeof value.logLength !== "number" ||
    !Number.isInteger(value.logLength) ||
    value.logLength < 0 ||
    !isStatus(value.status)
  ) {
    return false;
  }
  if (value.log === undefined) return true;
  return (
    Array.isArray(value.log) &&
    value.log.every(isEvent) &&
    value.log.length === value.logLength
  );
}

function isEvent(value: unknown): value is GameEvent {
  if (!isObject(value) || typeof value.text !== "string") return false;
  return (
    value.kind === undefined ||
    value.kind === "info" ||
    value.kind === "good" ||
    value.kind === "bad"
  );
}

export function start(level: LevelModule<any>): Session {
  const state = clone(level.initial);
  return {
    state,
    history: [],
    log: [],
    status: level.status(state),
    moves: 0,
    hints: 0,
  };
}

export function play(level: LevelModule<any>, session: Session, moveId: string): PlayResult {
  if (session.status !== "playing") {
    return { session, error: "This mission is already resolved. Undo or restart to try again." };
  }

  const move = level.moves(session.state).find((m) => m.id === moveId);
  if (!move || move.disabled) {
    return { session, error: "That move is not available from this state." };
  }

  const result = level.apply(session.state, moveId);
  if (result.error) {
    return { session, error: result.error };
  }

  const nextStatus = result.status ?? level.status(result.state);
  const log = [...session.log, ...result.events].slice(-8);

  return {
    session: {
      state: result.state,
      history: [
        ...session.history,
        {
          state: session.state,
          logLength: session.log.length,
          status: session.status,
          log: [...session.log],
        },
      ],
      log,
      status: nextStatus,
      moves: session.moves + 1,
      hints: session.hints,
    },
  };
}

export function undo(level: LevelModule<any>, session: Session): Session {
  const snapshot = session.history[session.history.length - 1];
  if (!snapshot) return session;

  return {
    state: snapshot.state,
    history: session.history.slice(0, -1),
    log: snapshot.log ? snapshot.log.slice() : session.log.slice(0, snapshot.logLength),
    // Restore the status the player actually saw; recomputing would lose an
    // apply-level status override and could make an undo change the outcome.
    status: snapshot.status ?? level.status(snapshot.state),
    moves: Math.max(0, session.moves - 1),
    hints: session.hints,
  };
}

export function restart(level: LevelModule<any>, hints = 0): Session {
  const session = start(level);
  return { ...session, hints };
}

/** Clone a session into a JSON-safe value without touching the live session. */
export function captureSession(
  level: LevelModule<any>,
  session: Session,
): SessionSnapshot {
  return {
    version: SESSION_SNAPSHOT_VERSION,
    slug: level.meta.slug,
    state: clone(session.state),
    history: clone(session.history),
    log: clone(session.log),
    status: session.status,
    moves: session.moves,
    hints: session.hints,
  };
}

/**
 * Validate and restore a snapshot. Returns null for corrupt, stale, or
 * cross-level data so a browser with an old save can simply start fresh.
 */
export function restoreSession(
  level: LevelModule<any>,
  value: unknown,
): Session | null {
  if (!isObject(value)) return null;
  if (value.version !== SESSION_SNAPSHOT_VERSION) return null;
  if (value.slug !== level.meta.slug) return null;
  if (!isStatus(value.status)) return null;
  if (
    typeof value.moves !== "number" ||
    !Number.isInteger(value.moves) ||
    value.moves < 0
  ) {
    return null;
  }
  if (
    typeof value.hints !== "number" ||
    !Number.isInteger(value.hints) ||
    value.hints < 0
  ) {
    return null;
  }
  if (!isObject(value.state)) return null;
  if (!Array.isArray(value.history) || !value.history.every(isSnapshot)) return null;
  if (value.history.length !== value.moves) return null;
  if (!Array.isArray(value.log) || !value.log.every(isEvent)) return null;

  try {
    return {
      state: clone(value.state),
      history: clone(value.history),
      log: clone(value.log),
      status: value.status,
      moves: value.moves,
      hints: value.hints,
    };
  } catch {
    return null;
  }
}
