# Content UX & hybrid homepage — design spec

**Date:** 2026-05-30  
**Status:** Approved (Approach **3** + homepage **D**)  
**Related:** `website/docs/content-ux-audit.md`, `.research/edu-content-ux-homepage.json`

---

## Goal

Make Chaitra feel like a **cohesive learning product**: topic pages render math and diagrams correctly; the homepage sells depth (hero + path + catalog + featured labs); golden topics use Standard narrative components (callouts, collapsible math).

## Non-goals (v1)

- Starlight/Nextra migration
- HF Spaces embeds (defer to later)
- Rich topic-specific React diagrams for all 51 topics (only 2–3 golden)
- Restructuring README source into YAML frontmatter

---

## Architecture (Approach 3 — three phases)

### Phase A — Rendering pipeline (P0)

| Layer | Change |
|-------|--------|
| Astro markdown | `remark-math` + `rehype-katex`; KaTeX CSS in `BaseLayout` |
| Mermaid | Client `MermaidDiagram` + remark/rehype pass on ` ```mermaid ` fences (no headless CI dependency) |
| Diagrams | ` ```ascii ` / diagram fences → `.diagram` pre (no Shiki) via sync or rehype |
| Sync | `sync-readme.mjs` strips leading `# title`; optional demote duplicate MDX lead `##` |
| Typography | `narrative.css` on `.topic__narrative` — rhythm, lists, `max-width`, code blocks |

**Success:** Bloom + transformer-attention pages show rendered math, Mermaid prereq graph, single H1.

### Phase B — Hybrid homepage (D)

| Section | Content |
|---------|---------|
| **Hero** | Title, tagline, primary CTA “Start learning”, secondary “Browse catalog” |
| **Beginner path** | 4–6 ordered cards (Probability → Bloom → CMS → HLL → …) from `topics.json` / curated list |
| **Featured interactives** | 3 lab cards with link + badge (Bloom, Count-Min, Gossip) |
| **Explore** | Compact stats (51 topics, N live labs) + link to `/catalog` |

**Files:** `src/pages/index.astro`, `src/components/home/*`, `src/styles/home.css`

### Phase C — MDX design system (Standard)

| Component | Purpose |
|-----------|---------|
| `Callout` | note / warning / prereq / aha |
| `Details` | collapsible long math or shell blocks (wrapper over `<details>`) |
| `Diagram` | monospace diagram without Shiki |

Register in `astro.config.mjs` via `mdx()` component map or import in golden `index.mdx` only.

**Golden topics (v1):** `bloom-filters`, `transformer-attention`, `next-gen-ai-agents`

---

## Data flow

```text
BLOOM_FILTERS/README.md
  → sync-readme.mjs (strip H1, fence renames)
  → readme-body.md
  → index.mdx (lead + ReadmeBody + Lab)
  → remark-math / rehype-katex / mermaid transform
  → static HTML on Cloudflare Pages
```

---

## Homepage IA (D — hybrid)

- **Primary audience:** curious learners + backend engineers (dual track unchanged)
- **Above fold:** value prop + CTAs (not empty 90% canvas)
- **Below fold:** beginner path → featured labs → catalog teaser
- **Catalog page:** keep existing list; optional filters later (out of v1)

---

## Error handling & performance

- Mermaid: render on client `client:visible`; show fallback `<pre>` if JS disabled
- KaTeX: fail build on invalid math in dev; log file path
- No extra Pyodide on narrative-only pages
- Lab islands unchanged (`client:visible`); homepage hero may use static screenshot or mini static viz (no heavy WASM on home)

---

## Testing

- `npm run build` after each phase
- Manual: `/topics/bloom-filters`, `/topics/transformer-attention` — math + mermaid visible
- `npm run test:catalog` unchanged
- Optional: snapshot test that built HTML contains `class="katex"` on bloom page

---

## Rollout order

1. Phase A (blocking)
2. Phase B (homepage)
3. Phase C (components + 3 golden topics)
4. Re-run `npm run sync:readme` for all topics after sync strip-H1 lands
