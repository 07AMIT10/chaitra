# Drishti Return Loop v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give learners structured reasons to return after a Drishti pass — post-closure "What's next", hub pass journal, 3-day echo banner, and study bridge cards — all on localStorage, no backend.

**Architecture:** Extend `DrishtiPassState` with return-loop fields; add `drishti-return.ts` for echo/journal/bridge helpers; wire four React islands (summary beat, hub journal+echo, study bridge) via existing `DrishtiPassLauncher` reopen events and `DrishtiLayout`.

**Tech Stack:** Astro 5, React 19, TypeScript, Node test runner (`tsx --test`), localStorage.

**Spec:** [docs/superpowers/specs/2026-06-21-drishti-return-loop-design.md](../specs/2026-06-21-drishti-return-loop-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `website/src/lib/drishti-pass.ts` | Schema fields on `DrishtiPassState`; `finalizePassState()` |
| `website/src/lib/drishti-return.ts` | **New** — `daysSince`, migration, journal sort, echo gate, `computeRelatedStudy`, `studyBridgeMatch`, `passInsightSnippet` |
| `website/src/lib/drishti-return.test.mjs` | **New** — unit tests for return helpers |
| `website/src/components/drishti/DrishtiWhatsNext.tsx` | **New** — Beat A post-closure links |
| `website/src/components/drishti/DrishtiPassJournal.tsx` | **New** — Beat B hub cards |
| `website/src/components/drishti/DrishtiEchoBanner.tsx` | **New** — Beat C echo banner |
| `website/src/components/drishti/DrishtiStudyBridge.tsx` | **New** — Beat D study compare card |
| `website/src/components/drishti/DrishtiHubReturn.tsx` | **New** — hub wrapper (journal + echo) |
| `website/src/components/drishti/DrishtiPassSummary.tsx` | Add `DrishtiWhatsNext`; optional `scrollToBeforeAfter` |
| `website/src/components/drishti/DrishtiPassLauncher.tsx` | Finalize via `finalizePassState`; reopen/echo events; session tracking |
| `website/src/components/drishti/DeepPassWizard.tsx` | Finalize via `finalizePassState` |
| `website/src/pages/drishti/index.astro` | Wire `DrishtiHubReturn` below hero |
| `website/src/pages/drishti/studies/[slug].astro` | Wire `DrishtiStudyBridge` above accordions |
| `website/src/styles/drishti.css` | Journal, echo, bridge, what's-next styles |
| `website/package.json` | Add `drishti-return.test.mjs` to `test:drishti-pass` |

---

### Task 1: Schema + return helpers

**Files:**
- Modify: `website/src/lib/drishti-pass.ts`
- Create: `website/src/lib/drishti-return.ts`
- Create: `website/src/lib/drishti-return.test.mjs`
- Modify: `website/package.json`

- [ ] **Step 1: Write failing tests**

```javascript
// website/src/lib/drishti-return.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyPass } from "./drishti-pass.ts";
import {
  daysSince,
  migratePassFields,
  computeRelatedStudy,
  getRecentPasses,
  getEchoEligiblePass,
  passInsightSnippet,
  studyBridgeMatch,
} from "./drishti-return.ts";

test("daysSince returns whole days between ISO dates", () => {
  assert.equal(daysSince("2026-06-18T12:00:00.000Z", new Date("2026-06-21T12:00:00.000Z")), 3);
});

test("migratePassFields backfills completedAt from updatedAt", () => {
  const pass = createEmptyPass({});
  pass.status = "complete";
  pass.updatedAt = "2026-06-01T00:00:00.000Z";
  const next = migratePassFields(pass);
  assert.equal(next.completedAt, "2026-06-01T00:00:00.000Z");
});

test("computeRelatedStudy picks strongest non-gap lens study", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Standup";
  pass.lenses["what-flows"].light = "queue bottleneck wait throughput";
  assert.equal(computeRelatedStudy(pass), "sleep");
});

test("getRecentPasses pins drafts then last 5 complete", () => {
  const draft = createEmptyPass({});
  draft.status = "draft";
  draft.phenomenon = "Draft";
  const completes = Array.from({ length: 6 }, (_, i) => {
    const p = createEmptyPass({});
    p.status = "complete";
    p.phenomenon = `C${i}`;
    p.completedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    return p;
  });
  const recent = getRecentPasses([...completes, draft]);
  assert.equal(recent[0].phenomenon, "Draft");
  assert.equal(recent.length, 6); // 1 draft + 5 complete
});

test("getEchoEligiblePass returns most recent pass >= 3 days, not dismissed", () => {
  const old = createEmptyPass({});
  old.status = "complete";
  old.completedAt = "2026-06-01T00:00:00.000Z";
  old.phenomenon = "Old";
  const recent = createEmptyPass({});
  recent.status = "complete";
  recent.completedAt = "2026-06-20T00:00:00.000Z";
  const eligible = getEchoEligiblePass([old, recent], new Date("2026-06-21T12:00:00.000Z"));
  assert.equal(eligible?.phenomenon, "Old");
});

test("studyBridgeMatch prefers preferredStudy", () => {
  const pass = createEmptyPass({ preferredStudy: "sleep" });
  pass.status = "complete";
  assert.ok(studyBridgeMatch(pass, "sleep"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npm run test:drishti-pass`
Expected: FAIL — module `./drishti-return.ts` not found

- [ ] **Step 3: Implement schema + helpers**

Add to `DrishtiPassState`:

```typescript
completedAt?: string;
echoDismissed?: boolean;
echoAnswer?: "yes" | "changed";
relatedStudySlug?: StudySlug;
```

Add `finalizePassState(pass, depth)` that calls `ensurePassMirrorFields`, sets `status: "complete"`, `completedAt`, `relatedStudySlug`.

Implement `drishti-return.ts` with algorithms from spec §7 (reuse `LENS_SIGNAL_BUCKETS`, `detectGaps`, `pass-excerpts.json`).

- [ ] **Step 4: Run tests**

Run: `cd website && npm run test:drishti-pass`
Expected: PASS

- [ ] **Step 5: Commit** (included in implementation commit)

---

### Task 2: Beat A — Post-closure "What's next"

**Files:**
- Create: `website/src/components/drishti/DrishtiWhatsNext.tsx`
- Modify: `website/src/components/drishti/DrishtiPassSummary.tsx`

- [ ] **Step 1: Create `DrishtiWhatsNext`**

Props: `pass`, `onNewPass`. Render below action buttons:
- History → `/drishti#passes`
- Related study → `/drishti/studies/{slug}` when `pass.relatedStudySlug` set (title from `pass-excerpts.json`)
- New pass → `onNewPass`
- No insight: *"Revisit anytime in Your passes"* instead of echo-style copy

- [ ] **Step 2: Wire into `DrishtiPassSummary`**

Import and render `<DrishtiWhatsNext />` after `.drishti-mirror-room__actions`.

- [ ] **Step 3: Add CSS** `.drishti-whats-next` block in `drishti.css`

---

### Task 3: Finalize hooks

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassLauncher.tsx`
- Modify: `website/src/components/drishti/DeepPassWizard.tsx`

- [ ] **Step 1: Replace inline finalize with `finalizePassState`**

```typescript
const completed = finalizePassState(next, depth);
sessionStorage.setItem("chaitra_drishti_session_completes", JSON.stringify([...ids, completed.passId]));
```

- [ ] **Step 2: Add reopen event listener in launcher**

Listen for `drishti:reopen-pass` CustomEvent `{ passId, scrollToBeforeAfter? }` → load pass, show summary overlay.

Listen for `drishti:continue-pass` → `openPass()`.

---

### Task 4: Beat B + C — Hub journal and echo

**Files:**
- Create: `website/src/components/drishti/DrishtiPassJournal.tsx`
- Create: `website/src/components/drishti/DrishtiEchoBanner.tsx`
- Create: `website/src/components/drishti/DrishtiHubReturn.tsx`
- Modify: `website/src/pages/drishti/index.astro`

- [ ] **Step 1: `DrishtiPassJournal`**

Section `id="passes"`, `aria-labelledby`. Cards from `getRecentPasses`. Snippet via `passInsightSnippet`. Reopen dispatches `drishti:reopen-pass`. Continue dispatches `drishti:continue-pass`. Empty state copy per spec.

- [ ] **Step 2: `DrishtiEchoBanner`**

Eligibility via `getEchoEligiblePass`; skip if passId in session completes. Actions update pass in localStorage (`echoAnswer`, `echoDismissed`). Changed → reopen with `scrollToBeforeAfter: true`. Yes → toast confirmation.

- [ ] **Step 3: `DrishtiHubReturn` wrapper**

Compose echo + journal; refresh on storage changes.

- [ ] **Step 4: Wire in `index.astro`**

Below hero CTA:

```astro
<DrishtiHubReturn client:load />
```

- [ ] **Step 5: CSS** — `.drishti-pass-journal`, `.drishti-echo-banner` (amber accent)

---

### Task 5: Beat D — Study bridge

**Files:**
- Create: `website/src/components/drishti/DrishtiStudyBridge.tsx`
- Modify: `website/src/pages/drishti/studies/[slug].astro`

- [ ] **Step 1: `DrishtiStudyBridge`**

Props: `studySlug`, `studyTitle`. Read localStorage; `studyBridgeMatch`; most recent complete only. Link to `#lens-{slug}` + Apply Drishti via `drishti:open-pass` with lens.

- [ ] **Step 2: Wire above accordions in study page**

```astro
<DrishtiStudyBridge client:load studySlug={study.slug} studyTitle={study.title} />
```

- [ ] **Step 3: CSS** — `.drishti-study-bridge`

---

### Task 6: Reopen summary persistence

**Files:**
- Modify: `website/src/components/drishti/DrishtiPassLauncher.tsx`
- Modify: `website/src/components/drishti/DrishtiPassSummary.tsx`

- [ ] **Step 1: Summary overlay on reopen**

When reopening from journal/echo, show `DrishtiPassSummary` with insight/`nowSentence` editable; persist on change. On Done, close overlay.

- [ ] **Step 2: Echo Changed save**

When saving insight/nowSentence after Changed flow, set `echoAnswer: "changed"`.

- [ ] **Step 3: `scrollToBeforeAfter` prop**

On mount, `document.getElementById("drishti-mirror-before-after-heading")?.scrollIntoView()`.

---

### Task 7: Verify

- [ ] Run: `cd website && npm run test:drishti-pass && npm run build`
- [ ] Read lints on touched files

---

### Task 8: Commits

1. Plan: `Add Drishti Return Loop v1 implementation plan`
2. Implementation: `feat(website): add Drishti Return Loop v1`

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Beat A post-closure What's next | Task 2 |
| Beat B hub pass journal (5 complete + drafts) | Task 4 |
| Beat C echo ≥3 days, hub-only | Task 4 |
| Beat D study bridge | Task 5 |
| Schema fields + migration | Task 1 |
| `computeRelatedStudy` on finalize | Task 1, 3 |
| No push/email | N/A — hub-only render |
| Accessibility (region, list, keyboard) | Tasks 2, 4, 5 — ARIA in components |
| Same-session no echo | Task 3 sessionStorage |
| Reopen read-only notes | Task 6 (receipt is display-only) |

No placeholders. All four beats covered.
