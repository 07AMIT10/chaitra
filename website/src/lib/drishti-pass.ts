import { DRISHTI_LENSES } from "./drishti-lenses";
import { generateLetter, generateMirror } from "./drishti-mirror";

export const STORAGE_KEY = "chaitra_drishti_pass";
export const MAX_PASSES = 20;
export const PHENOMENON_MAX = 120;
export const LIGHT_NOTE_MAX = 280;
export const DEEP_NOTE_MAX = 800;
export const NOW_SENTENCE_MAX = 200;

export type LensSlug =
  | "what-exists"
  | "what-changes"
  | "what-flows"
  | "what-learns"
  | "what-persists"
  | "what-emerges"
  | "what-will-happen";

export type StudySlug = "sleep" | "blood-circulation" | "the-office-as-a-computer";

export interface LensPassNotes {
  light?: string;
  deep?: string;
  excerptStudy?: StudySlug;
  excerptExpanded?: boolean;
}

export interface DrishtiPassState {
  passId: string;
  phenomenon: string;
  context?: string;
  createdAt: string;
  updatedAt: string;
  depth: "light" | "deep";
  status: "draft" | "complete";
  currentStep: number;
  lenses: Record<LensSlug, LensPassNotes>;
  insight?: string;
  sourceUrl?: string;
  preferredStudy?: StudySlug;
  nowSentence?: string;
  letter?: string;
  mirrorConfirmed?: boolean;
  gapRetries?: Partial<
    Record<
      LensSlug,
      {
        note: string;
        retriedAt: string;
      }
    >
  >;
}

const IDK_PATTERN =
  /^(idk|i don't know|i dont know|not sure|\?|—|-+|n\/a|skip)$/i;

function emptyLensNotes(): Record<LensSlug, LensPassNotes> {
  return Object.fromEntries(
    DRISHTI_LENSES.map((l) => [l.slug as LensSlug, { light: "", deep: "" }])
  ) as Record<LensSlug, LensPassNotes>;
}

export function createPassId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createEmptyPass(opts: {
  sourceUrl?: string;
  preferredStudy?: StudySlug;
  passId?: string;
}): DrishtiPassState {
  const now = new Date().toISOString();
  return {
    passId: opts.passId ?? createPassId(),
    phenomenon: "",
    createdAt: now,
    updatedAt: now,
    depth: "light",
    status: "draft",
    currentStep: 0,
    lenses: emptyLensNotes(),
    sourceUrl: opts.sourceUrl,
    preferredStudy: opts.preferredStudy,
  };
}

function isDrishtiPassState(value: unknown): value is DrishtiPassState {
  if (!value || typeof value !== "object") return false;
  const p = value as DrishtiPassState;
  return typeof p.passId === "string" && typeof p.phenomenon === "string";
}

export function loadPasses(raw: string | null): DrishtiPassState[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDrishtiPassState);
  } catch {
    if (import.meta.env?.DEV) {
      console.warn("[drishti-pass] invalid localStorage JSON; resetting");
    }
    return [];
  }
}

export function savePasses(passes: DrishtiPassState[]): string {
  return JSON.stringify(capPasses(passes));
}

export function capPasses(passes: DrishtiPassState[]): DrishtiPassState[] {
  return passes.slice(0, MAX_PASSES);
}

export function upsertPass(
  passes: DrishtiPassState[],
  pass: DrishtiPassState
): DrishtiPassState[] {
  const without = passes.filter((p) => p.passId !== pass.passId);
  return capPasses([{ ...pass, updatedAt: new Date().toISOString() }, ...without]);
}

export function getPassById(
  passes: DrishtiPassState[],
  passId: string
): DrishtiPassState | undefined {
  return passes.find((p) => p.passId === passId);
}

export function getActiveDraft(passes: DrishtiPassState[]): DrishtiPassState | undefined {
  return passes.find((p) => p.status === "draft");
}

export function readPassesFromStorage(storage: Storage | null): DrishtiPassState[] {
  if (!storage) return [];
  return loadPasses(storage.getItem(STORAGE_KEY));
}

export function writePassesToStorage(
  storage: Storage | null,
  passes: DrishtiPassState[]
): { ok: boolean; reason?: "disabled" | "quota" } {
  if (!storage) return { ok: false, reason: "disabled" };
  try {
    storage.setItem(STORAGE_KEY, savePasses(passes));
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "QuotaExceededError") return { ok: false, reason: "quota" };
    return { ok: false, reason: "disabled" };
  }
}

export function isGapNote(text: string | undefined): boolean {
  const t = text?.trim() ?? "";
  if (!t) return true;
  if (t.length <= 3 && IDK_PATTERN.test(t)) return true;
  return IDK_PATTERN.test(t);
}

export function lensNoteForSummary(
  pass: DrishtiPassState,
  slug: LensSlug
): string | undefined {
  const notes = pass.lenses[slug];
  if (pass.depth === "deep") {
    return notes.deep?.trim() || notes.light?.trim();
  }
  return notes.light?.trim();
}

export function detectGaps(pass: DrishtiPassState): LensSlug[] {
  return DRISHTI_LENSES.map((l) => l.slug as LensSlug).filter((slug) =>
    isGapNote(lensNoteForSummary(pass, slug))
  );
}

export function ensurePassMirrorFields(pass: DrishtiPassState): DrishtiPassState {
  if (pass.status !== "complete") return pass;
  if (pass.letter?.trim()) return pass;
  return { ...pass, letter: generateLetter(pass) };
}

/** Plain-text summary for clipboard copy (light or deep pass). */
export function formatPassSummary(pass: DrishtiPassState): string {
  const passWithLetter = ensurePassMirrorFields(pass);
  const { mirrorText } = generateMirror(passWithLetter);

  const lines: string[] = [`# Drishti Pass: ${pass.phenomenon}`];
  if (pass.context?.trim()) {
    lines.push(`Context: ${pass.context.trim()}`);
  }
  lines.push("");
  lines.push("## Before → After");
  const before = pass.context?.trim()
    ? `${pass.phenomenon} — ${pass.context.trim()}`
    : pass.phenomenon;
  lines.push(`Before: ${before}`);
  lines.push(`After: ${pass.nowSentence?.trim() || "—"}`);
  lines.push("");
  lines.push("## Letter");
  lines.push(passWithLetter.letter?.trim() || "—");
  lines.push("");
  lines.push("## Mirror");
  lines.push(mirrorText);
  lines.push("");
  lines.push("---");
  lines.push("## Full notes");
  for (const lens of DRISHTI_LENSES) {
    const slug = lens.slug as LensSlug;
    const note = lensNoteForSummary(pass, slug);
    lines.push(`${lens.glyph} ${lens.title}: ${note || "—"}`);
  }
  if (pass.insight?.trim()) {
    lines.push("");
    lines.push(`What shifted: ${pass.insight.trim()}`);
  }
  return lines.join("\n");
}
