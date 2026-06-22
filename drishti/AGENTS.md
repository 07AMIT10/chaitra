# Drishti study authoring — AI agent guide

Instructions for coding agents adding or editing **Drishti case studies**. Human-facing voice and ADHD-friendly rules live in [AUTHORING.md](./AUTHORING.md); follow those for prose quality.

## What a Drishti study is

A **study** applies all seven Drishti lenses to one real-world phenomenon (e.g. sleep, blood circulation). Source of truth lives under `drishti/studies/`. The website does **not** read that folder directly — sync scripts copy content into `website/src/content/drishti/` and regenerate catalog JSON.

Routes after sync: `/drishti/studies/[slug]` (slug comes from `meta.yaml`).

**Critical:** Readers see the **accordion** (`what-*.md`), not `README.md`. Write for the accordion; README is long-form authoring reference.

## Voice D (editorial north star)

**Feel after finishing:** surprise first (playful pattern-spotter), then something usable Monday (guided practitioner).

| Beat | Rule | Gold example |
|------|------|--------------|
| **Hook** | First sentence quotable; one concrete object | Office: "agreements wearing furniture" |
| **Lens body** | ≤80 words **or** bullets/table; no `**Takeaway:**` label | Bold hook line, not academic header |
| **Practitioner close** | One 60-second try-it in `meta.yaml` `tryIt` | "Count countries on your desk object label" |
| **Forecast** | Leading indicators; no fake % | Sleep: time-to-fall-asleep, not coffee count |

### Brainrot antidote test

Would this sentence work in a group chat?

- ✅ "Sleep debt is a queue you can't delete."
- ❌ "Photosynthesis is an extremely parallelized pipeline."

### Gold vs anti-pattern

| Gold | Anti-pattern |
|------|--------------|
| `THE_OFFICE_AS_A_COMPUTER/what-exists.md` — "agreements wearing furniture" | `THE_IMMUNE_SYSTEM/what-exists.md` — distributed spam filter opener |
| `SLEEP/what-will-happen.md` — leading indicators, no fake % | `POWER_GRIDS/what-will-happen.md` — Prior/Posterior template |
| `BLOOD_CIRCULATION/what-flows.md` — queue timeout, inline topic link | `PHOTOSYNTHESIS/README.md` (old) — parallelized pipeline opener |

### Banned phrases (lint-enforced)

- `Furthermore,`
- `What also exists are`
- `**Takeaway:**` (use plain bold hook instead)
- `Prior:` / `Posterior:` without real cited numbers
- Filler: `fundamentally`, `incredibly`, `massive` (when not describing a measurable quantity)
- Opener: "planetary-scale distributed system"

### Hard caps

- `what-*.md` ≤80 words unless table or mermaid fence
- Max 3 sentences per paragraph
- One concrete named object per study minimum
- One non-empty `tryIt` in `meta.yaml`

## 14-dimension rubric

Score each study **0–2** per dimension (0 = fail, 1 = pass, 2 = exemplar). **Publish threshold: ≥20/28.**

| # | Dimension | 0 | 2 (exemplar) |
|---|-----------|---|--------------|
| 1 | Hook density | Generic textbook opener | Study-specific, quotable |
| 2 | Concrete anchor | No physical object in first 100 words | Named object you could photograph |
| 3 | `what-*.md` word count | >120 words per lens | ≤80 words OR bullets/table |
| 4 | Paragraph brevity | Any paragraph >3 sentences | All ≤3 sentences |
| 5 | Lens shape variety | All 7 lenses are 3 prose paragraphs | ≥2 lenses use bullets, table, or diagram |
| 6 | Metaphor budget | >3 CS metaphors in one study | ≤1 forced metaphor; rest plain language |
| 7 | Banned phrase scan | Contains banned phrases | None |
| 8 | TL;DR stake test | All three bullets are definitions | ≥1 bullet implies human consequence |
| 9 | Try-it moment | None | ≥1 prompt reader can do in 60 seconds |
| 10 | Forecasting honesty | Fake % branches | Named indicators + what would change your mind |
| 11 | Phenomenon on site | Not synced | One-liner in rendered page hero (Phase 2) |
| 12 | Curriculum bridge in body | Topics only in footer | ≥1 inline `/topics/` link in a lens file |
| 13 | Pass excerpt quality | Missing or generic | ≤25 words, study-specific hook |
| 14 | README ≠ accordion | `what-*.md` copies README verbatim | Accordion compressed; README expanded |

