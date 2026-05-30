# Technical Review V2 Remainder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every gap identified in the post-upgrade audit: site shell polish, math test coverage, stream Play/Pause, SVG viz upgrades, preview-topic promotion, Python reference code, preview mini-labs, learning path, and theme toggle.

**Architecture:** Work in isolated git worktree `feat/review-v2-remainder`. Reuse existing lab primitives (`LabShell`, `PredictReveal`, `useStreamPlayback` hook extracted once). Promote 17 no-lab topics to `readme-only` in `topics.json` (preserve Mermaid narratives). Add math tests via `*-math.test.mjs` discovered by existing `test:math` glob.

**Tech Stack:** Astro 5, React 19, TypeScript, Node test runner (`tsx --test`), CSS tokens, inline SVG in lab components.

---

## File map (high level)

| Area | Primary paths |
|------|----------------|
| Site shell | `website/src/layouts/BaseLayout.astro`, `TopicLayout.astro`, `public/favicon.svg` |
| Tokens / theme | `website/src/styles/tokens.css`, `website/src/components/ThemeToggle.tsx` |
| Stream playback | `website/src/hooks/useStreamPlayback.ts`, `*Lab.tsx` with sliders |
| Math tests | `website/src/lib/*-math.test.mjs` |
| BitGrid | `website/src/components/lab/BitGridCanvas.tsx` |
| Catalog / topics | `website/src/data/topics.json`, `website/scripts/generate-catalog.mjs` |
| Learning path | `website/src/components/LearningPath.tsx`, `website/src/pages/index.astro` |
| Preview labs | `website/src/components/preview/*Lab.tsx`, `content/topics/*/index.mdx` |
| Python refs | `PAGERANK/`, `QUEUEING_THEORY/`, `GOSSIP_PROTOCOLS/`, `RATE_LIMITING/`, `TINYLFU/` |

---

### Task 0: Worktree and branch

**Files:**
- Create: git worktree at `chaitra/.worktrees/review-v2-remainder`

- [ ] **Step 1:** Verify `.worktrees/` is gitignored
- [ ] **Step 2:** `git worktree add .worktrees/review-v2-remainder -b feat/review-v2-remainder`
- [ ] **Step 3:** All subsequent tasks run from worktree root `chaitra/.worktrees/review-v2-remainder`

---

### Task 1: Favicon and SEO completion

**Files:**
- Create: `website/public/favicon.svg`
- Modify: `website/src/layouts/BaseLayout.astro`

- [ ] **Step 1:** Add minimal SVG favicon (Chaitra “C” on accent `#3d9eff`, dark bg `#0f1419`)
- [ ] **Step 2:** Add `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` in `<head>`
- [ ] **Step 3:** `npm run build` — pass
- [ ] **Step 4:** Commit `feat(website): add favicon`

---

### Task 2: Site footer and typographic scale tokens

**Files:**
- Modify: `website/src/layouts/BaseLayout.astro`
- Modify: `website/src/styles/tokens.css`
- Create: `website/src/styles/footer.css` (optional, or inline in BaseLayout)

- [ ] **Step 1:** Add `--font-size-sm: 0.875rem`, `--font-size-base: 1rem`, `--font-size-lg: 1.125rem`, `--font-size-xl: 1.5rem` to `tokens.css`
- [ ] **Step 2:** Add `<footer>` with links: Catalog, GitHub repo `https://github.com/07AMIT10/chaitra`, license note
- [ ] **Step 3:** Build passes; commit `feat(website): site footer and font-size tokens`

---

### Task 3: Theme toggle (dark default + light mode)

**Files:**
- Create: `website/src/components/ThemeToggle.tsx`
- Modify: `website/src/styles/tokens.css` (`.theme-light` overrides)
- Modify: `website/src/layouts/BaseLayout.astro`

- [ ] **Step 1:** Add `[data-theme="light"]` color overrides on `:root` variables
- [ ] **Step 2:** `ThemeToggle` reads/writes `localStorage` key `chaitra-theme`, sets `document.documentElement.dataset.theme`
- [ ] **Step 3:** Mount `ThemeToggle` in header with `client:visible`
- [ ] **Step 4:** Commit `feat(website): light/dark theme toggle`

---

### Task 4: Topic TOC sidebar

**Files:**
- Modify: `website/src/layouts/TopicLayout.astro`
- Modify: `website/src/styles/narrative.css`

- [ ] **Step 1:** Add `<aside class="topic__toc">` with links to `#narrative`, `#lab`, `#code`, first `h2` in readme (via slot or JS-free anchor list in layout)
- [ ] **Step 2:** CSS grid: TOC sticky on wide screens, hidden on narrow
- [ ] **Step 3:** Commit `feat(website): topic page TOC sidebar`

---

### Task 5: Homepage hero visual

**Files:**
- Modify: `website/src/components/home/HomeHero.astro`
- Modify: `website/src/styles/home.css`

