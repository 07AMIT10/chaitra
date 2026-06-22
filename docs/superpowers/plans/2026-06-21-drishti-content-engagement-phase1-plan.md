# Drishti Content & Engagement Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1 foundation from the content quality + engagement spec: Return Loop merge, six analytics events, content lint CI, Voice D guardrails in AGENTS/AUTHORING, Office template polish, and full Voice D rewrites of Global Supply Chains + Photosynthesis.

**Architecture:** Cherry-pick Return Loop v1 from `feat/drishti-pass-phase1` @ `18c8d2a`, add a thin `drishti-analytics.ts` wrapper (delegated `data-analytics` clicks + programmatic `trackDrishti()` for mirror/echo handlers). Content lint runs as a Node script over `drishti/studies/` before CI build. Accordion `what-*.md` files are the synced UX surface; README stays long-form.

**Tech Stack:** Astro 5, React 19, Node ESM scripts, YAML meta in `drishti/studies/`, existing `sync-drishti.mjs` / `generate-drishti-catalog.mjs`.

**Spec:** `docs/superpowers/specs/2026-06-21-drishti-content-and-engagement-design.md`

---

## File map

| Area | Create | Modify |
|------|--------|--------|
| Analytics | `website/src/lib/drishti-analytics.ts`, `website/src/components/drishti/DrishtiAnalyticsInit.tsx` | Return-loop components, `DrishtiPassSummary.tsx`, `DrishtiLayout.astro` |
| Return Loop | From branch: `drishti-return.ts`, 6 components | `DrishtiPassLauncher.tsx`, `drishti-pass.ts`, `index.astro`, `[slug].astro`, `drishti.css` |
| Lint | `website/scripts/lint-drishti-content.mjs` | `website/package.json`, `.github/workflows/website-ci.yml` |
| Docs | — | `drishti/AGENTS.md`, `drishti/AUTHORING.md`, `drishti/studies/_TEMPLATE/` |
| Content | — | Office, GLOBAL_SUPPLY_CHAINS, PHOTOSYNTHESIS (all `what-*.md`, `meta.yaml`, `README.md`) |
| Pass excerpts | — | `website/src/data/drishti/pass-excerpts.json`, `StudySlug` in `drishti-pass.ts` |

---

### Task 1: Merge Return Loop v1

**Files:**
- Checkout from `feat/drishti-pass-phase1`: `website/src/lib/drishti-return.ts`, `drishti-return.test.mjs`, `DrishtiEchoBanner.tsx`, `DrishtiHubReturn.tsx`, `DrishtiPassJournal.tsx`, `DrishtiStudyBridge.tsx`, `DrishtiWhatsNext.tsx`
- Modify: `DrishtiPassLauncher.tsx`, `DrishtiPassSummary.tsx`, `drishti-pass.ts`, `index.astro`, `[slug].astro`, `drishti.css`

- [ ] **Step 1:** `git checkout feat/drishti-pass-phase1 -- <paths above>`
- [ ] **Step 2:** Extend `DrishtiPassState` with `completedAt`, `echoDismissed`, `echoAnswer`, `relatedStudySlug` (from branch diff)
- [ ] **Step 3:** Wire `DrishtiHubReturn` on hub, `DrishtiStudyBridge` on study pages
- [ ] **Step 4:** Run `npm run test:drishti-pass` — add `drishti-return.test.mjs` to script if needed

---

### Task 2: Analytics (6 events)

**Files:**
- Create: `website/src/lib/drishti-analytics.ts`
- Create: `website/src/components/drishti/DrishtiAnalyticsInit.tsx`
- Modify: `DrishtiLayout.astro`, `DrishtiPassSummary.tsx`, `DrishtiEchoBanner.tsx`, `DrishtiWhatsNext.tsx`, `DrishtiPassJournal.tsx`, `DrishtiStudyBridge.tsx`

```typescript
// website/src/lib/drishti-analytics.ts
export type DrishtiAnalyticsEvent =
  | "mirror-confirmed"
  | "echo-yes"
  | "echo-changed"
  | "echo-dismiss"
  | "whats-next-study-click"
  | "pass-journal-reopen"
  | "study-bridge-compare"
  | "apply-drishti-chip"
  | "hub-apply-drishti"
  | "pass-go-deeper"
  | "pass-deep-finish"
  | "pass-excerpt-study-link";

export function trackDrishti(
  event: DrishtiAnalyticsEvent,
  detail?: Record<string, string>
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("chaitra:analytics", { detail: { event, ...detail } })
  );
}
```

- [ ] **Step 1:** `DrishtiAnalyticsInit` — document click delegate on `[data-analytics]` → `trackDrishti`
- [ ] **Step 2:** `mirror-confirmed` — `data-analytics="mirror-confirmed"` on Yes button; `trackDrishti` on confirm handler
- [ ] **Step 3:** `echo-yes` / `echo-changed` / `echo-dismiss` on Echo banner buttons
- [ ] **Step 4:** `whats-next-study-click` on related study `<a>` in `DrishtiWhatsNext`
- [ ] **Step 5:** `pass-journal-reopen` on journal Reopen button
- [ ] **Step 6:** `study-bridge-compare` on bridge primary CTA
- [ ] **Step 7:** Mount `<DrishtiAnalyticsInit client:load />` in `DrishtiLayout.astro`

