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

export type SaveFailureCode = "invalid" | "cap" | "size" | "storage";

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
): { records: T[]; dropped: number } {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { records: [], dropped: 0 };
  }
  if (raw === null) return { records: [], dropped: 0 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { records: [], dropped: 0 };
  }
  if (!Array.isArray(parsed)) return { records: [], dropped: 0 };
  const records: T[] = [];
  let dropped = 0;
  for (const item of parsed) {
    if (validate(item)) records.push(item as T);
    else dropped += 1;
  }
  return { records, dropped };
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

export function loadBranches(storage: StorageLike): { branches: Branch[]; dropped: number } {
  const { records, dropped } = readList<Branch>(storage, STORAGE_KEYS.branches, isBranch);
  return { branches: records, dropped };
}

export function saveBranch(storage: StorageLike, branch: Branch): BranchSaveResult {
  const existing = loadBranches(storage);

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
  writeList(storage, STORAGE_KEYS.branches, remaining);
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
} {
  const { records, dropped } = readList<ReaderBench>(storage, STORAGE_KEYS.benches, isReaderBench);
  return { benches: records, dropped };
}

export function saveReaderBench(
  storage: StorageLike,
  bench: ReaderBench,
): ReaderBenchSaveResult {
  const existing = loadReaderBenches(storage);

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
  writeList(storage, STORAGE_KEYS.benches, remaining);
  return remaining;
}