- [ ] **Step 1:** Add inline SVG illustration (probabilistic nodes / sketch motif, no external assets)
- [ ] **Step 2:** Commit `feat(website): homepage hero illustration`

---

### Task 6: BitGridCanvas responsive cap

**Files:**
- Modify: `website/src/components/lab/BitGridCanvas.tsx`

- [ ] **Step 1:** Cap visible columns at 128 (sample indices like `CmsHeatmap`)
- [ ] **Step 2:** Add `aria-label` note when sampled
- [ ] **Step 3:** Commit `fix(website): cap BitGridCanvas width on large m`

---

### Task 7: useStreamPlayback hook + Play aria-labels

**Files:**
- Create: `website/src/hooks/useStreamPlayback.ts`
- Modify: `BloomFilterLab.tsx`, `CountMinSketchLab.tsx`, `TinyLFULab.tsx`, `GossipProtocolsLab.tsx`, `ConsensusSystemsLab.tsx`

- [ ] **Step 1:** Extract shared `useStreamPlayback({ max, intervalMs, onTick })`
- [ ] **Step 2:** Add `aria-label` on all Play/Pause buttons (describe lab name)
- [ ] **Step 3:** Commit `refactor(website): stream playback hook and a11y labels`

---

### Task 8: Play/Pause on stream-slider labs (batch 1)

**Files:**
- Modify: `HyperLogLogLab.tsx`, `StreamingAnalyticsLab.tsx`, `StreamingAlgorithmsLab.tsx`, `RandomEarlyDetectionLab.tsx`

- [ ] **Step 1:** Wire `useStreamPlayback` or local `isPlaying` for each lab’s primary scrubber
- [ ] **Step 2:** Build; commit `feat(website): Play/Pause on HLL and streaming labs`

---

### Task 9: Play/Pause on stream-slider labs (batch 2)

**Files:**
- Modify: `RateLimitingLab.tsx`, `MapReduceLab.tsx`, `ProbabilityTheoryLab.tsx`, `MonteCarloSystemsLab.tsx`

- [ ] **Step 1:** Same pattern as Task 8
- [ ] **Step 2:** Commit `feat(website): Play/Pause on remaining stream labs`

---

### Task 10: Promote preview topics to readme-only

**Files:**
- Modify: `website/src/data/topics.json` (17 slugs with `hasLab: false`)
- Modify: `website/scripts/generate-catalog.mjs` — preserve `readme-only` when `prior?.status === "readme-only"`

- [ ] **Step 1:** Set `status: "readme-only"` for all 17 preview topics that have `index.mdx`
- [ ] **Step 2:** Update `resolveStatus` to respect `readme-only` like golden
- [ ] **Step 3:** Run `npm run catalog` — verify; commit `chore(website): promote prose topics to readme-only`

---

### Task 11: Math tests — flagship sketches (bloom, cms, hll already exist; add gossip, pagerank, ring, queue)

**Files:**
- Create: `website/src/lib/gossip-math.test.mjs`, `pagerank-math.test.mjs`, `ring-math.test.mjs`, `queue-math.test.mjs`

- [ ] **Step 1:** Write tests mirroring `bloom-math.test.mjs` style (import functions, assert numeric bounds)
- [ ] **Step 2:** `npm run test:math` — all pass
- [ ] **Step 3:** Commit `test(website): math tests for gossip pagerank ring queue`

---

### Task 12: Math tests — batch 2 (rate, red, pot2, mapreduce, tinylfu)

**Files:**
- Create: five `*-math.test.mjs` files for corresponding libs

- [ ] **Step 1–3:** Same as Task 11; commit `test(website): math tests batch 2`

---

### Task 13: Math tests — batch 3 (remaining libs)

**Files:**
- Create tests for all remaining `*-math.ts` without a test file (~15 files)

- [ ] **Step 1:** Grep `src/lib/*-math.ts` vs `*-math.test.mjs`; fill gaps
- [ ] **Step 2:** `npm run test:math` — 100% lib coverage
- [ ] **Step 3:** Commit `test(website): complete math lib test coverage`

---

### Task 14: SVG upgrade — HyperLogLogLab

**Files:**
- Modify: `HyperLogLogLab.tsx`, `HyperLogLogLab.css`

- [ ] **Step 1:** Replace register CSS bars with SVG bars + SE overlay line
- [ ] **Step 2:** Commit `feat(website): SVG register chart for HyperLogLog lab`

---

### Task 15: SVG upgrade — InformationTheoryLab + ProbabilityTheoryLab

**Files:**
- Modify: `InformationTheoryLab.tsx`, `ProbabilityTheoryLab.tsx` (+ css)

- [ ] **Step 1:** SVG histogram with labeled axes; probability theory overlay theoretical PMF curve
- [ ] **Step 2:** Commit `feat(website): SVG charts for IT and probability labs`

---

### Task 16: SVG upgrade — QueueingTheoryLab + MonteCarloSystemsLab

**Files:**
- Modify: respective `*Lab.tsx`