---

### Task 3: `lint-drishti-content.mjs`

**Files:**
- Create: `website/scripts/lint-drishti-content.mjs`
- Modify: `website/package.json`, `.github/workflows/website-ci.yml`

Checks (errors fail exit 1; warnings print but pass):

| Check | Rule |
|-------|------|
| Word count | `what-*.md` ≤80 words unless `\|` table or ` ```mermaid ` fence |
| Banned phrases | `Furthermore,`, `What also exists are`, `**Takeaway:**`, `Prior:`, `Posterior:`, `\bfundamentally\b`, `\bincredibly\b`, `\bmassive\b` (non-quantity), `planetary-scale distributed system` |
| Paragraph length | ≤3 sentences per paragraph |
| tryIt | `meta.yaml` has non-empty `tryIt` |
| relatedTopics | slugs exist in `topics.json` |
| Excerpt coverage | warn if catalog study missing from `pass-excerpts.json` |
| Mermaid | warn if `what-flows.md` lacks mermaid fence |

- [ ] **Step 1:** Implement script with study folder walk
- [ ] **Step 2:** Add `"lint:drishti-content": "node scripts/lint-drishti-content.mjs"` to `package.json`
- [ ] **Step 3:** Add CI step after `sync:drishti`: `npm run lint:drishti-content`

---

### Task 4: AGENTS.md + AUTHORING.md + _TEMPLATE

**Files:**
- Modify: `drishti/AGENTS.md`, `drishti/AUTHORING.md`
- Create: `drishti/studies/_TEMPLATE/meta.yaml`, seven `what-*.md`, `README.md` (from Office)

AGENTS.md additions:
- Voice D table (hook, lens body ≤80w, practitioner close, forecast honesty)
- 14-dimension rubric (0–2, publish ≥20/28)
- Gold (Office `what-exists.md`) vs anti-pattern (Immune System `what-exists.md`)
- Banned phrases list
- Brainrot antidote test
- "Write for accordion not README"
- Require `tryIt` in meta.yaml; run lint before sync
- Extended meta schema: `phenomenon`, `tryIt`, `featured`, `hooks`

- [ ] **Step 1:** Update AGENTS.md sections
- [ ] **Step 2:** Update AUTHORING.md (voice, TL;DR stake test, separate templates)
- [ ] **Step 3:** Copy Office study into `_TEMPLATE/` with placeholder strings

---

### Task 5: Office Voice D polish

**Files:** `drishti/studies/THE_OFFICE_AS_A_COMPUTER/meta.yaml`, lens files if gaps

- [ ] Add `phenomenon`, `tryIt`, `featured: true`, optional `hooks`
- [ ] Verify all `what-*.md` pass lint (already gold quality)

```yaml
phenomenon: "A room that converts electricity into decisions"
featured: true
tryIt: "Count how many apps your team uses to decide one thing — that's your real org chart."
hooks:
  what-exists: "agreements wearing furniture"
```

---

### Task 6: Rewrite GLOBAL_SUPPLY_CHAINS (Voice D)

**Files:** all seven `what-*.md`, `meta.yaml`, `README.md`

Voice rules per lens: bold hook (no `**Takeaway:**` label), ≤80 words, named objects (container, Suez, bullwhip), one inline `/topics/` link in body, forecast with leading indicators not fake %.

- [ ] Rewrite all seven accordion files
- [ ] Update meta.yaml with phenomenon, tryIt, hooks
- [ ] Expand README (long-form); accordion compressed vs README

---

### Task 7: Rewrite PHOTOSYNTHESIS (Voice D)

Same rules as Task 6. Anti-pattern to avoid: "extremely parallelized pipeline" opener.

- [ ] Full rewrite all files
- [ ] `tryIt`: "Hold a leaf to light — the green you see is the antenna, not the fuel."

---

### Task 8: pass-excerpts.json + StudySlug

**Files:** `website/src/data/drishti/pass-excerpts.json`, `website/src/lib/drishti-pass.ts`

- [ ] Add `global-supply-chains` and `photosynthesis` keys (≤25 words per excerpt, hook-shaped)
- [ ] Extend `StudySlug` union with new slugs

---

### Task 9: Sync + verify

- [ ] `cd website && npm run catalog:drishti && npm run sync:drishti`
- [ ] `npm run lint:drishti-content`
- [ ] `npm run test:drishti-pass`
- [ ] `npm run build`

---

## Commits

1. `Add Drishti content and engagement Phase 1 implementation plan`
2. `feat(drishti): content quality Phase 1 — lint, AGENTS rubric, analytics, exemplar rewrites`

## Deferred to Phase 2

- Remaining 4 Gemini rewrites: Internet Routing, Immune System, Urban Traffic, Power Grids
- `phenomenon` → study page hero sync fix
- pass-excerpts for all 9 studies
