# Topics Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all curriculum folders under `topics/` and update website GitHub links + build scripts so the site and catalog keep working.

**Architecture:** `git mv` preserves history; `TOPICS_DIR = "topics"` in catalog/sync scripts; GitHub URLs use `tree/main/topics/${folder}`; `folder` in `topics.json` stays short (`BLOOM_FILTERS`).

**Tech Stack:** Node ESM scripts, Astro static site, GitHub Actions.

**Spec:** [docs/specs/2026-05-28-topics-directory-design.md](../specs/2026-05-28-topics-directory-design.md)

---

### Task 1: Move directories

**Files:** All `*/README.md` topic dirs at repo root → `topics/*`

- [ ] `mkdir -p topics`
- [ ] `git mv` each topic folder (exclude `website`, `docs`, `tests`, `scripts`, `topics`, `.github`)

### Task 2: Scripts

**Files:**
- Modify: `website/scripts/generate-catalog.mjs`
- Modify: `website/scripts/sync-readme.mjs`
- Modify: `website/scripts/sync-code-assets.mjs`
- Create: `website/scripts/check-github-links.mjs`
- Modify: `website/package.json` (add `test:links`)

`TOPICS_DIR = "topics"`; catalog scans `path.join(repoRoot, TOPICS_DIR)`; skip set includes `scripts`.

### Task 3: Website GitHub URLs

**Files:**
- Modify: `website/src/components/CatalogSearch.tsx`
- Modify: `website/src/layouts/TopicLayout.astro`
- Modify: all 9 `website/src/content/topics/*/code.mdx` (`blob/main/topics/…`, `tree/main/topics/…`)

### Task 4: Docs + topic README paths

**Files:** `README.md`, `website/README.md`, `website/DEPLOY-CLOUDFLARE.md`, `topics/BLOOM_FILTERS/README.md` (cd/pytest paths), comment paths in `bloom-math.ts`, wasm sources.

### Task 5: CI + topics index

**Files:** `.github/workflows/website-ci.yml`, `topics/README.md`

### Task 6: Verify

- [ ] `npm run catalog && npm run sync:readme && npm run sync:code && npm run test:links && npm run test:catalog && npm run build`

### Task 7: Commit

`refactor: move curriculum under topics/`
