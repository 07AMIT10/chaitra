# Drishti Mirror Closing — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the receipt-style `DrishtiPassSummary` with a single-scroll Mirror Room (before/after, honor gaps, letter + rule-based mirror, insight confirmation, demoted receipt) using deterministic generation — no LLM.

**Architecture:** Extend `DrishtiPassState` with mirror-closing fields; add `website/src/lib/drishti-mirror.ts` for `generateLetter()` and `generateMirror()`; keep gap detection in `drishti-pass.ts` (`isGapNote`, `detectGaps`, `lensNoteForSummary` exported for tests). Letter is persisted on pass complete and backfilled on Mirror Room open; mirror text is computed on render/copy via `generateMirror()`. UI stays in existing overlay; props boundary unchanged with added internal persistence callbacks wired from `DrishtiPassLauncher` and `DeepPassWizard`.

**Tech Stack:** Astro 5, React 19, TypeScript, Node test runner via `tsx --test`, CSS in `website/src/styles/drishti.css`, localStorage pass persistence (`chaitra_drishti_pass`).

**Spec reference:** `docs/superpowers/specs/2026-06-21-drishti-mirror-closing-design.md` (Phase A only). Gap retry merge and LLM mirror are explicitly out of scope.

---

## File map

| File | Responsibility |
|------|----------------|
| `website/src/lib/drishti-pass.ts` | Schema extension, `NOW_SENTENCE_MAX`, export `lensNoteForSummary`, `isGapNote`, `detectGaps`, `ensurePassMirrorFields`, updated `formatPassSummary` |
| `website/src/lib/drishti-mirror.ts` | **New** — keyword buckets, `generateLetter`, `generateMirror`, paraphrase helper |
| `website/src/lib/drishti-pass.test.mjs` | Gap detection + `formatPassSummary` tests |
| `website/src/lib/drishti-mirror.test.mjs` | **New** — letter/mirror generation tests |
| `website/src/data/drishti/pass-hints.json` | Add `gapNudge`, `letterAudience` per lens (×7) |
| `website/src/components/drishti/DrishtiPassSummary.tsx` | Mirror Room UI (4 beats + demoted `<details>`) |
| `website/src/components/drishti/DrishtiPassStep.tsx` | Ephemeral idk whisper on textarea blur |
| `website/src/components/drishti/DrishtiPassLauncher.tsx` | Call `ensurePassMirrorFields` on finalize + summary open; wire new summary callbacks |
| `website/src/components/drishti/DeepPassWizard.tsx` | Same finalize/backfill wiring as launcher |
| `website/src/styles/drishti.css` | Mirror Room layout, before/after grid, gap cards, letter/mirror blocks |
| `website/package.json` | Add `drishti-mirror.test.mjs` to `test:drishti-pass` script |

---

### Task 1: Extend pass schema and constants

