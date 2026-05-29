# Content UX & hybrid homepage — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Fix narrative rendering (KaTeX, Mermaid, diagrams, typography) and ship a hybrid homepage (hero + beginner path + featured labs + catalog CTA).

**Architecture:** Phase A markdown pipeline in `astro.config.mjs` + sync script; Phase B new home components; Phase C MDX design system on 3 golden topics.

**Tech Stack:** Astro 5, MDX, remark-math, rehype-katex, KaTeX CSS, mermaid (client), existing React labs.

**Spec:** `docs/superpowers/specs/2026-05-28-content-ux-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `astro.config.mjs` | remark/rehype plugins, MDX component map |
| `src/layouts/BaseLayout.astro` | KaTeX CSS link |
| `src/styles/narrative.css` | Topic prose typography |
| `src/styles/home.css` | Homepage layout |
| `scripts/sync-readme.mjs` | Strip H1, diagram fence handling |
| `src/components/mdx/MermaidDiagram.tsx` | Client mermaid render |
| `src/components/mdx/Callout.astro` | Admonitions |
| `src/components/mdx/Diagram.astro` | Non-Shiki diagram wrapper |
| `src/components/home/HomeHero.astro` | Hero section |
| `src/components/home/BeginnerPath.astro` | Curriculum cards |
| `src/components/home/FeaturedLabs.astro` | Lab promo cards |
| `src/pages/index.astro` | Compose homepage |
| `src/data/beginner-path.json` | Ordered slugs for path |

---

### Task 1: Math pipeline (KaTeX)

**Files:**
- Modify: `website/package.json`
- Modify: `website/astro.config.mjs`
- Modify: `website/src/layouts/BaseLayout.astro`

- [ ] Install: `cd website && npm install remark-math rehype-katex katex`

- [ ] Update `astro.config.mjs`:

```js
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  // ...
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
```

- [ ] In `BaseLayout.astro` `<head>` add:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
```

- [ ] Build: `npm run build` — expect PASS
- [ ] Verify bloom dist HTML contains `class="katex"` (grep dist)
- [ ] Commit: `feat(website): render LaTeX with remark-math and KaTeX`

---

### Task 2: Mermaid client rendering

**Files:**
- Create: `website/src/components/mdx/MermaidDiagram.tsx`
- Create: `website/src/plugins/remark-mermaid-to-component.mjs` (or rehype handler)
- Modify: `website/astro.config.mjs`

- [ ] `npm install mermaid`

- [ ] `MermaidDiagram.tsx`: props `{ chart: string }`, `useEffect` + `mermaid.run`, `client:only` or used from MDX

- [ ] Remark plugin: transform `code` nodes with `lang=mermaid` → MDX/HTML placeholder that maps to component (or use `rehype-raw` + custom element — prefer MDX `import MermaidDiagram` injection via sync for v1: wrap fences in sync-readme as `<MermaidDiagram client:visible chart={...} />` is heavy; use unified visit in remark plugin emitting `<div class="mermaid">` + client script in layout for `.mermaid` — **simplest v1:** rehype plugin outputting `<pre class="mermaid">` and `BaseLayout` script `mermaid.run({ nodes: document.querySelectorAll('.mermaid') })` on load)

**v1 implementation (explicit):**

```js
// remark-mermaid-client.mjs — export function that visits code lang===mermaid → html <pre class="mermaid">CODE</pre>
```

```astro
// BaseLayout.astro bottom — only on topic pages OR global
<script>
  import mermaid from 'mermaid';
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  await mermaid.run({ querySelector: '.mermaid' });
</script>
```

- [ ] Build + verify bloom prerequisites render SVG, not Shiki `data-language=mermaid`
- [ ] Commit: `feat(website): client-side Mermaid for topic narratives`

---

### Task 3: Sync + diagram fences

**Files:**
- Modify: `website/scripts/sync-readme.mjs`
- Create: `website/src/styles/narrative.css`
- Modify: `website/src/layouts/TopicLayout.astro`

- [ ] `sync-readme.mjs`:
  - After read, if body starts with `# `, remove first ATX heading line
  - Map ` ```ascii ` and diagram ` ```text ` blocks that look like diagrams (lines with `[` `]` `→`) → wrap as ` ```diagram ` OR leave as `text` but add markdown HTML comment `<!-- diagram -->` before fence for CSS hook

- [ ] `narrative.css`:
  - `.topic__narrative pre[data-language=text]`, `pre.diagram` — `white-space: pre-wrap`, no token colors, background `var(--surface)`
  - Prose: `h2` margin, `ul` spacing, `p` line-height 1.65

- [ ] TopicLayout: import `narrative.css`, class `topic__narrative prose`

- [ ] `npm run sync:readme && npm run build`
- [ ] Commit: `fix(website): strip duplicate README titles and style diagrams`

---

### Task 4: MDX Callout + Details (Standard)

**Files:**
- Create: `website/src/components/mdx/Callout.astro`
- Create: `website/src/components/mdx/Details.astro`
- Modify: `website/astro.config.mjs` — `mdx({ components: { Callout, Details } })` if supported

- [ ] Callout variants: `note`, `warning`, `prereq`, `aha` with border-left accent

- [ ] Document usage in `website/docs/lab-archetypes.md` appendix

- [ ] Optional: add one Callout to `bloom-filters/index.mdx` lead as example

- [ ] Commit: `feat(website): add Callout and Details MDX components`

---

### Task 5: Hybrid homepage (D)

**Files:**
- Create: `website/src/data/beginner-path.json`
- Create: `website/src/components/home/HomeHero.astro`
- Create: `website/src/components/home/BeginnerPath.astro`
- Create: `website/src/components/home/FeaturedLabs.astro`
- Create: `website/src/styles/home.css`
- Modify: `website/src/pages/index.astro`

- [ ] `beginner-path.json` slugs: `probability-theory`, `bloom-filters`, `count-min-sketch`, `hyperloglog`, `gossip-protocols`, `consistent-hashing`

- [ ] `FeaturedLabs`: bloom-filters, count-min-sketch, gossip-protocols (read titles from topics.json in frontmatter at build — use import topics.json)

- [ ] Home layout: CSS grid, hero centered-left, stats row (`51 topics`, count live from topics.json filter)

- [ ] Primary CTA → `/topics/bloom-filters`, secondary → `/catalog`

- [ ] `npm run build` — home page non-empty, links work
- [ ] Commit: `feat(website): hybrid homepage with path and featured labs`

---

### Task 6: Golden topic polish

**Files:**
- Modify: `website/src/content/topics/transformer-attention/index.mdx` (if needed)
- Modify: `website/src/content/topics/bloom-filters/index.mdx` — remove redundant `##` if sync strips H1

- [ ] Re-sync readme for golden three
- [ ] Fix nested `<p>` in any stub MDX (markdown only in lab placeholders)
- [ ] Manual check built HTML for transformer-attention math
- [ ] Commit: `chore(website): golden topic narrative polish`

---

### Task 7: Verification

- [ ] `npm run catalog && npm run sync:readme && npm run build`
- [ ] `npm run test:catalog`
- [ ] Document in `website/README.md` — math/mermaid deps, rebuild after README change

---

## Task dependency graph

```text
Task 1 (math) → Task 2 (mermaid) → Task 3 (sync+CSS)
Task 4 (callouts) parallel after Task 3
Task 5 (home) parallel after Task 1
Task 6 after 1-4
Task 7 last
```
