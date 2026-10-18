# Algorithms section — design

Date: 2026-10-18
Status: approved to build (user directed "do all of it"), architecture calls recorded below.

## 1. Intent

Add a third content section to Chaitra, **`algorithms/`**, sitting beside `topics/` and `drishti/`.

The section teaches algorithms through **raw mathematics** rather than computer science. The unit of
explanation is a mathematical object — a recurrence, a semiring, a lattice, a potential function, a
poset, a linear program — not a code trace. It must be **interactive**: the reader manipulates the
mathematical object itself, predicts before revealing, and controls the pace. The target reaction is
*"damn, I didn't know we could see it like this."*

Why: there is a fifty-year tradition of mathematics-of-algorithms (Sedgewick–Flajolet, Knuth, Wilf,
Bird–de Moor) that is almost entirely *text and proof*, and a rich visualisation tradition (VisuAlgo,
Bostock, Red Blob) that is almost entirely *operational*. Interactive exposition whose primary unit is
a mathematical object is genuinely under-served. This section occupies that gap.

## 2. Goals

- A browsable catalogue of algorithms, each with a maths-first interactive page.
- A **shared primitive library** so pages are authored maths + configured primitives, not bespoke files.
- Every page: concrete artefact first, abstraction second; a prediction prompt; reader-controlled pace.
- Every mathematical claim attributed (Tarjan 1975, Dilworth 1950, Ford–Fulkerson 1956, …).
- Fits the existing Astro pipeline exactly as `drishti/` does.

## 3. Non-goals

- A code-first or operations-first visualiser (VisuAlgo exists).
- Passive autoplaying animations or "proof movies".
- Replacing or editing `topics/` or `drishti/`.
- Per-page bespoke CSS. Design tokens only.

## 4. Anti-goals (would make this a failure even if it works)

- A page that opens with definitions and algebra before a concrete artefact.
- A page where nothing is manipulable — a beautiful animation the reader watches.
- Mathematics that is decorative: symbols not tied to something visible on screen.
- Duplicating the design tokens or the layout chrome per page.
- Shipping unverified pages: a page that throws on load, or a chart that renders empty.

## 5. Architecture calls (made by the builder, per user direction to proceed)

**C1 — "field" is the domain axis; mathematics is the lens.**
The user described "multiple subsections pertaining to the field it belongs to… starting with
programming". So the directory axis is the *domain* (`programming`, later `systems`, `mathematics`,
`ai`, `networking`), and each algorithm is **also tagged with its mathematical branch** so the catalogue
can be filtered either way. This satisfies the literal request and loses no content. Reversible: if the
user prefers mathematics as the primary axis later, the tag data is already present.

**C2 — a shared primitive library, not per-page components.**
The three spikes averaged 90 KB of self-contained HTML each, re-deriving the palette by hand. At
25–50 algorithms that is unmaintainable. Pages are authored markdown plus configured instances of
shared React primitives; the primitives own the interaction and the styling.

**C3 — reuse the `drishti` pipeline shape, not the `topics` shape.**
`drishti` uses real Astro content collections, a sync script, a generated catalogue and a content
lint. `topics` uses committed MDX plus raw `import()` and has known staleness defects. The algorithms
section copies the drishti shape and inherits the guard that fails loudly if the collection is empty.

**C4 — maths renders through the existing global pipeline.**
`remark-math` + `rehype-katex` are already global in `astro.config.mjs`, so `$…$` and `$$…$$` work in
any authored markdown. No new dependency, no new CSP entry.

## 6. Information architecture

```
algorithms/
├── README.md                  # what this section is; how to add an algorithm
├── AGENTS.md                  # agent-facing authoring checklist + rubric
├── _TEMPLATE/                 # copy this to start a new algorithm
│   ├── meta.yaml
│   └── page.mdx
└── programming/
    ├── UNION_FIND/
    │   ├── meta.yaml          # frontmatter the catalogue reads
    │   └── page.mdx           # the whole page, in MDX
    └── …
```

Underscore-prefixed directories are skipped by every script (the `drishti` `_TEMPLATE` convention).

**Authored unit is exactly two files: `meta.yaml` + `page.mdx`.** Drishti splits a study across seven
markdown files because its page renders seven accordions; algorithms pages are continuous, so the author
writes one MDX document. MDX (not MD) is deliberate: it lets the author import and configure primitives
inline, pass functions as props, and place interactive blocks exactly where the prose needs them. The
sync script copies `page.mdx` verbatim and prepends frontmatter derived from `meta.yaml`.

### 6.1 `meta.yaml` schema

```yaml
title: "Union–Find"
slug: union-find
field: programming
fieldLabel: "Programming"
mathBranches: [order-theory, algebra, analysis]
reframe: "It is not an algorithm. It is a partition, climbing a lattice."
oneLine: "Two operations on the partitions of a finite set."
tldr:
  - "The state is a partition; union is the join in the partition lattice."
  - "The physicist's potential pays for expensive finds in advance."
  - "With both repairs the bound is α(n) — slower-growing than any logarithm."
primitives: [lattice-climb, potential-bank, policy-compare, growth-table]
attributions: ["Tarjan 1975", "Knuth 1973"]
relatedTopics: [hyperloglog]
featured: true
```