Self-score before shipping. Copy template from `drishti/studies/_TEMPLATE/` (Office-based), not SLEEP alone.

## Directory structure template

```
drishti/studies/YOUR_STUDY_NAME/
├── README.md              # long-form narrative (authoring; not synced to accordion)
├── meta.yaml              # catalog metadata (required)
├── what-exists.md         # one file per lens (all seven required)
├── what-changes.md
├── what-flows.md
├── what-learns.md
├── what-persists.md
├── what-emerges.md
└── what-will-happen.md
```

**Folder naming:** `SCREAMING_SNAKE_CASE`.  
**URL slug:** kebab-case in `meta.yaml`.

**Lens order** (fixed): `what-exists` → `what-changes` → `what-flows` → `what-learns` → `what-persists` → `what-emerges` → `what-will-happen`

## `meta.yaml` schema

```yaml
title: "Human-readable title"       # required
slug: your-study-name               # optional — defaults from folder name
tagline: "One-line hook"            # optional — subtitle under title
phenomenon: "One sentence, no jargon"   # optional — sync to study hero (Phase 2)
featured: true                      # optional — hub ordering
tryIt: "60-second practitioner prompt"  # required — lint error if empty
hooks:                              # optional — per-lens one-liners for Pass
  what-exists: "quotable hook"
relatedTopics:                      # required — topic slugs from website/src/data/topics.json
  - queueing-theory
tldr:                               # required — exactly 3 bullets
  - "First insight with stakes."
  - "Second insight."
  - "Third insight."
atAGlance:                          # required — four one-line summaries
  flows: "What moves through the system"
  optimizes: "What the system is trying to improve"
  persists: "What stays stable across change"
  likelyFuture: "Plausible near-term trajectory"
```

## Authoring rules (summary)

Follow [AUTHORING.md](./AUTHORING.md) in full. Minimum for agents:

1. **Write for the accordion** — `what-*.md` is what users read; README is expanded reference.
2. **TL;DR** — 3 bullets; ≥1 answers "why should I care today?"; mirror in `meta.yaml`.
3. **Bold hook** at start of each lens file (no `**Takeaway:**` label).
4. **≤80 words** per `what-*.md` unless table/diagram.
5. **`what-will-happen`** — branches + leading indicators; no fake Bayesian %.
6. **Run lint before sync:** `cd website && npm run lint:drishti-content`

## Step-by-step: add a new study

### 1. Copy template

```bash
cp -r drishti/studies/_TEMPLATE drishti/studies/YOUR_STUDY_NAME
```

### 2. Write content

- Fill `meta.yaml` including `tryIt`.
- Write all seven `what-*.md` files (Voice D, accordion-first).
- Write `README.md` long-form (can expand beyond 80 words per section).

### 3. Lint + sync

```bash
cd website
npm run lint:drishti-content
npm run catalog:drishti
npm run sync:drishti
```

### 4. Verify

```bash
npm run test:drishti-pass
npm run build
```

Confirm study renders at `/drishti/studies/<slug>`.

### 5. Pass excerpts (if Return Loop should bridge)

Add entries under `website/src/data/drishti/pass-excerpts.json` (≤25 words, hook-shaped).

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Optimizing README only | Accordion `what-*.md` is the synced UX |
| `**Takeaway:**` labels | Bold hook without label |
| Missing `tryIt` | Add 60-second prompt to `meta.yaml` |
| Skipping lint | `npm run lint:drishti-content` before sync |
| Editing `website/src/content/drishti/` by hand | Edit `drishti/studies/` and re-sync |
| Invalid `relatedTopics` slug | Check `website/src/data/topics.json` |

## Related paths

| Path | Role |
|------|------|
| `drishti/AUTHORING.md` | Human voice, templates |
| `drishti/studies/_TEMPLATE/` | Office-based Voice D template |
| `drishti/studies/THE_OFFICE_AS_A_COMPUTER/` | Gold exemplar |
| `website/scripts/lint-drishti-content.mjs` | Content quality CI |
| `website/scripts/sync-drishti.mjs` | Source → content sync |
| `website/src/data/drishti/pass-excerpts.json` | Pass + bridge excerpts |
