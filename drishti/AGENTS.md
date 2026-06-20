# Drishti study authoring — AI agent guide

Instructions for coding agents adding or editing **Drishti case studies**. Human-facing voice and ADHD-friendly rules live in [AUTHORING.md](./AUTHORING.md); follow those for prose quality.

## What a Drishti study is

A **study** applies all seven Drishti lenses to one real-world phenomenon (e.g. sleep, blood circulation). Source of truth lives under `drishti/studies/`. The website does **not** read that folder directly — sync scripts copy content into `website/src/content/drishti/` and regenerate catalog JSON.

Routes after sync: `/drishti/studies/[slug]` (slug comes from `meta.yaml`).

## Directory structure template

```
drishti/studies/YOUR_STUDY_NAME/
├── README.md              # full narrative (hub preview; optional for sync, required for authors)
├── meta.yaml              # catalog metadata (required)
├── what-exists.md         # one file per lens (all seven required)
├── what-changes.md
├── what-flows.md
├── what-learns.md
├── what-persists.md
├── what-emerges.md
└── what-will-happen.md
```

**Folder naming:** `SCREAMING_SNAKE_CASE` (e.g. `YOUR_STUDY_NAME`, `BLOOD_CIRCULATION`).  
**URL slug:** kebab-case in `meta.yaml` (e.g. `your-study-name`). If omitted, sync derives slug from folder name.

**Lens order** (fixed everywhere):

1. `what-exists` → 2. `what-changes` → 3. `what-flows` → 4. `what-learns` → 5. `what-persists` → 6. `what-emerges` → 7. `what-will-happen`

Lens slugs are defined in `website/src/data/drishti-lenses.json`; do not invent new lens filenames.

## Required files

| File | Purpose |
|------|---------|
| `meta.yaml` | Title, slug, tagline, TL;DR, related topics, at-a-glance fields |
| `what-*.md` (×7) | Short lens-specific body for the study page accordion |
| `README.md` | Full case study with TL;DR, phenomenon, all seven sections (authoring reference; not synced to MDX index) |

Sync **requires** `meta.yaml` and all seven `what-*.md` files. Missing files log warnings and leave gaps on the site.

## `meta.yaml` schema

```yaml
title: "Human-readable title"       # required — page H1 source
slug: your-study-name               # optional — kebab-case URL; defaults from folder name
tagline: "One-line hook"            # optional — subtitle under title
relatedTopics:                      # required — topic slugs from website/src/data/topics.json
  - queueing-theory
  - statistical-learning
tldr:                               # required — exactly 3 bullets (site + catalog)
  - "First insight."
  - "Second insight."
  - "Third insight."
atAGlance:                          # required — four one-line summaries
  flows: "What moves through the system"
  optimizes: "What the system is trying to improve"
  persists: "What stays stable across change"
  likelyFuture: "Plausible near-term trajectory"
```

**Field rules:**

- `relatedTopics` entries must match existing curriculum topic slugs or links break.
- `tldr` must have **3** bullets (site components assume three).
- Quote strings that contain colons or special YAML characters.
- `atAGlance` keys are fixed; all four strings should be non-empty.

## Authoring rules (summary)

Follow [AUTHORING.md](./AUTHORING.md) in full. Minimum for agents:

1. **TL;DR** — 3 bullets at top of `README.md`; mirror in `meta.yaml`.
2. **Bold one-line takeaway** at the start of each lens section in `README.md`.
3. **Max 2–3 sentences** per paragraph; bullets over prose walls.
4. Each `what-*.md` file: 1–3 short paragraphs or a tight bullet list (see `drishti/studies/SLEEP/what-exists.md`).
5. **`what-will-happen`** — include forecasting flavor (branches, leading indicators, or a small table); see SLEEP example.
6. Plain language first; link curriculum concepts via `relatedTopics`, not inline jargon dumps.

## Step-by-step: add a new study

### 1. Create the study folder

```bash
mkdir -p drishti/studies/YOUR_STUDY_NAME
```

Copy structure from `drishti/studies/SLEEP/` as a template.

### 2. Write `meta.yaml` and lens files

- Fill all fields in `meta.yaml`.
- Write all seven `what-*.md` files using the lens questions from `drishti-lenses.json`.
- Write `README.md` with full narrative (phenomenon + seven sections).

### 3. Sync to the website

From repo root:

```bash
cd website
npm run catalog:drishti    # regenerates website/src/data/drishti.json
npm run sync:drishti       # copies lens/study content → website/src/content/drishti/
```

Or run both via build (catalog runs before sync):

```bash
cd website && npm run build
```

**Do not hand-edit** generated files under `website/src/content/drishti/studies/<slug>/` except by re-running sync after changing source in `drishti/`.

### 4. Verify

```bash
cd website
npm run catalog:drishti && npm run sync:drishti
npm run test:drishti-pass   # if pass logic touched
npm run build               # full Astro build
```

Confirm:

- Study appears in `website/src/data/drishti.json` → `studies` array.
- `website/src/content/drishti/studies/<slug>/index.mdx` exists.
- All seven lens markdown files exist under that directory.
- `/drishti/studies/<slug>` renders locally (`npm run dev`).

### 5. Optional: Drishti Pass excerpts

If the study should appear in **Drishti Pass** step excerpts, add entries under `website/src/data/drishti/pass-excerpts.json` (keyed by lens slug → study slug). This file is **manual**, not generated by sync.

## Example: `YOUR_STUDY_NAME`

```
drishti/studies/YOUR_STUDY_NAME/meta.yaml
```

```yaml
title: "Your Study Name"
slug: your-study-name
tagline: "One sentence describing the phenomenon"
relatedTopics:
  - information-theory
  - queueing-theory
tldr:
  - "Core framing bullet one."
  - "Core framing bullet two."
  - "Core framing bullet three."
atAGlance:
  flows: "Primary flows in this system"
  optimizes: "What success looks like"
  persists: "Stable structure or invariants"
  likelyFuture: "Reasonable forecast hook"
```

```
drishti/studies/YOUR_STUDY_NAME/what-exists.md
```

```markdown
**One bold takeaway sentence.**

Two or three short sentences explaining what genuinely exists vs what is agreed-upon or emergent label.
```

Repeat for `what-changes.md` through `what-will-happen.md`, then author full `README.md` per [AUTHORING.md](./AUTHORING.md).

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Editing only `website/src/content/drishti/` | Edit `drishti/studies/` and re-run sync |
| Wrong lens filename (e.g. `what_exist.md`) | Use kebab-case slugs from `drishti-lenses.json` |
| Missing `meta.yaml` | Study skipped entirely by catalog + sync |
| Invalid `relatedTopics` slug | Check `website/src/data/topics.json` |
| Fewer than 3 TL;DR bullets | Add exactly 3 in `meta.yaml` and README |
| Forgetting sync after new study | Run `npm run catalog:drishti && npm run sync:drishti` |
| Empty `atAGlance` field | Fill all four keys; Astro schema requires them |
| Duplicate slug | Slugs must be unique across studies |

## Related paths

| Path | Role |
|------|------|
| `drishti/AUTHORING.md` | Human voice, templates, ADHD-friendly rules |
| `drishti/README.md` | Overview of Drishti tree |
| `website/scripts/sync-drishti.mjs` | Source → content sync |
| `website/scripts/generate-drishti-catalog.mjs` | Builds `drishti.json` catalog |
| `website/src/content.config.ts` | Astro collection schemas for drishti content |
