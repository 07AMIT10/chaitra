# Design: Move curriculum under `topics/`

**Status:** Approved (2026-05-28)  
**Scope:** Repository layout refactor — no change to public site URLs (`/topics/<slug>`).

## Goals

1. **GitHub clarity** — Root shows a small set of top-level dirs (`website/`, `topics/`, `docs/`, …), not ~50 topic folders.
2. **Contributor clarity** — One rule: all lesson content lives under `topics/<TOPIC_NAME>/`.
3. **No broken links** — Every link we control (repo, website, CI) must resolve after the move. Old GitHub tree paths must still work for bookmarks and external references.

## Non-goals (v1)

- Category subfolders (`topics/sketches/…`)
- Auto-generating `githubTreeUrl` in MDX from catalog (follow-up)
- Changing Astro routes or slug names

## Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Primary goal | GitHub + contributors equally |
| Layout | Flat: `topics/BLOOM_FILTERS/` |
| Parent name | `topics/` |
| Link policy | **No broken links** — fix all references; keep old GitHub paths working |

## Target layout

```
chaitra/
├── README.md
├── website/
├── topics/
│   ├── README.md              # index for browsers / contributors
│   ├── BLOOM_FILTERS/
│   ├── HYPERLOGLOG/
│   └── …
├── docs/
├── tests/
└── .github/
```

Optional: remove empty root `scripts/` if still unused.

## Link compatibility strategy

GitHub does not offer HTTP redirects for `tree/main/BLOOM_FILTERS` → `tree/main/topics/BLOOM_FILTERS`. Two layers:

### Layer 1 — Update every controlled link (required)

All new canonical paths use `topics/<FOLDER>/`:

| Area | Examples |
|------|----------|
| Root + `website/README.md` | Paths, mermaid, clone instructions |
| `website/scripts/*` | `TOPICS_DIR`, `sync-code-assets` pairs |
| `website/src/content/topics/*/code.mdx` | `githubTreeUrl`, `blob/…` URLs |
| `CatalogSearch.tsx` | `GITHUB_REPO` + `/topics/${t.folder}` |
| Topic `README.md` | `cd topics/BLOOM_FILTERS`, `pytest topics/BLOOM_FILTERS/...` |
| Comments | `bloom-math.ts`, WASM crate, `.d.ts` |
| CI | `paths: topics/**` |

After edits: `npm run sync:readme` so `readme-body.md` matches.

**Verification:** Add `website/scripts/check-repo-links.mjs` (or extend catalog test) that fails CI if repo contains legacy patterns:

- `tree/main/BLOOM_FILTERS` (and other topic folders) **without** `tree/main/topics/`
- `blob/main/BLOOM_FILTERS/` without `topics/`
- `join(repoRoot, t.folder` without `TOPICS_DIR` in scripts (static review)

Run `rg 'tree/main/[A-Z_]+'` and `rg 'blob/main/[A-Z_]+'` from repo root before merge; expect zero hits except inside the checker allowlist.

### Layer 2 — Root symlinks for old GitHub paths (required)

After `git mv TOPIC topics/TOPIC`, add a **symlink at repo root** for each moved folder:

```
BLOOM_FILTERS -> topics/BLOOM_FILTERS
HYPERLOGLOG -> topics/HYPERLOGLOG
… (one per topic)
```

**Why:** Preserves `https://github.com/07AMIT10/chaitra/tree/main/BLOOM_FILTERS` (and clone paths like `chaitra/BLOOM_FILTERS`) without duplicate content or stub README clutter.

**Tradeoff:** GitHub root file list still shows topic names as symlink entries, but they are one-line pointers into `topics/`. Real content and browsing for contributors lives under `topics/`.

**Do not use:** Root stub README-only folders (re-clutters root with empty dirs).

## Catalog data model

`website/src/data/topics.json`:

- Keep `folder: "BLOOM_FILTERS"` (short name, unchanged semantics).
- Scripts resolve path: `path.join(repoRoot, "topics", t.folder)`.

`generate-catalog.mjs`:

- Set `TOPICS_DIR = "topics"`.
- Scan `path.join(repoRoot, TOPICS_DIR)` for directories with `README.md`.
- Root `skip` set: add `topics`; remove per-topic dirs from root scan.

## `topics/README.md`

Short landing page:

- Purpose of the directory
- How to add a topic (`topics/NEW_TOPIC/README.md`)
- Links to flagship topics + [catalog](https://chaitra.pages.dev/catalog)

## Implementation sequence (high level)

1. Introduce `TOPICS_DIR` constant in shared script module or duplicate in 3 scripts.
2. `mkdir topics` + `git mv` all topic directories (preserve history).
3. Create root symlinks `TOPIC -> topics/TOPIC` for each.
4. Update scripts, CI, website URLs, README paths, comments.
5. Add `topics/README.md` + update root `README.md` layout diagram.
6. Run `npm run catalog`, `sync:readme`, `sync:code`, `build`, `test:catalog`.
7. Run link checker; fix any remaining legacy paths.
8. Single PR: `refactor: move curriculum under topics/`

## Success criteria

- [ ] GitHub root: primary content under `topics/`; symlinks resolve old paths
- [ ] `topics.json` topic count unchanged
- [ ] `npm run build` green in CI with `topics/**` path filters
- [ ] Link checker reports zero legacy `tree/main/<TOPIC>` (without `topics/`)
- [ ] Bloom `/topics/bloom-filters` — Code tab GitHub links open correct files
- [ ] Catalog readme-only rows point to `…/tree/main/topics/<FOLDER>`

## Risks

| Risk | Mitigation |
|------|------------|
| Windows clones without symlink support | Document `git clone -c core.symlinks=true` or enable Developer Mode; Chaitra dev is primarily Linux/macOS |
| Duplicate root entries (symlink + `topics/`) | Accept for link safety; README explains “canonical path is `topics/`” |
| Missed hardcoded URL | CI link checker + `rg` audit in PR checklist |

## Follow-ups (later)

- `githubTopicUrl(folder)` helper used by `CodePanel` / catalog to avoid hardcoded URLs in MDX
- Category metadata in catalog (no physical subfolders)
- Consider removing root symlinks after a deprecation period (only if analytics show no old-path traffic)
