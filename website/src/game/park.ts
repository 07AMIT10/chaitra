import type { SessionSnapshot } from "./engine";
import { isResumable } from "./progress";
import type { LevelMeta } from "./types";

export const PARK_KEY = "chaitra_algorithms_game_park_v1";
export const PARK_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const PARK_MAX_BYTES = 256 * 1024;

export interface ParkRecord {
  version: 1;
  slug: string;
  at: string; // ISO-8601 string
  snapshot: SessionSnapshot;
  lastMove: { id: string; label: string } | null;
}

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type ParkLoadResult = {
  record: ParkRecord | null;
  expired: boolean;
  corrupt: boolean;
};

export type ParkSaveResult =
  | { ok: true; record: ParkRecord }
  | { ok: false; reason: "disabled" | "quota" | "invalid" | "exists"; existing?: ParkRecord };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isLastMove(value: unknown): value is { id: string; label: string } | null {
  if (value === null || value === undefined) return true;
  if (!isPlainObject(value)) return false;
  return typeof value.id === "string" && typeof value.label === "string";
}

function classifyStorageError(err: unknown): "quota" | "disabled" {
  if (err instanceof Error) {
    const name = err.name.toLowerCase();
    const msg = err.message.toLowerCase();
    if (name.includes("quota") || msg.includes("quota")) {
      return "quota";
    }
    if (name.includes("security") || msg.includes("disabled") || msg.includes("denied")) {
      return "disabled";
    }
  }
  return "quota";
}

function measureBytes(str: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).length;
  }
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

export function loadPark(storage?: StorageLike | null, now?: number): ParkLoadResult {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!store) {
    return { record: null, expired: false, corrupt: false };
  }

  let raw: string | null = null;
  try {
    raw = store.getItem(PARK_KEY);
  } catch {
    return { record: null, expired: false, corrupt: false };
  }

  if (!raw) {
    return { record: null, expired: false, corrupt: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { record: null, expired: false, corrupt: true };
  }

  if (!isPlainObject(parsed)) {
    return { record: null, expired: false, corrupt: true };
  }

  const p = parsed;
  if (p.version !== 1) {
    return { record: null, expired: false, corrupt: true };
  }
  if (typeof p.slug !== "string" || !p.slug) {
    return { record: null, expired: false, corrupt: true };
  }
  if (typeof p.at !== "string") {
    return { record: null, expired: false, corrupt: true };
  }
  const atMs = Date.parse(p.at);
  if (!Number.isFinite(atMs)) {
    return { record: null, expired: false, corrupt: true };
  }
  if (
    !isResumable(p.snapshot as SessionSnapshot) ||
    (p.snapshot as SessionSnapshot).slug !== p.slug
  ) {
    return { record: null, expired: false, corrupt: true };
  }
  if (!isLastMove(p.lastMove)) {
    return { record: null, expired: false, corrupt: true };
  }

  const current = now ?? Date.now();
  if (current - atMs > PARK_TTL_MS) {
    return { record: null, expired: true, corrupt: false };
  }

  return {
    record: {
      version: 1,
      slug: p.slug,
      at: p.at,
      snapshot: p.snapshot as SessionSnapshot,
      lastMove: p.lastMove ? { id: String(p.lastMove.id), label: String(p.lastMove.label) } : null,
    },
    expired: false,
    corrupt: false,
  };
}

export function savePark(
  slug: string,
  snapshot: SessionSnapshot,
  lastMove: { id: string; label: string } | null,
  storage?: StorageLike | null,
  now?: number
): ParkSaveResult {
  if (typeof slug !== "string" || !slug) {
    return { ok: false, reason: "invalid" };
  }
  if (!isResumable(snapshot) || snapshot.slug !== slug) {
    return { ok: false, reason: "invalid" };
  }
  if (!isLastMove(lastMove)) {
    return { ok: false, reason: "invalid" };
  }

  const store = storage === undefined ? defaultStorage() : storage;
  if (!store) {
    return { ok: false, reason: "disabled" };
  }

  const existing = loadPark(store, now);
  if (existing.record && existing.record.slug !== slug) {
    return { ok: false, reason: "exists", existing: existing.record };
  }

  const atDate = typeof now === "number" && Number.isFinite(now) ? new Date(now) : new Date();
  const record: ParkRecord = {
    version: 1,
    slug,
    at: atDate.toISOString(),
    snapshot,
    lastMove: lastMove ? { id: lastMove.id, label: lastMove.label } : null,
  };

  const serialized = JSON.stringify(record);
  const bytes = measureBytes(serialized);

  if (bytes > PARK_MAX_BYTES) {
    return { ok: false, reason: "invalid" };
  }

  try {
    store.setItem(PARK_KEY, serialized);
    return { ok: true, record };
  } catch (err) {
    return { ok: false, reason: classifyStorageError(err) };
  }
}

export function clearPark(storage?: StorageLike | null): void {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!store) return;
  try {
    store.removeItem(PARK_KEY);
  } catch {
    /* safe when storage is unavailable */
  }
}

export function parkSummary(
  record: ParkRecord | null,
  metas: readonly LevelMeta[] | LevelMeta[]
): { title: string; missionLabel: string; lastMoveLabel: string | null; invariant: string } | null {
  if (!record) return null;
  const meta = metas.find((m) => m.slug === record.slug);
  if (!meta) return null;
  const num = (meta as any).id ?? meta.number;
  return {
    title: meta.title,
    missionLabel: `REPAIR ${String(num).padStart(2, "0")}`,
    lastMoveLabel: record.lastMove ? record.lastMove.label : null,
    invariant: meta.invariant,
  };
}
