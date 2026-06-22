import excerpts from "../data/drishti/pass-excerpts.json";
import { DRISHTI_LENSES } from "./drishti-lenses";
import { LENS_SIGNAL_BUCKETS } from "./drishti-mirror";
import {
  detectGaps,
  ensurePassMirrorFields,
  lensNoteForSummary,
  type DrishtiPassState,
  type LensSlug,
  type StudySlug,
} from "./drishti-pass";

export const SESSION_COMPLETES_KEY = "chaitra_drishti_session_completes";

type ExcerptLensMap = Record<string, { title: string; excerpt: string }>;

function lensOrderIndex(slug: LensSlug): number {
  return DRISHTI_LENSES.findIndex((l) => l.slug === slug);
}

function countKeywordHits(note: string, keywords: readonly string[]): number {
  const lower = note.toLowerCase();
  return keywords.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0);
}

function firstLine(text: string): string {
  return text.trim().split(/\n/)[0]?.trim() ?? "";
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function daysSince(iso: string, now = new Date()): number {
  const then = new Date(iso).getTime();
  const ms = now.getTime() - then;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function migratePassFields(pass: DrishtiPassState): DrishtiPassState {
  if (pass.status === "complete" && !pass.completedAt) {
    return { ...pass, completedAt: pass.updatedAt };
  }
  return pass;
}

export function migratePasses(passes: DrishtiPassState[]): DrishtiPassState[] {
  return passes.map(migratePassFields);
}

function scoreNonGapLenses(
  pass: DrishtiPassState
): { slug: LensSlug; score: number }[] {
  const gapSet = new Set(detectGaps(pass));
  return DRISHTI_LENSES.map((l) => l.slug as LensSlug)
    .filter((slug) => !gapSet.has(slug))
    .map((slug) => {
      const note = lensNoteForSummary(pass, slug) ?? "";
      return {
        slug,
        score: countKeywordHits(note, LENS_SIGNAL_BUCKETS[slug]),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return lensOrderIndex(a.slug) - lensOrderIndex(b.slug);
    });
}

function firstStudyForLens(lens: LensSlug): StudySlug | undefined {
  const map = (excerpts as Record<string, ExcerptLensMap>)[lens];
  if (!map) return undefined;
  const slug = Object.keys(map)[0];
  return slug as StudySlug | undefined;
}

export function computeRelatedStudy(pass: DrishtiPassState): StudySlug | undefined {
  const scored = scoreNonGapLenses(pass);
  const top = scored[0];
  if (!top) return undefined;
  return firstStudyForLens(top.slug);
}

export function getStudyTitle(studySlug: StudySlug, lens?: LensSlug): string {
  if (lens) {
    const entry = (excerpts as Record<string, ExcerptLensMap>)[lens]?.[studySlug];
    if (entry?.title) return entry.title;
  }
  for (const lensSlug of DRISHTI_LENSES.map((l) => l.slug)) {
    const entry = (excerpts as Record<string, ExcerptLensMap>)[lensSlug]?.[studySlug];
    if (entry?.title) return entry.title;
  }
  return studySlug;
}

export function getLensTitle(slug: LensSlug): string {
  return DRISHTI_LENSES.find((l) => l.slug === slug)?.title ?? slug;
}

export function passInsightSnippet(pass: DrishtiPassState): string {
  if (pass.insight?.trim()) return firstLine(pass.insight);
  if (pass.nowSentence?.trim()) return firstLine(pass.nowSentence);
  if (pass.completedAt) return `Completed ${formatShortDate(pass.completedAt)}`;
  return pass.phenomenon.trim() || "Draft pass";
}

export function getRecentPasses(
  passes: DrishtiPassState[],
  limit = 5
): DrishtiPassState[] {
  const migrated = migratePasses(passes);
  const drafts = migrated.filter((p) => p.status === "draft");
  const completes = migrated
    .filter((p) => p.status === "complete")
    .sort((a, b) =>
      (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)
    )
    .slice(0, limit);
  return [...drafts, ...completes];
}

export function getEchoEligiblePass(
  passes: DrishtiPassState[],
  now = new Date()
): DrishtiPassState | undefined {
  const migrated = migratePasses(passes);
  return migrated
    .filter(
      (p) =>
        p.status === "complete" &&
        p.completedAt &&
        !p.echoDismissed &&
        daysSince(p.completedAt, now) >= 3
    )
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
}

function studyHasLensExcerpt(studySlug: StudySlug, lens: LensSlug): boolean {
  return Boolean(
    (excerpts as Record<string, ExcerptLensMap>)[lens]?.[studySlug]?.excerpt
  );
}

export function studyBridgeMatch(
  pass: DrishtiPassState,
  studySlug: StudySlug
): { lens: LensSlug } | null {
  if (pass.status !== "complete") return null;

  if (pass.preferredStudy === studySlug) {
    const scored = scoreNonGapLenses(pass).filter((s) =>
      studyHasLensExcerpt(studySlug, s.slug)
    );
    if (scored[0]) return { lens: scored[0].slug };
    return { lens: "what-exists" };
  }

  for (const { slug, score } of scoreNonGapLenses(pass)) {
    if (!studyHasLensExcerpt(studySlug, slug)) continue;
    const note = lensNoteForSummary(pass, slug) ?? "";
    const hits = countKeywordHits(note, LENS_SIGNAL_BUCKETS[slug]);
    if (hits >= 1 || score >= 1) return { lens: slug };
  }

  return null;
}

export function findStudyBridgePass(
  passes: DrishtiPassState[],
  studySlug: StudySlug
): { pass: DrishtiPassState; lens: LensSlug } | null {
  const migrated = migratePasses(passes);
  const completes = migrated
    .filter((p) => p.status === "complete")
    .sort((a, b) =>
      (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)
    );

  for (const pass of completes) {
    const match = studyBridgeMatch(pass, studySlug);
    if (match) return { pass, lens: match.lens };
  }
  return null;
}

export function finalizePassState(
  pass: DrishtiPassState,
  depth: "light" | "deep"
): DrishtiPassState {
  const now = new Date().toISOString();
  return ensurePassMirrorFields({
    ...pass,
    depth,
    status: "complete",
    updatedAt: now,
    completedAt: now,
    relatedStudySlug: computeRelatedStudy(pass),
  });
}

export function readSessionCompletes(storage: Storage | null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SESSION_COMPLETES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function markSessionComplete(
  storage: Storage | null,
  passId: string
): void {
  if (!storage) return;
  const ids = readSessionCompletes(storage);
  if (!ids.includes(passId)) {
    storage.setItem(SESSION_COMPLETES_KEY, JSON.stringify([...ids, passId]));
  }
}

export function wasCompletedThisSession(
  storage: Storage | null,
  passId: string
): boolean {
  return readSessionCompletes(storage).includes(passId);
}