**Files:**
- Modify: `website/src/lib/drishti-pass.ts`
- Test: `website/src/lib/drishti-pass.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `website/src/lib/drishti-pass.test.mjs`:

```javascript
test("createEmptyPass accepts optional mirror fields when spread", () => {
  const pass = createEmptyPass({});
  const withMirror = {
    ...pass,
    nowSentence: "I see it as a queue now",
    letter: "You looked at sleep through seven lenses.",
    mirrorConfirmed: true,
    gapRetries: {
      "what-flows": { note: "retry note", retriedAt: "2026-06-21T12:00:00.000Z" },
    },
  };
  assert.equal(withMirror.nowSentence, "I see it as a queue now");
  assert.equal(withMirror.mirrorConfirmed, true);
  assert.ok(withMirror.gapRetries["what-flows"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL — TypeScript may compile but test documents intended shape; if pass compiles without fields, proceed to Step 3.

- [ ] **Step 3: Write minimal implementation**

In `website/src/lib/drishti-pass.ts`, add after `DEEP_NOTE_MAX`:

```typescript
export const NOW_SENTENCE_MAX = 200;
```

Extend `DrishtiPassState`:

```typescript
export interface DrishtiPassState {
  // ... existing fields ...
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
```

Export `lensNoteForSummary` (change `function lensNoteForSummary` to `export function lensNoteForSummary`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-pass.ts website/src/lib/drishti-pass.test.mjs
git commit -m "feat(drishti): extend pass schema for mirror closing"
```

---

### Task 2: Gap detection utilities

**Files:**
- Modify: `website/src/lib/drishti-pass.ts`
- Test: `website/src/lib/drishti-pass.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add to `website/src/lib/drishti-pass.test.mjs`:

```javascript
import { isGapNote, detectGaps } from "./drishti-pass.ts";

test("isGapNote treats empty and idk patterns as gaps", () => {
  assert.equal(isGapNote(undefined), true);
  assert.equal(isGapNote(""), true);
  assert.equal(isGapNote("   "), true);
  assert.equal(isGapNote("idk"), true);
  assert.equal(isGapNote("IDK"), true);
  assert.equal(isGapNote("not sure"), true);
  assert.equal(isGapNote("?"), true);
  assert.equal(isGapNote("—"), true);
  assert.equal(isGapNote("n/a"), true);
  assert.equal(isGapNote("skip"), true);
  assert.equal(isGapNote("A real observation"), false);
});

test("detectGaps returns lens slugs in site order, max 2 for UI is caller slice", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Standup";
  pass.lenses["what-exists"].light = "Three people talk";
  pass.lenses["what-changes"].light = "idk";
  pass.lenses["what-flows"].light = "";
  pass.lenses["what-learns"].light = "not sure";
  const gaps = detectGaps(pass);
  assert.deepEqual(gaps, ["what-changes", "what-flows", "what-learns", "what-persists", "what-emerges", "what-will-happen"]);
  assert.deepEqual(gaps.slice(0, 2), ["what-changes", "what-flows"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL with `isGapNote is not exported` or `isGapNote is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `website/src/lib/drishti-pass.ts`:

```typescript
const IDK_PATTERN =
  /^(idk|i don't know|i dont know|not sure|\?|—|-+|n\/a|skip)$/i;

export function isGapNote(text: string | undefined): boolean {
  const t = text?.trim() ?? "";
  if (!t) return true;
  if (t.length <= 3 && IDK_PATTERN.test(t)) return true;
  return IDK_PATTERN.test(t);
}

export function detectGaps(pass: DrishtiPassState): LensSlug[] {
  return DRISHTI_LENSES.map((l) => l.slug as LensSlug).filter((slug) =>
    isGapNote(lensNoteForSummary(pass, slug))
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-pass.ts website/src/lib/drishti-pass.test.mjs
git commit -m "feat(drishti): add gap detection for mirror closing"
```

---

### Task 3: Mirror module scaffold and keyword buckets

**Files:**
- Create: `website/src/lib/drishti-mirror.ts`
- Create: `website/src/lib/drishti-mirror.test.mjs`
- Modify: `website/package.json` (test script)

- [ ] **Step 1: Write the failing test**

Create `website/src/lib/drishti-mirror.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyPass } from "./drishti-pass.ts";
import { generateMirror } from "./drishti-mirror.ts";

test("generateMirror returns fallback when no substantive notes", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep";
  pass.lenses["what-exists"].light = "idk";
  const result = generateMirror(pass);
  assert.match(
    result.mirrorText,
    /named the phenomenon and sat with the questions/i
  );
  assert.deepEqual(result.highlightedLenses, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npx tsx --test src/lib/drishti-mirror.test.mjs`
Expected: FAIL — cannot find module `./drishti-mirror.ts`

- [ ] **Step 3: Write minimal implementation**

Create `website/src/lib/drishti-mirror.ts`:

```typescript
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
```

Update `website/package.json` script:

```json
"test:drishti-pass": "tsx --test src/lib/drishti-pass.test.mjs src/lib/drishti-pass-prefill.test.mjs src/lib/drishti-mirror.test.mjs"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS (fallback mirror test)

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-mirror.ts website/src/lib/drishti-mirror.test.mjs website/package.json
git commit -m "feat(drishti): add rule-based mirror generation scaffold"
```

---

### Task 4: Mirror keyword scoring tests

**Files:**
- Modify: `website/src/lib/drishti-mirror.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `website/src/lib/drishti-mirror.test.mjs`:

```javascript
test("generateMirror picks top two lenses by keyword hits, tie by lens order", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.lenses["what-exists"].light = "Same three people — structure";
  pass.lenses["what-flows"].light = "Airtime is the bottleneck queue";
  pass.lenses["what-learns"].light = "No feedback loop updates the format";
  const { mirrorText, highlightedLenses } = generateMirror(pass);
  assert.match(mirrorText, /what moves and queues/);
  assert.match(mirrorText, /what updates from feedback/);
  assert.deepEqual(highlightedLenses, ["what-flows", "what-learns"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL if scoring/sort wrong

- [ ] **Step 3: Adjust implementation if needed**

Verify `generateMirror` sort and dual-theme template match test expectations; tweak only if test fails.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-mirror.test.mjs website/src/lib/drishti-mirror.ts
git commit -m "test(drishti): cover mirror keyword scoring"
```

---

### Task 5: Rule-based letter generation

**Files:**
- Modify: `website/src/lib/drishti-mirror.ts`
- Modify: `website/src/lib/drishti-mirror.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `website/src/lib/drishti-mirror.test.mjs`:

```javascript
import { generateLetter } from "./drishti-mirror.ts";

test("generateLetter weaves non-gap notes and bridges nowSentence", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep debt";
  pass.context = "After three short nights";
  pass.lenses["what-exists"].light = "Pressure builds all day";
  pass.lenses["what-changes"].light = "idk";
  pass.lenses["what-flows"].light = "Energy flows out faster than it returns";
  pass.nowSentence = "It's a balance sheet, not a switch";
  const letter = generateLetter(pass);
  assert.match(letter, /You looked at \*\*Sleep debt\*\* through seven lenses\./);
  assert.match(letter, /Pressure builds all day/);
  assert.match(letter, /Energy flows out faster/);
  assert.doesNotMatch(letter, /idk/i);
  assert.match(letter, /balance sheet, not a switch/);
});

test("generateLetter uses invitation when nowSentence missing", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Standup";
  pass.lenses["what-exists"].light = "Three voices dominate";
  const letter = generateLetter(pass);
  assert.match(letter, /Something may still be forming\./);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL — `generateLetter is not exported`

- [ ] **Step 3: Write minimal implementation**

Add to `website/src/lib/drishti-mirror.ts`:

```typescript
function paraphraseNote(note: string, maxLen = 80): string {
  const trimmed = note.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

function substantiveNotes(pass: DrishtiPassState): { slug: LensSlug; text: string }[] {
  const gapSet = new Set(detectGaps(pass));
  return DRISHTI_LENSES.map((l) => l.slug as LensSlug)
    .filter((slug) => !gapSet.has(slug))
    .map((slug) => ({ slug, text: paraphraseNote(lensNoteForSummary(pass, slug) ?? "") }))
    .filter((entry) => entry.text.length > 0);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-mirror.ts website/src/lib/drishti-mirror.test.mjs
git commit -m "feat(drishti): add rule-based letter generation"
```

---

### Task 6: ensurePassMirrorFields helper

**Files:**
- Modify: `website/src/lib/drishti-pass.ts`
- Modify: `website/src/lib/drishti-pass.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `website/src/lib/drishti-pass.test.mjs`:

```javascript
import { ensurePassMirrorFields } from "./drishti-pass.ts";

test("ensurePassMirrorFields backfills letter on complete pass when missing", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep";
  pass.status = "complete";
  pass.lenses["what-exists"].light = "Pressure accumulates";
  assert.equal(pass.letter, undefined);
  const next = ensurePassMirrorFields(pass);
  assert.ok(next.letter);
  assert.match(next.letter, /Sleep/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL — `ensurePassMirrorFields is not exported`

- [ ] **Step 3: Write minimal implementation**

Add to `website/src/lib/drishti-pass.ts`:

```typescript
import { generateLetter } from "./drishti-mirror";

export function ensurePassMirrorFields(pass: DrishtiPassState): DrishtiPassState {
  if (pass.status !== "complete") return pass;
  if (pass.letter?.trim()) return pass;
  return { ...pass, letter: generateLetter(pass) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-pass.ts website/src/lib/drishti-pass.test.mjs
git commit -m "feat(drishti): backfill letter on complete pass open"
```

---

### Task 7: Update formatPassSummary clipboard shape

**Files:**
- Modify: `website/src/lib/drishti-pass.ts`
- Modify: `website/src/lib/drishti-pass.test.mjs`

- [ ] **Step 1: Write the failing test**

Replace the existing `formatPassSummary includes phenomenon, all lenses, and insight` test body with:

```javascript
test("formatPassSummary leads with before/after, letter, mirror, appendix notes", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.context = "Feels stale lately";
  pass.nowSentence = "It's a broadcast, not a sync";
  pass.lenses["what-exists"].light = "Same three people talk";
  pass.lenses["what-flows"].light = "Airtime queues up";
  pass.insight = "We need a round-robin";
  pass.status = "complete";
  pass.letter = "You looked at **Team standup** through seven lenses.\n\nSame three people talk Airtime queues up\n\nNow you see it differently: It's a broadcast, not a sync";

  const text = formatPassSummary(pass);
  assert.match(text, /^# Drishti Pass: Team standup/);
  assert.match(text, /## Before → After/);
  assert.match(text, /Before: Team standup — Feels stale lately/);
  assert.match(text, /After: It's a broadcast, not a sync/);
  assert.match(text, /## Letter/);
  assert.match(text, /You looked at \*\*Team standup\*\*/);
  assert.match(text, /## Mirror/);
  assert.match(text, /---/);
  assert.match(text, /## Full notes/);
  assert.match(text, /What shifted: We need a round-robin/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL — old format missing `## Before → After`

- [ ] **Step 3: Write minimal implementation**

Replace `formatPassSummary` in `website/src/lib/drishti-pass.ts`:

```typescript
import { generateMirror } from "./drishti-mirror";

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
```

Move the `import { generateLetter }` / `generateMirror` imports to a single top-level import block (no inline imports).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-pass.ts website/src/lib/drishti-pass.test.mjs
git commit -m "feat(drishti): update clipboard summary for mirror closing"
```

---

### Task 8: Extend pass-hints.json (all 7 lenses)

**Files:**
- Modify: `website/src/data/drishti/pass-hints.json`

- [ ] **Step 1: Write the failing test**

Add to `website/src/lib/drishti-pass.test.mjs` (or create small JSON assertion in mirror test):

```javascript
import hints from "../data/drishti/pass-hints.json" with { type: "json" };

test("pass-hints includes gapNudge and letterAudience for all seven lenses", () => {
  const slugs = [
    "what-exists",
    "what-changes",
    "what-flows",
    "what-learns",
    "what-persists",
    "what-emerges",
    "what-will-happen",
  ];
  for (const slug of slugs) {
    assert.ok(hints[slug]?.gapNudge, `${slug} missing gapNudge`);
    assert.equal(hints[slug]?.letterAudience, "friend");
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL — `undefined missing gapNudge`

- [ ] **Step 3: Write minimal implementation**

Add to each lens entry in `website/src/data/drishti/pass-hints.json`:

| Slug | gapNudge |
|------|----------|
| `what-exists` | Not sure what exists here? Name one part, layer, or role — that's enough. |
| `what-changes` | Not sure what changes? Name one thing that felt different recently — that's enough. |
| `what-flows` | Not sure what flows? Name one thing that enters and one that leaves — that's enough. |
| `what-learns` | Not sure what learns? Name one feedback loop or habit — that's enough. |
| `what-persists` | Not sure what persists? Name one thing that stayed true through a change — that's enough. |
| `what-emerges` | Not sure what emerges? Name one local rule and what it might add up to — that's enough. |
| `what-will-happen` | Not sure what will happen? Name one likely near future — that's enough. |

Set `"letterAudience": "friend"` on every entry.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/data/drishti/pass-hints.json website/src/lib/drishti-pass.test.mjs
git commit -m "feat(drishti): add gap nudges and letter audience hints"
```

---

### Task 9: Finalize pass with letter generation (launcher + deep wizard)

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassLauncher.tsx`
- Modify: `website/src/components/drishti/DeepPassWizard.tsx`

- [ ] **Step 1: Write the failing test**

Add integration-style unit test in `website/src/lib/drishti-pass.test.mjs`:

```javascript
test("completed pass gets letter via ensurePassMirrorFields", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Sleep";
  pass.status = "complete";
  pass.lenses["what-exists"].light = "Pressure builds";
  const finalized = ensurePassMirrorFields({
    ...pass,
    status: "complete",
  });
  assert.ok(finalized.letter);
});
```

(Manual UI check follows in Step 4.)

- [ ] **Step 2: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS (helper already implemented)

- [ ] **Step 3: Wire finalize in components**

In `DrishtiPassLauncher.tsx`, import `ensurePassMirrorFields` and update `finalizePass`:

```typescript
const finalizePass = (next: DrishtiPassState, depth: "light" | "deep") => {
  const completed = ensurePassMirrorFields({
    ...next,
    depth,
    status: "complete",
    updatedAt: new Date().toISOString(),
  });
  // ... rest unchanged, use `completed` instead of inline object
};
```

When opening summary (`showSummary` true), on first render ensure backfill:

```typescript
useEffect(() => {
  if (!pass || !showSummary || pass.status !== "complete") return;
  const withMirror = ensurePassMirrorFields(pass);
  if (withMirror.letter !== pass.letter) {
    setPass(withMirror);
    writePassesToStorage(
      localStorage,
      upsertPass(readPassesFromStorage(localStorage), withMirror)
    );
  }
}, [pass, showSummary]);
```

Mirror the same pattern in `DeepPassWizard.tsx` `finish()`:

```typescript
const finish = () => {
  const completed = ensurePassMirrorFields({
    ...pass,
    depth: "deep",
    status: "complete",
    currentStep: step,
  });
  persist(completed);
  setShowSummary(true);
};
```

- [ ] **Step 4: Manual verification**

Run: `cd website && npm run dev`
Complete a light pass → summary overlay opens → inspect pass in DevTools Application → localStorage `chaitra_drishti_pass` includes `letter` string.

- [ ] **Step 5: Commit**

```bash
git add website/src/components/drishti/DrishtiPassLauncher.tsx website/src/components/drishti/DeepPassWizard.tsx
git commit -m "feat(drishti): generate letter on pass finalize"
```

---

### Task 10: Mirror Room UI — structure and Beat 1 (before/after)

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassSummary.tsx`
- Modify: `website/src/components/drishti/DrishtiPassLauncher.tsx` (wire `onNowSentenceChange`)

- [ ] **Step 1: Write the failing test**

No component test runner in repo — verification is manual + lib tests. Document expected DOM in this step:

- Root has class `drishti-mirror-room`
- Section `aria-labelledby="drishti-mirror-before-after-heading"`
- `nowSentence` textarea max 200

- [ ] **Step 2: Implement Mirror Room shell + Beat 1**

Replace `DrishtiPassSummary.tsx` layout (keep props, add optional callbacks):

```typescript
type Props = {
  pass: DrishtiPassState;
  onInsightChange: (insight: string) => void;
  onNowSentenceChange?: (value: string) => void;
  onMirrorConfirmed?: (confirmed: boolean) => void;
  onCopy: () => void;
  onNewPass: () => void;
  onDone: () => void;
  storageWarning?: string | null;
};
```

Structure:

```tsx
<div className="drishti-mirror-room" data-depth={pass.depth}>
  <header>
    <h2 id="drishti-mirror-title">{pass.phenomenon}</h2>
    {pass.context && <p className="drishti-mirror-room__context">{pass.context}</p>}
  </header>

  <section className="drishti-mirror-before-after" aria-labelledby="drishti-mirror-before-after-heading">
    <h3 id="drishti-mirror-before-after-heading">Before → After</h3>
    <div className="drishti-mirror-before-after__grid">
      <div className="drishti-mirror-before-after__col drishti-mirror-before-after__col--before">
        <p className="drishti-mirror-before-after__label">Before</p>
        <p>{pass.phenomenon}{pass.context ? ` — ${pass.context}` : ""}</p>
      </div>
      <p className="drishti-mirror-before-after__connector" aria-hidden="true">→</p>
      <div className="drishti-mirror-before-after__col drishti-mirror-before-after__col--after">
        <p className="drishti-mirror-before-after__label">After</p>
        {pass.nowSentence?.trim() ? (
          <p>{pass.nowSentence}</p>
        ) : (
          <p className="drishti-mirror-before-after__placeholder">
            You finished the pass — add one sentence when you're ready.
          </p>
        )}
        <label htmlFor="drishti-now-sentence">
          <span className="visually-hidden">How you see it now</span>
          <textarea
            id="drishti-now-sentence"
            value={pass.nowSentence ?? ""}
            maxLength={NOW_SENTENCE_MAX}
            rows={2}
            placeholder={`In one sentence, how do you see ${pass.phenomenon} differently now?`}
            onChange={(e) => onNowSentenceChange?.(e.target.value)}
          />
        </label>
      </div>
    </div>
  </section>

  {/* Beats 2–4 added in Tasks 11–12 */}
</div>
```

Wire in `DrishtiPassLauncher.tsx`:

```typescript
onNowSentenceChange={(nowSentence) => {
  const updated = { ...pass, nowSentence };
  setPass(updated);
  writePassesToStorage(localStorage, upsertPass(readPassesFromStorage(localStorage), updated));
}}
```

Import `NOW_SENTENCE_MAX` in summary component.

- [ ] **Step 3: Manual verification**

Run dev server; complete pass; confirm before/after grid renders; typing in nowSentence persists on reload.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/drishti/DrishtiPassSummary.tsx website/src/components/drishti/DrishtiPassLauncher.tsx website/src/components/drishti/DeepPassWizard.tsx
git commit -m "feat(drishti): add mirror room before/after beat"
```

---

### Task 11: Beat 2 — Honor gaps (max 2)

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassSummary.tsx`

- [ ] **Step 1: Implement gap section**

Import `detectGaps`, `DRISHTI_LENSES`, hints JSON; extend hint type:

```typescript
type HintEntry = {
  microExample: string;
  deepPrompts: string[];
  gapNudge?: string;
  letterAudience?: string;
};
```

Insert after Beat 1:

```tsx
<section className="drishti-mirror-gaps" aria-labelledby="drishti-mirror-gaps-heading">
  <h3 id="drishti-mirror-gaps-heading">Open lenses</h3>
  {(() => {
    const gaps = detectGaps(pass).slice(0, 2);
    if (gaps.length === 0) {
      return <p className="drishti-mirror-gaps__all">You engaged with all seven lenses.</p>;
    }
    return (
      <>
        <p className="drishti-mirror-gaps__intro">
          You didn't have to know everything. These lenses stayed open — that's useful information.
        </p>
        <ul className="drishti-mirror-gaps__list">
          {gaps.map((slug) => {
            const lens = DRISHTI_LENSES.find((l) => l.slug === slug)!;
            const note = lensNoteForSummary(pass, slug);
            const hint = (hints as Record<string, HintEntry>)[slug];
            return (
              <li key={slug} className="drishti-mirror-gaps__card">
                <p className="drishti-mirror-gaps__lens">
                  {lens.glyph} {lens.title}
                </p>
                <p className="drishti-mirror-gaps__note">{note?.trim() || "left blank"}</p>
                {hint?.gapNudge && <p className="drishti-mirror-gaps__nudge">{hint.gapNudge}</p>}
              </li>
            );
          })}
        </ul>
      </>
    );
  })()}
</section>
```

Phase A: **no** "Try this lens again" button (gap retry merge is Phase B).

- [ ] **Step 2: Manual verification**

Complete pass with `idk` on two lenses → two gap cards with nudges. All substantive notes → single "all seven lenses" line.

- [ ] **Step 3: Commit**

```bash
git add website/src/components/drishti/DrishtiPassSummary.tsx
git commit -m "feat(drishti): add honor gaps beat to mirror room"
```

---

### Task 12: Beat 3 — Letter, mirror, insight confirmation

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassSummary.tsx`
- Modify: `website/src/components/drishti/DrishtiPassLauncher.tsx`
- Modify: `website/src/components/drishti/DeepPassWizard.tsx`

- [ ] **Step 1: Implement letter + mirror + confirm UI**

Add state for expanded insight edit:

```typescript
const [showInsightEdit, setShowInsightEdit] = useState(false);
const { mirrorText } = generateMirror(pass);
const letter = pass.letter ?? generateLetter(pass);
```

Sections:

```tsx
<section className="drishti-mirror-letter" aria-labelledby="drishti-mirror-letter-heading">
  <h3 id="drishti-mirror-letter-heading">Letter</h3>
  <div className="drishti-mirror-letter__body">{letter.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>
</section>

<section className="drishti-mirror-reflection" aria-labelledby="drishti-mirror-reflection-heading">
  <h3 id="drishti-mirror-reflection-heading">Mirror</h3>
  <p>{mirrorText}</p>
</section>

<section className="drishti-mirror-confirm" aria-labelledby="drishti-mirror-confirm-heading">
  <h3 id="drishti-mirror-confirm-heading">Does this reflect what shifted for you?</h3>
  <div className="drishti-mirror-confirm__actions">
    <button type="button" onClick={() => {
      onMirrorConfirmed?.(true);
      if (!pass.insight?.trim() && pass.nowSentence?.trim()) {
        onInsightChange(pass.nowSentence.trim());
      }
    }}>Yes, that's it</button>
    <button type="button" onClick={() => setShowInsightEdit(true)}>Close, but not quite</button>
    <button type="button" onClick={() => onMirrorConfirmed?.(false)}>Skip</button>
  </div>
  {(showInsightEdit || pass.insight) && (
    <label htmlFor="drishti-insight">
      What shifted?
      <textarea id="drishti-insight" value={pass.insight ?? ""} maxLength={400} rows={3}
        onChange={(e) => onInsightChange(e.target.value)} />
    </label>
  )}
</section>
```

Wire `onMirrorConfirmed` in launcher/deep wizard to persist `mirrorConfirmed: true | undefined` (Skip leaves undefined).

- [ ] **Step 2: Manual verification**

Confirm mirror paragraph changes when notes include flow/learn keywords. "Yes, that's it" sets `mirrorConfirmed: true` in localStorage; auto-fills insight from nowSentence when insight empty.

- [ ] **Step 3: Commit**

```bash
git add website/src/components/drishti/DrishtiPassSummary.tsx website/src/components/drishti/DrishtiPassLauncher.tsx website/src/components/drishti/DeepPassWizard.tsx
git commit -m "feat(drishti): add letter, mirror, and insight confirmation beats"
```

---

### Task 13: Beat 4 — Demoted receipt and actions row

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassSummary.tsx`

- [ ] **Step 1: Move full notes into details accordion**

```tsx
<details className="drishti-mirror-receipt">
  <summary>Full pass notes</summary>
  <ul className="drishti-mirror-receipt__notes">
    {DRISHTI_LENSES.map((lens) => {
      const slug = lens.slug as LensSlug;
      const text = lensNoteForSummary(pass, slug);
      return (
        <li key={slug}>
          <span className="drishti-mirror-receipt__lens">{lens.glyph} {lens.title}</span>
          <span>{text || "—"}</span>
        </li>
      );
    })}
  </ul>
</details>

{storageWarning && (
  <p className="drishti-mirror-room__warning" role="status">{storageWarning}</p>
)}

<div className="drishti-mirror-room__actions">
  <button type="button" onClick={onCopy}>Copy pass</button>
  <button type="button" onClick={onNewPass}>New pass</button>
  <button type="button" onClick={onDone}>Done</button>
</div>
```

Remove old receipt-first list and duplicate insight field from pre-redesign layout.

- [ ] **Step 2: Manual verification**

Full notes hidden until expand. Copy uses new `formatPassSummary` shape (includes Letter and Mirror sections).

- [ ] **Step 3: Commit**

```bash
git add website/src/components/drishti/DrishtiPassSummary.tsx
git commit -m "feat(drishti): demote full notes to expandable receipt"
```

---

### Task 14: Per-step idk whisper in DrishtiPassStep

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassStep.tsx`
- Modify: `website/src/styles/drishti.css`

- [ ] **Step 1: Implement whisper state and blur handler**

In `DrishtiPassStep.tsx`:

```typescript
import { useState } from "react";
import { isGapNote } from "../../lib/drishti-pass";

const IDK_WHISPER = "Not knowing is data — you can leave this and return later.";
const WHISPER_MS = 2000;

// inside component:
const [whisper, setWhisper] = useState(false);
const whisperTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleNoteBlur = (value: string) => {
  if (!isGapNote(value)) {
    setWhisper(false);
    return;
  }
  setWhisper(true);
  if (whisperTimer.current) clearTimeout(whisperTimer.current);
  whisperTimer.current = setTimeout(() => setWhisper(false), WHISPER_MS);
};

const handleNoteChange = (value: string, onChange: (v: string) => void) => {
  setWhisper(false);
  onChange(value);
};
```

Add `onBlur={(e) => handleNoteBlur(e.target.value)}` and route `onChange` through `handleNoteChange` on light and deep textareas.

Render below active textarea:

```tsx
{whisper && (
  <p className="drishti-pass-step__idk-whisper" role="status">
    {IDK_WHISPER}
  </p>
)}
```

Add `useRef` import from React.

- [ ] **Step 2: Add CSS**

In `drishti.css`:

```css
.drishti-pass-step__idk-whisper {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-drishti);
  font-style: italic;
}
```

- [ ] **Step 3: Manual verification**

Type `idk` in a lens note and blur → whisper appears ~2s then fades. Next keystroke dismisses immediately.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/drishti/DrishtiPassStep.tsx website/src/styles/drishti.css
git commit -m "feat(drishti): show idk validation whisper on note blur"
```

---

### Task 15: Mirror Room CSS

**Files:**
- Modify: `website/src/styles/drishti.css`

- [ ] **Step 1: Add Mirror Room styles**

Append after `.drishti-pass-summary` block (keep `.drishti-pass-summary-overlay`):

```css
.drishti-mirror-room {
  max-width: 36rem;
  width: 100%;
  max-height: min(90dvh, 720px);
  overflow-y: auto;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-drishti) 30%, transparent);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.drishti-mirror-before-after__grid {
  display: grid;
  gap: var(--space-3);
}

@media (min-width: 40rem) {
  .drishti-mirror-before-after__grid {
    grid-template-columns: 1fr auto 1fr;
    align-items: start;
  }
}

.drishti-mirror-before-after__col--before {
  color: var(--color-muted);
}

.drishti-mirror-before-after__col--after {
  color: var(--color-text);
  font-size: 1.05rem;
}

.drishti-mirror-before-after__connector {
  margin: 0;
  align-self: center;
  color: var(--color-drishti);
  font-weight: 700;
}

.drishti-mirror-before-after__placeholder {
  color: var(--color-muted);
  font-style: italic;
}

.drishti-mirror-gaps__card {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-drishti) 25%, transparent);
  background: var(--color-drishti-subtle);
}

.drishti-mirror-letter__body,
.drishti-mirror-reflection p {
  line-height: 1.6;
}

.drishti-mirror-confirm__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.drishti-mirror-room__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
}

.drishti-mirror-receipt__notes {
  list-style: none;
  padding: 0;
  margin: var(--space-3) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (prefers-reduced-motion: reduce) {
  .drishti-pass-step__idk-whisper {
    transition: none;
  }
}
```

Update shared textarea selector to include `.drishti-mirror-room textarea` alongside `.drishti-pass-summary textarea`.

- [ ] **Step 2: Manual verification**

Desktop: before/after side-by-side at ≥640px (`40rem`). Mobile: stacked. Gap cards readable; focus rings on buttons/fields.

- [ ] **Step 3: Commit**

```bash
git add website/src/styles/drishti.css
git commit -m "style(drishti): add mirror room layout and components"
```

---

### Task 16: Final verification

**Files:**
- All touched files above

- [ ] **Step 1: Run full drishti test suite**

Run: `cd website && npm run test:drishti-pass`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript build**

Run: `cd website && npm run build`
Expected: Build succeeds without type errors

- [ ] **Step 3: Manual smoke test checklist**

1. Light pass with 2 gaps → Mirror Room shows before/after, 2 gap cards, letter, mirror, confirm, collapsed receipt
2. Legacy complete pass in localStorage without `letter` → opens with backfilled letter
3. Copy pass → clipboard contains Before/After, Letter, Mirror, Full notes sections
4. idk whisper on step blur during pass
5. Deep pass finish → same Mirror Room

- [ ] **Step 4: Commit any fixups**

```bash
git commit -am "fix(drishti): mirror closing phase A polish"
```

---

## Plan self-review

### Spec coverage (Phase A)

| Requirement | Task |
|-------------|------|
| Mirror Room layout (4 beats + demoted receipt) | Tasks 10–13 |
| Schema: `nowSentence`, `letter`, `gapRetries`, `mirrorConfirmed` | Task 1 |
| `pass-hints.json`: `gapNudge`, `letterAudience` ×7 | Task 8 |
| Rule-based mirror (no LLM) | Tasks 3–4 |
| Gap detection utility | Task 2 |
| `formatPassSummary()` update | Task 7 |
| Per-step idk whisper | Task 14 |
| Tests: gap, mirror, letter, formatPassSummary | Tasks 2–7 |
| CSS Mirror Room | Task 15 |
| Letter on finalize + backfill | Tasks 6, 9 |
| Gap retry merge | **Out of scope** — no task |
| LLM mirror | **Out of scope** — no task |

### Placeholder scan

No TBD/TODO/similar-to-task placeholders. Each task includes concrete code, paths, and verification commands.

### Type consistency

- `LensSlug`, `DrishtiPassState` extended fields match spec §7
- `generateMirror` return shape `{ mirrorText, highlightedLenses }` used consistently in UI and `formatPassSummary`
- Hint type includes optional `gapNudge` / `letterAudience`
- `NOW_SENTENCE_MAX = 200` used in summary textarea

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-21-drishti-mirror-closing-phase-a-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