`reframe` is a required editorial field: the one-sentence "it is not X, it is Y" thesis.

### 6.2 Page skeleton (all pages)

The three spikes independently converged on this, so it is now the template:

0. **Concrete artefact** — start with a thing, not a definition.
1. **The question** — the naive/DP/operational statement.
2. **The real object** — the mathematical structure underneath.
3. **The mathematics** — the theorem(s), attributed.
4. **The centrepiece** — the primitive(s) the reader drives.
5. **The payoff** — what this buys, and where else it appears.
6. **Advanced / optional** — clearly flagged, skippable.
7. **Attributions.**

## 7. The primitive library

`website/src/components/algorithms/` — each primitive is a React island, styled from
`website/src/styles/tokens.css`, with no page-specific content.

| Primitive | What it makes manipulable | Used by |
|---|---|---|
| `SemiringMatrix` | one triple-loop, ⊕/⊗ toggled across (+,×), (min,+), (OR,AND), (max,+) | Floyd–Warshall, transitive closure, Viterbi |
| `DPHeatmap` | a DP table with incoming recurrence edges lit on hover | edit distance, knapsack, LIS |
| `RecursionTree` | per-level node costs and a mass ribbon; nudge a/b exponents | merge sort, binary search, Strassen |
| `PotentialBank` | Φ as a balance that must not go negative; amortised vs actual | union–find, dynamic array, splay |
| `LatticeClimb` | a Hasse diagram with a monotone map climbing to a least fixpoint | union–find, CRDT merge, dataflow |
| `PolicyCompare` | several strategies on one adversarial workload, cumulative work plotted | union–find, union-by-rank, cache policies |
| `ChainAntichain` | the same point set coloured as a max chain and an antichain cover | LIS, Dilworth, patience sorting |
| `CardGameTableau` | greedy placement animated into a Young tableau | LIS / patience sorting |
| `MonteCarloBound` | empirical histogram against a closed-form bound curve | randomised quicksort, Karger, Tracy–Widom |
| `LPDualityDashboard` | primal and dual objectives converging, gap plotted | max-flow/min-cut, assignment |
| `InvariantRibbon` | a predicate that must hold in every frame; violation mode | loop invariants, binary search |
| `PermutationCycles` | a permutation as orbits and cycle decomposition | sorting, hashing, FFT roots |
| `GrowthTable` | α(n) vs log n vs log* n vs n, with a highlight row | union–find, Ackermann, complexity |
| `PredictionPrompt` | lock a guess, reveal later, score it | every page |
| `PaceControls` | step / play / pause / reset / speed | every page |

Primitives are built and proven incrementally; a page may only reference primitives that exist.

## 8. Pipeline

Mirrors `drishti`:

| Piece | File |
|---|---|
| Catalogue | `website/scripts/generate-algorithms-catalog.mjs` → `website/src/data/algorithms.json` |
| Content sync | `website/scripts/sync-algorithms.mjs` → `website/src/content/algorithms/<field>/<slug>/` |
| Content lint | `website/scripts/lint-algorithms-content.mjs` |
| Collection | `algorithms` in `website/src/content.config.ts` (distinct glob base) |
| Layout | `website/src/layouts/AlgorithmsLayout.astro` |
| Routes | `website/src/pages/algorithms/index.astro`, `algorithms/[field]/index.astro`, `algorithms/[field]/[slug].astro` |
| Nav/footer/home | `BaseLayout.astro` lines 16/32/37–46; `pages/index.astro` pillars + stats |
| CI | `.github/workflows/website-ci.yml` — add `algorithms/**` to both `paths:`, add sync + lint steps |
| Link check | `website/scripts/check-github-links.mjs` — extend the allow-list lookahead with `algorithms/` |

`package.json` gains `catalog:algorithms`, `sync:algorithms`, `lint:algorithms`, and the sync step is
inserted into `build` **before** `astro build`.

## 9. Verification (non-negotiable)

1. `npm run build` must pass — this proves every page compiles and the collection validates.
2. Every page must be opened in a real browser and checked for: zero console exceptions, KaTeX errors
   = 0, every panel non-empty, and every interactive control responding.
3. The `chrome-devtools` MCP is broken here (it wants `/opt/google/chrome/chrome`); use the CDP driver
   at `/tmp/opencode/verify2.cjs` against `/home/amit/.local/bin/google-chrome`.
4. Mathematical claims are reviewed, not trusted: the spikes already surfaced one attribution swap
   (Dilworth ↔ Mirsky).

## 10. Batching

Content is produced in batches by parallel subagents, architecture-first:

- **Batch 0** (serial, by the builder): pipeline, layout, routes, nav, CI, and the first primitives —
  proven end-to-end with one algorithm before any parallel content work begins.
- **Batch 1…n**: one subagent per algorithm, each producing `meta.yaml` + section markdown + primitive
  configuration, never editing shared infrastructure. `npm run build` gates each batch.

## 11. Left to the builder

Primitive prop APIs; exact CSS; how much of each page is markdown vs JSX; whether a page may embed a
raw interactive block; the field list beyond `programming`; and the rubric in `algorithms/AGENTS.md`.
