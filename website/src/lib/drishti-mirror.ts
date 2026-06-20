import { DRISHTI_LENSES } from "./drishti-lenses";
import {
  detectGaps,
  lensNoteForSummary,
  type DrishtiPassState,
  type LensSlug,
} from "./drishti-pass";

export const FALLBACK_MIRROR =
  "You named the phenomenon and sat with the questions — that counts.";

export const LENS_SIGNAL_BUCKETS: Record<LensSlug, readonly string[]> = {
  "what-exists": ["entity", "layer", "part", "structure", "component"],
  "what-changes": ["drift", "shift", "trend", "slow", "fast", "time"],
  "what-flows": ["flow", "queue", "bottleneck", "wait", "throughput"],
  "what-learns": ["feedback", "learn", "adapt", "habit", "update"],
  "what-persists": ["invariant", "always", "survive", "constraint"],
  "what-emerges": ["emerge", "whole", "pattern", "scale", "local"],
  "what-will-happen": ["likely", "forecast", "probability", "expect"],
};

export const LENS_THEME_LABEL: Record<LensSlug, string> = {
  "what-exists": "what is really there",
  "what-changes": "what shifts over time",
  "what-flows": "what moves and queues",
  "what-learns": "what updates from feedback",
  "what-persists": "what stays invariant",
  "what-emerges": "what appears at scale",
  "what-will-happen": "what seems likely next",
};

function countKeywordHits(note: string, keywords: readonly string[]): number {
  const lower = note.toLowerCase();
  return keywords.reduce(
    (sum, kw) => sum + (lower.includes(kw) ? 1 : 0),
    0
  );
}

function lensOrderIndex(slug: LensSlug): number {
  return DRISHTI_LENSES.findIndex((l) => l.slug === slug);
}

function paraphraseNote(note: string, maxLen = 80): string {
  const trimmed = note.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

function substantiveNotes(
  pass: DrishtiPassState
): { slug: LensSlug; text: string }[] {
  const gapSet = new Set(detectGaps(pass));
  return DRISHTI_LENSES.map((l) => l.slug as LensSlug)
    .filter((slug) => !gapSet.has(slug))
    .map((slug) => ({
      slug,
      text: paraphraseNote(lensNoteForSummary(pass, slug) ?? ""),
    }))
    .filter((entry) => entry.text.length > 0);
}

export function generateMirror(pass: DrishtiPassState): {
  mirrorText: string;
  highlightedLenses: LensSlug[];
} {
  const gapSet = new Set(detectGaps(pass));
  const substantive = DRISHTI_LENSES.map((l) => l.slug as LensSlug).filter(
    (slug) => !gapSet.has(slug)
  );

  if (substantive.length === 0) {
    return { mirrorText: FALLBACK_MIRROR, highlightedLenses: [] };
  }

  const scored = substantive
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

  const top = scored.slice(0, 2).map((s) => s.slug);
  const themeA = LENS_THEME_LABEL[top[0]];
  const themeB = top[1] ? LENS_THEME_LABEL[top[1]] : null;

  if (themeB) {
    return {
      mirrorText: `You kept returning to ${themeA} and ${themeB} — as if both lenses were answering the same underlying question.`,
      highlightedLenses: top,
    };
  }

  return {
    mirrorText: `You kept returning to ${themeA} — as if that lens was doing most of the work.`,
    highlightedLenses: [top[0]],
  };
}

export function generateLetter(pass: DrishtiPassState): string {
  const opening = `You looked at **${pass.phenomenon.trim()}** through seven lenses.`;
  const notes = substantiveNotes(pass);

  const bodyParts: string[] = [];
  if (pass.context?.trim()) {
    bodyParts.push(`You named the context: ${pass.context.trim()}.`);
  }
  if (notes.length > 0) {
    const joined = notes.map((n) => paraphraseNote(n.text)).join(" ");
    bodyParts.push(joined);
  } else {
    bodyParts.push("You sat with the questions even where answers stayed open.");
  }

  const closing = pass.nowSentence?.trim()
    ? `Now you see it differently: ${pass.nowSentence.trim()}`
    : "Something may still be forming.";

  return [opening, bodyParts.join(" "), closing].join("\n\n");
}
