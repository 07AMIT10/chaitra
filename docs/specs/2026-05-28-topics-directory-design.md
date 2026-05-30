# Design: Move curriculum under `topics/`

**Status:** Approved (2026-05-28, amended)  
**Scope:** Repository layout refactor — no change to public site URLs (`/topics/<slug>`).

## Goals

1. **GitHub clarity** — Root shows a small set of top-level dirs (`website/`, `topics/`, `docs/`, …), not ~50 topic folders.
2. **Contributor clarity** — One rule: all lesson content lives under `topics/<TOPIC_NAME>/`.
3. **Working links on the site** — After the move, users on [chaitra.pages.dev](https://chaitra.pages.dev) can open GitHub from Code tabs, catalog, and related UI and land on the correct repo paths (`topics/BLOOM_FILTERS/…`). Same for in-repo docs and scripts we maintain.

## Non-goals (v1)

- Category subfolders (`topics/sketches/…`)
- Auto-generating `githubTreeUrl` in MDX from catalog (follow-up)
- Changing Astro routes or slug names
- **Backward compatibility for old GitHub URLs** (e.g. `tree/main/BLOOM_FILTERS` without `topics/`) — bookmarks or external links to pre-move paths may 404; that is acceptable.
- Root stub folders or symlinks at repo root

## Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Primary goal | GitHub + contributors equally |
| Layout | Flat: `topics/BLOOM_FILTERS/` |
| Parent name | `topics/` |
| Link policy | Update **website + in-repo** GitHub/code links to `topics/…`; no root symlinks |

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

## Link updates (required)

Canonical paths: `topics/<FOLDER>/`.

| Area | Why it matters |
|------|----------------|
| `website/src/content/topics/*/code.mdx` | Code tab “view on GitHub” / source URLs |
| `CatalogSearch.tsx` | Catalog rows that link to GitHub for readme-only topics |
| `website/scripts/*` | `sync:readme`, `sync:code`, catalog scan paths |
| Root + `website/README.md` | Contributor clone/run instructions |
| Topic `README.md` under `topics/` | `cd`, `pytest` paths (synced to site Story) |
| Comments referencing old paths | Accuracy for maintainers (optional but included in PR) |
| `.github/workflows/website-ci.yml` | Trigger on `topics/**` |

After path edits: `npm run sync:readme` so `readme-body.md` matches topic READMEs.

**Verification:** Grep / small check script before merge:

- No `tree/main/BLOOM_FILTERS` (etc.) without `topics/` in `website/`
- No `blob/main/BLOOM_FILTERS/` without `topics/` in `website/`
- Optional: `npm run test:links` script in CI to prevent regressions

## Catalog data model

`website/src/data/topics.json`:

- Keep `folder: "BLOOM_FILTERS"` (short name, unchanged semantics).
- Scripts resolve path: `path.join(repoRoot, "topics", t.folder)`.

`generate-catalog.mjs`:

- Set `TOPICS_DIR = "topics"`.
- Scan `path.join(repoRoot, TOPICS_DIR)` for directories with `README.md`.
- Root `skip` set includes `topics`; do not scan old topic names at repo root.

## `topics/README.md`

Short landing page:

- Purpose of the directory
- How to add a topic (`topics/NEW_TOPIC/README.md`)
- Links to flagship topics + [catalog](https://chaitra.pages.dev/catalog)

## Implementation sequence (high level)

1. Introduce `TOPICS_DIR` in catalog / sync scripts.
2. `mkdir topics` + `git mv` all topic directories (preserve history).
3. Update scripts, CI, **all website GitHub URLs**, README paths, comments.
4. Add `topics/README.md` + update root `README.md` layout diagram.
5. Run `npm run catalog`, `sync:readme`, `sync:code`, `build`, `test:catalog`.
6. Grep audit for legacy GitHub paths in `website/`.
7. Single PR: `refactor: move curriculum under topics/`

## Success criteria

- [ ] GitHub root: lesson folders only under `topics/` (no duplicate topic dirs at root)
- [ ] `topics.json` topic count unchanged
- [ ] `npm run build` green in CI with `topics/**` path filters
- [ ] Bloom **Code** tab — GitHub links open `topics/BLOOM_FILTERS/` and correct `blob/…` files
- [ ] Catalog GitHub-only links use `…/tree/main/topics/<FOLDER>`
- [ ] No legacy `tree/main/<TOPIC>` URLs in `website/` (without `topics/`)

## Risks

| Risk | Mitigation |
|------|------------|
| Missed hardcoded URL in `code.mdx` | Grep checklist + optional CI link test |
| Broken sync paths | Run full build + sync after move |

## Follow-ups (later)

- `githubTopicUrl(folder)` helper used by `CodePanel` / catalog to avoid hardcoded URLs in MDX
- Category metadata in catalog (no physical subfolders)
