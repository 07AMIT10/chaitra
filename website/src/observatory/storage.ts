import { isBranch, isDraft, isReaderBench } from "./scenario";
import type { Branch, Draft, ReaderBench, StorageLike } from "./types";

export const STORAGE_KEYS = {
  branches: "chaitra_observatory_branches_v1",
  draft: "chaitra_observatory_draft_v1",
  benches: "chaitra_observatory_benches_v1",
} as const;

export const LIMITS = {
  branches: 30,
  branchBytes: 8192,
  noteChars: 800,
  mutations: 12,
  readerBenches: 12,
  readerBenchBytes: 8192,
} as const;

export type SaveFailureCode = "invalid" | "cap" | "size" | "storage" | "corrupt";

export type BranchSaveResult =
  | { ok: true; branches: Branch[] }
  | { ok: false; code: SaveFailureCode; error: string; branches: Branch[] };

export type ReaderBenchSaveResult =
  | { ok: true; benches: ReaderBench[] }
  | { ok: false; code: SaveFailureCode; error: string; benches: ReaderBench[] };

export type DraftSaveResult = { ok: boolean; error?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Reads a stored JSON array, returning only the records that pass `validate`. */
function readList<T>(
  storage: StorageLike,
  key: string,
  validate: (value: unknown) => boolean,
): { records: T[]; dropped: number; corrupt: boolean } {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { records: [], dropped: 0, corrupt: false };
  }
  if (raw === null) return { records: [], dropped: 0, corrupt: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { records: [], dropped: 0, corrupt: true };
  }
  if (!Array.isArray(parsed)) return { records: [], dropped: 0, corrupt: true };
  const records: T[] = [];
  let dropped = 0;
  for (const item of parsed) {
    if (validate(item)) records.push(item as T);
    else dropped += 1;
  }
  return { records, dropped, corrupt: false };
}

/** Writes a JSON array; returns null on success or an error message on failure. */
function writeList(storage: StorageLike, key: string, records: unknown[]): string | null {
  try {
    storage.setItem(key, JSON.stringify(records));
    return null;
  } catch (error) {
    return errorMessage(error);
  }
}

export function loadBranches(storage: StorageLike): {
  branches: Branch[];
  dropped: number;
  corrupt: boolean;
} {
  const { records, dropped, corrupt } = readList<Branch>(
    storage,
    STORAGE_KEYS.branches,
    isBranch,
  );
  return { branches: records, dropped, corrupt };
}

/** Removes the branch store so the user can recover from a corrupt payload. */
export function clearBranches(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEYS.branches);
  } catch (error) {
    throw new Error(`could not clear branches: ${errorMessage(error)}`);
  }
}

export function saveBranch(storage: StorageLike, branch: Branch): BranchSaveResult {
  const existing = loadBranches(storage);

  // Never overwrite a payload we could not parse; the raw key is kept for recovery.
  if (existing.corrupt) {
    return {
      ok: false,
      code: "corrupt",
      error: "branch storage is unreadable; clear it before saving",
      branches: existing.branches,
    };
  }

  // Named size errors always win over the generic "invalid" verdict.
  if (isRecord(branch)) {
    if (typeof branch.note === "string" && branch.note.length > LIMITS.noteChars) {
      return {
        ok: false,
        code: "size",
        error: `branch note exceeds ${LIMITS.noteChars} characters`,
        branches: existing.branches,
      };
    }
    if (Array.isArray(branch.mutations) && branch.mutations.length > LIMITS.mutations) {
      return {
        ok: false,
        code: "size",
        error: `branch mutations exceed the limit of ${LIMITS.mutations}`,
        branches: existing.branches,
      };
    }
  }

  if (!isBranch(branch)) {
    return {
      ok: false,
      code: "invalid",
      error: "branch failed validation",
      branches: existing.branches,
    };
  }

  if (utf8Bytes(JSON.stringify(branch)) > LIMITS.branchBytes) {
    return {
      ok: false,
      code: "size",
      error: `branch exceeds ${LIMITS.branchBytes} bytes`,
      branches: existing.branches,
    };
  }

  let merged: Branch[] | null;
  const index = existing.branches.findIndex((item) => item.id === branch.id);
  if (index >= 0) {
    merged = existing.branches.map((item, position) => (position === index ? branch : item));
  } else if (existing.branches.length >= LIMITS.branches) {
    merged = null;
  } else {
    merged = [...existing.branches, branch];
  }

  if (merged === null) {
    return {
      ok: false,
      code: "cap",
      error: `branch storage is at its limit of ${LIMITS.branches}`,
      branches: existing.branches,
    };
  }

  const writeError = writeList(storage, STORAGE_KEYS.branches, merged);
  if (writeError !== null) {
    return {
      ok: false,
      code: "storage",
      error: `could not persist branches: ${writeError}`,
      branches: existing.branches,
    };
  }
  return { ok: true, branches: merged };
}