- [ ] **Step 1:** Queue timeline SVG; MC convergence line chart with reference envelope
- [ ] **Step 2:** Commit `feat(website): SVG for queueing and monte-carlo labs`

---

### Task 17: SVG upgrade — remaining bar-heavy labs (Spam, PowerOfTwo, TokenRouting, MixtureOfExperts, RED)

**Files:**
- Modify: 5 lab components

- [ ] **Step 1:** Convert primary bar viz to SVG where still `height: %` only
- [ ] **Step 2:** Commit `feat(website): SVG bar charts for five labs`

---

### Task 18: Python — PageRank

**Files:**
- Create: `PAGERANK/pagerank.py`
- Create: `website/src/assets/code/pagerank.py.txt`
- Modify: `PAGERANK/README.md` (code section if needed)
- Modify: `topics.json` for pagerank `hasPython`, `hasCode`

- [ ] **Step 1:** ~40-line power iteration on toy graph
- [ ] **Step 2:** `sync:readme`; add `code.mdx` if missing
- [ ] **Step 3:** Commit `feat(pagerank): add Python reference implementation`

---

### Task 19: Python — Queueing, Gossip, Rate limiting, TinyLFU

**Files:**
- Create: `queueing_theory.py`, `gossip_sim.py`, `rate_limiter.py`, `tinylfu_demo.py` in topic folders
- Sync assets + topics.json flags for each

- [ ] **Step 1:** Minimal runnable scripts per README formulas
- [ ] **Step 2:** Commit `feat: Python reference implementations for four topics`

---

### Task 20: Preview lab — LLM temperature

**Files:**
- Create: `website/src/lib/llm-temperature-math.ts`, `LlmTemperatureLab.tsx`
- Modify: `content/topics/large-language-models/index.mdx`, `topics.json` (`hasLab: true`, `labTier: "B"`, status stays `readme-only` or new `golden`? — use **Tier B lab**, status `live` only if user wants lab; plan: add lab, keep `readme-only` + `hasLab: true`)

- [ ] **Step 1:** Slider T → softmax on toy logits, sample distribution viz
- [ ] **Step 2:** PredictReveal with options; commit

---

### Task 21: Preview lab — Statistical learning bias-variance

**Files:**
- Create: `StatisticalLearningLab.tsx`, `statistical-learning-math.ts`
- Modify: `statistical-learning/index.mdx`

- [ ] **Step 1:** Three-fit scatter + adjustable polynomial degree
- [ ] **Step 2:** Commit

---

### Task 22: Preview labs — batch (remaining 15 topics, Tier B mini)

**Files:**
- Create: one small lab per preview topic OR shared archetype labs linked from index (minimum: **distributed-systems** CAP picker, **llm-infrastructure** KV memory meter, **reinforcement-learning** MDP stepper)

For **EVERYTHING** requirement: implement all 15 remaining as minimal labs (~150–200 LOC each) using shared `PreviewLabShell.tsx`.

- [ ] **Step 1:** Create `website/src/components/preview/PreviewLabShell.tsx`
- [ ] **Step 2:** Add 15 `*PreviewLab.tsx` files + wire `index.mdx` + update `topics.json` `hasLab: true`, `labTier: "B"` for each preview slug
- [ ] **Step 3:** `npm run build`; commit `feat(website): Tier B preview topic labs`

---

### Task 23: Learning path component

**Files:**
- Create: `website/src/data/learning-path.json`
- Create: `website/src/components/LearningPath.tsx`
- Modify: `website/src/pages/index.astro`

- [ ] **Step 1:** Define 5 checkpoints (Probability → Sketches → Distributed → ML → Agents)
- [ ] **Step 2:** localStorage progress checkmarks
- [ ] **Step 3:** Commit `feat(website): learning path on homepage`

---

### Task 24: Final verification

**Files:** (none)

- [ ] **Step 1:** `npm run test:math && npm run test:catalog && npm run build`
- [ ] **Step 2:** Update `website/docs/golden-topic-checklist.md` or new `docs/review-v2-signoff.md`
- [ ] **Step 3:** Commit `docs: review v2 remainder sign-off`

---

## Self-review (plan vs audit)

| Audit gap | Task(s) |
|-----------|---------|
| Gamification 30 labs | Already done — no task |
| test:math glob | Done — Tasks 11–13 expand |
| Favicon | Task 1 |
| Footer, font tokens | Task 2 |
| Theme toggle | Task 3 |
| TOC sidebar | Task 4 |
| Hero art | Task 5 |
| BitGrid overflow | Task 6 |
| Play aria + more Play labs | Tasks 7–9 |
| Preview → readme-only | Task 10 |
| SVG upgrades | Tasks 14–17 |
| Python expansion | Tasks 18–19 |
| Preview topic labs | Tasks 20–22 |
| Learning path | Task 23 |
| Gossip SVG | Already done |
| Bayesian SVG | Already done |

## Execution handoff

Plan saved. Use **subagent-driven-development** from worktree `feat/review-v2-remainder`.