export function deleteBranch(storage: StorageLike, id: string): Branch[] {
  const existing = loadBranches(storage);
  const remaining = existing.branches.filter((item) => item.id !== id);
  if (remaining.length === existing.branches.length) return existing.branches;
  const writeError = writeList(storage, STORAGE_KEYS.branches, remaining);
  if (writeError !== null) {
    throw new Error(`could not delete branch: ${writeError}`);
  }
  return remaining;
}

export function loadDraft(storage: StorageLike): Draft | null {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEYS.draft);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(storage: StorageLike, draft: Draft): DraftSaveResult {
  if (!isDraft(draft)) return { ok: false, error: "draft failed validation" };
  try {
    storage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `could not persist draft: ${errorMessage(error)}` };
  }
}

export function loadReaderBenches(storage: StorageLike): {
  benches: ReaderBench[];
  dropped: number;
  corrupt: boolean;
} {
  const { records, dropped, corrupt } = readList<ReaderBench>(
    storage,
    STORAGE_KEYS.benches,
    isReaderBench,
  );
  return { benches: records, dropped, corrupt };
}

/** Removes the reader-bench store so the user can recover from a corrupt payload. */
export function clearReaderBenches(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEYS.benches);
  } catch (error) {
    throw new Error(`could not clear reader benches: ${errorMessage(error)}`);
  }
}

export function saveReaderBench(
  storage: StorageLike,
  bench: ReaderBench,
): ReaderBenchSaveResult {
  const existing = loadReaderBenches(storage);

  // Never overwrite a payload we could not parse; the raw key is kept for recovery.
  if (existing.corrupt) {
    return {
      ok: false,
      code: "corrupt",
      error: "reader bench storage is unreadable; clear it before saving",
      benches: existing.benches,
    };
  }

  if (!isReaderBench(bench)) {
    return {
      ok: false,
      code: "invalid",
      error: "reader bench failed validation",
      benches: existing.benches,
    };
  }

  if (utf8Bytes(JSON.stringify(bench)) > LIMITS.readerBenchBytes) {
    return {
      ok: false,
      code: "size",
      error: `reader bench exceeds ${LIMITS.readerBenchBytes} bytes`,
      benches: existing.benches,
    };
  }

  let merged: ReaderBench[] | null;
  const index = existing.benches.findIndex((item) => item.id === bench.id);
  if (index >= 0) {
    merged = existing.benches.map((item, position) => (position === index ? bench : item));
  } else if (existing.benches.length >= LIMITS.readerBenches) {
    merged = null;
  } else {
    merged = [...existing.benches, bench];
  }

  if (merged === null) {
    return {
      ok: false,
      code: "cap",
      error: `reader bench storage is at its limit of ${LIMITS.readerBenches}`,
      benches: existing.benches,
    };
  }

  const writeError = writeList(storage, STORAGE_KEYS.benches, merged);
  if (writeError !== null) {
    return {
      ok: false,
      code: "storage",
      error: `could not persist reader benches: ${writeError}`,
      benches: existing.benches,
    };
  }
  return { ok: true, benches: merged };
}

export function deleteReaderBench(storage: StorageLike, id: string): ReaderBench[] {
  const existing = loadReaderBenches(storage);
  const remaining = existing.benches.filter((item) => item.id !== id);
  if (remaining.length === existing.benches.length) return existing.benches;
  const writeError = writeList(storage, STORAGE_KEYS.benches, remaining);
  if (writeError !== null) {
    throw new Error(`could not delete reader bench: ${writeError}`);
  }
  return remaining;
}
