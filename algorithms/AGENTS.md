# Algorithms section — AI agent authoring guide

Instructions for coding agents adding or editing **algorithm pages** in `algorithms/`. Human-facing overview and the add-an-algorithm steps live in [README.md](./README.md).

## What an algorithm entry is

One algorithm, taught as one mathematical object. The authored unit is exactly two files:

```
algorithms/<field>/<ALGORITHM_NAME>/
├── meta.yaml   # catalogue metadata; the sync script turns it into frontmatter
└── page.mdx    # the entire page body, in MDX, no frontmatter
```

Readers see `page.mdx` plus the hero that `meta.yaml` populates. Nothing reads the `algorithms/` folder directly: `website/scripts/sync-algorithms.mjs` copies `page.mdx` into `website/src/content/algorithms/` and prepends the frontmatter, and `generate-algorithms-catalog.mjs` turns `meta.yaml` into `website/src/data/algorithms.json`.

Never hand-edit `website/src/content/algorithms/`. Edit here and re-sync.

## `meta.yaml` schema

| Field | Required | Type | Rule |
|---|---|---|---|
| `title` | yes | string | Display name. Use the en dash: `"Union–Find"`. |
| `slug` | yes | string | kebab-case; the URL becomes `/algorithms/<field>/<slug>`. |
| `field` | yes | string | Domain axis: `programming` (later `systems`, `mathematics`, `ai`, `networking`). |
| `fieldLabel` | yes | string | Title Case label for the field. |
| `reframe` | yes | string | The one-sentence thesis. **It is not X. It is Y.** No filler. |
| `oneLine` | yes | string | One line under the title. Concrete, no jargon. |
| `tldr` | yes | list | **≥ 3** bullets. At least one gives the reader something consequential. |
| `mathBranches` | yes | list | Mathematical lenses, e.g. `[order-theory, algebra, analysis]`. |
| `primitives` | yes | list | Component names used on the page, e.g. `[LatticeClimb, PredictionPrompt]`. Every one must exist in `website/src/components/algorithms/`. |
| `attributions` | yes | list | The short catalogue list, e.g. `["Tarjan 1975", "Knuth 1973"]`. The page body carries the fuller list. |
| `relatedTopics` | no | list | Slugs that **exist** in `website/src/data/topics.json`. Check before you ship. |
| `featured` | no | bool | Hub ordering. |

Validate before syncing:

```bash
python3 -c "import yaml; yaml.safe_load(open('algorithms/<field>/<NAME>/meta.yaml'))"
```

## Page skeleton (all pages)

0. **The stake** — the first sentence carries a consequence, a magnitude, or a rival failing. Never a count of objects. "At 10^9 records, scanning costs 31.7 years; halving costs 60 comparisons."
1. **Concrete artefact** — a thing on screen before any definition. "Six objects, press merge."
2. **The named image** — one picture, named once and used consistently. If no existing panel shows it, add a `MentalImage` plate.
3. **The question** — the operational or naive framing, and why it is not the real question.
4. **The real object** — the mathematical structure the state actually is.
5. **The mathematics** — the theorem(s) and the identities, each attributed, each tied to something visible.
6. **The centrepiece** — the primitive(s) the reader drives, with one sentence telling the reader what to watch.
7. **The payoff** — what this buys and where else it appears.
8. **The afterimage** — `Afterimage`: the object, the motion, the invariant, and one number. Placed before the advanced section. This is the close the reader should be able to replay with their eyes shut.
9. **Advanced / optional** — clearly flagged and skippable. Omit if there is nothing.
10. **Attributions** — the full list, with what each is for.

## Editorial rules

| Rule | Detail |
|---|---|
| **Narrative headings** | Do not use robotic numbered titles like `## 1 · The question`. Use narrative, curiosity-driven titles tailored to the topic (`## The 2×2 Illusion`, `## The Hidden Tensor Geometry`). |
| **No echo-chamber reframe** | The layout hero already displays the `meta.yaml` reframe. Do not repeat the exact reframe as the first H2; open with a dramatic premise, historical hook, or concrete artefact. |
| **Stake, then artefact** | The first sentence carries a consequence, a magnitude, or a rival failing. The concrete artefact follows immediately. No definitions or algebra in the first screen. |
| **One image, one name** | The page names one picture and uses that name everywhere. No synonym drift. If no panel shows it, add a `MentalImage` plate. |
| **Numbers carry their arithmetic** | Every magnitude is computed, not asserted. If a number cannot be checked from the page or a cited source, cut it. |
| **Prediction placement** | A prediction moves above a panel only if its question is self-contained. If it needs the panel's data, keep it immediately after the idle panel and say "commit before you press play" above the panel. |
| **Afterimage close** | End the main argument with `Afterimage`: object, motion, invariant, one number. It is a rehearsal, not a summary. |
| **Name the boundary** | The image is honest only inside the theorem's hypotheses. Say where it breaks: negative edges, non-bipartite graphs, q ≥ 1, cycles. |
| **Direct voice, second person** | "Press merge", not "the user may press merge". |
| **≤ 3 sentences per paragraph** | Break long paragraphs; the page is scanned as much as read. |
| **Predictions as intuition traps** | At least two `PredictionPrompt`s. Pose a genuine intuition trap, paradox, or calculation surprise — never a dry textbook definition quiz. |
| **No autoplay** | Nothing moves until the reader moves it. `PaceControls` for every stepped sequence. |
| **Attributions** | Every named theorem carries its author and year. `α(n)` is Tarjan 1975, not "well known". |
| **Right strength** | Distinguish a cited theorem, a derived identity and a measured curve. Do not dress a measurement as a proof, or a proof as a measurement. |
| **No decorative maths** | Every symbol must be tied to something on screen. If you cannot point at it, cut it. |
| **No per-page CSS** | No `className`, no `<style>`. Primitives and `website/src/styles/tokens.css` own the look. |
| **No banned filler** | Banned: `delve`, `leverage`, `robust`, `comprehensive`, `seamless`, `it's worth noting`, `in conclusion`, `Furthermore,`. No em-dash pile-ups. |

## Primitives

Import by the path alias — never a relative path, because `page.mdx` is copied to a different depth:

```mdx
import LatticeClimb from "@alg/LatticeClimb.tsx";
import PredictionPrompt from "@alg/PredictionPrompt.tsx";
```

`@alg/*` maps to `website/src/components/algorithms/*`. The sync script writes each page **flat** — `website/src/content/algorithms/<slug>/index.mdx`, with no `<field>` directory — so a copy landing there reaches the components with three levels of `../`. The alias removes that class of mistake; never hand-write the relative path.

Rules:

1. **Only reference primitives that exist** in `website/src/components/algorithms/`. A page may not depend on a component that is still a promise.
2. **List every one you import in `meta.yaml` `primitives`.** The lint cross-checks.
3. **The primitive owns interaction, pacing and styling.** The page passes data and configuration, not behaviour.
4. **Need something no primitive covers?** Justify it in `meta.yaml` as `bespoke:<Name>` and build it on the shared shell. This is a last resort, not a default. A bespoke composite is **one self-contained island**: it imports the primitives it drives, owns their state and callbacks, and carries the single `client:*` directive.

Prop shapes in `website/src/components/algorithms/` (this is the real contract — match it):

| Primitive | Props |
|---|---|
| `PredictionPrompt` | `question` · `options` (string[]) · `correct` (index) · `explain` · `hint?` |
| `PaceControls` | fully controlled: `index` · `count` · `playing` · `speed` · `onIndex(i)` · `onPlayPause()` · `onReset()` · `onSpeed(s)`. Used **inside** a bespoke island component, not as an MDX wrapper — functions cannot cross an island boundary, so the island owns the state and passes these in. |
| `LatticeClimb` | `n` (3 or 4) · `caption` · `onPartition?` |
| `PotentialBank` | `trace` (`{ label, actual, delta }[]`) · `caption` — `Φ₀ = 0`, amortised `= actual + delta` |
| `SeriesChart` *(static)* | `series` (`{ name, points: [x, y][] }[]`) · `title` · `xLabel` · `yLabel` · `logY` · `annotations` · `height` |
| `GrowthTable` *(static)* | `highlight` (row key) · `rows?` (`{ n, logn?, logstarn?, alpha?, note? }[]`) · `accentColumn?` · `caption` — a fixed `n` / `log n` / `log* n` / `α(n)` / `note` comparison table with a correct default. It cannot take arbitrary columns: put other quantities in `note`, or use `SeriesChart` |
| `SemiringMatrix` | `matrix` (number[][]) · `semiring` (`plus-times` \| `min-plus` \| `or-and` \| `max-plus`) · `allowSwitch?` · `rowLabels?` · `colLabels?` · `showSteps?` · `caption` — Warshall closure under the chosen semiring; `showSteps` walks k = 0…n |
| `MonteCarloBound` | `trials?` · `bins?` · `xLabel?` · `yLabel?` · `caption`. `sample` and `bound` are **functions** and therefore cannot be passed from MDX: from a page it always uses its built-in standard-normal sampler and density. Use it only where the standard normal is the honest object; otherwise use `SeriesChart` with measured numbers. |
| `GraphCanvas` | `nodes` (`{ id, x, y, label? }[]`) · `edges` (`{ from, to, w? }[]`) · `algorithm` (`bfs` \| `dfs` \| `dijkstra` \| `bellman-ford` \| `prim` \| `kruskal` \| `toposort`) · `source?` · `target?` · `directed?` · `caption` · `height` — self-driving player with its own transport and step log |
| `DPHeatmap` | `problem` (`edit-distance` \| `lcs` \| `coin-change` \| `knapsack` \| `lis`) · `a?` · `b?` · `coins?` · `amount?` · `items?` (`{ name, w, v }[]`) · `capacity?` · `sequence?` · `caption` · `height` — hover a cell for its recurrence, and step the fill order |
| `RecursionTree` | `a` (slider range 1–8) · `b` (2–4) · `d` (0–4) · `levels?` (default 4, max 6) · `label?` · `caption` — draws `T(n) = a·T(n/b) + n^d`, sums the levels, and names the master-theorem case; the reader moves `a`, `b`, `d`. Pass values inside those slider ranges, or the panel opens on a value the reader cannot drag back to |
| `ChainAntichain` | `permutation` (number[]) · `caption` — plots `(i, pᵢ)`, colours a maximum chain and a maximum antichain, and steps patience sorting. The input need not have distinct values |
| `LPDualityDashboard` | `nodes` · `edges` (`{ from, to, capacity }[]`) · `source` · `sink` · `caption` · `height` — steps Edmonds–Karp and shows the primal value, the dual (best cut) value and the gap closing to zero |
| `IterationLab` | `problem` (`newton` \| `bisection` \| `fixed-point` \| `secant`) · `target` (`sqrt2` \| `root-of-cubic` \| `cos-fixed-point`) · `caption` — the two props set the method and the baked-in function the panel opens on; the reader can switch both. The reader drags the starting point or the bracket and steps the iterates. Shows the residual, the error against the true root, the ratio that names the order of convergence, and the geometry of the step (tangent, secant, bracket or cobweb) |
| `MatchingBoard` | `left` (string[]) · `right` (string[]) · `leftPrefs` (number[][]) · `rightPrefs` (number[][]) · `problem` (`stable-matching` \| `bipartite-matching`) · `caption` · `height` — `leftPrefs[i]` and `rightPrefs[j]` list the other side's indices, best first, and define mutual acceptability. `problem` sets the opening board; the reader can switch. Deferred acceptance steps in rounds and checks every pair for blocking; the side that proposes can be swapped to show both extremes. Augmenting-path mode steps Kuhn's search and draws the alternating path |
| `HuffmanMerge` | `symbols` (`{ name, weight }[]`) · `caption` · `height` · `greedyHint?` — the reader selects any two roots and merges them, so a non-greedy choice is priced in bits. Shows the forest, the 0/1 edge labels, the accumulated `Σ pᵢℓᵢ`, and `H` against `L` and `L*` on one axis with the `[H, H+1]` band. `greedyHint` (default true) marks the two lightest roots and adds a toggle |
| `Afterimage` *(static)* | `object` · `motion` · `invariant` · `number?` · `title?` — the recall close. Three sentences the reader can replay with their eyes shut: the picture, what moves, why the move cannot go wrong, plus one magnitude to carry away. No directive |
| `MentalImage` *(static)* | `kind` (`quicksort-ghost` \| `karatsuba-split` \| `strassen-valves` \| `mst-weld` \| `toposort-shadow`) · `title?` · `caption?` · `height?` — one plate per picture that no interactive panel shows. The plate is a figure, not another control; it carries the mathematical object, not a screenshot of the algorithm. No directive |
| `PrimitiveShell` *(static)* | `title` · `subtitle?` · `right?` · `children` · `tone?` — panel chrome for a **bespoke** island component |

`SeriesChart` and `PotentialBank` plot exactly what you pass them. They do **not** synthesise a workload: a page must supply measured or hand-computed numbers, and an empty `series` renders an explicit "no series" panel, not a chart. Do not ship an empty panel.

## Interactivity and islands

Astro server-renders React to static HTML. A component without a `client:*` directive becomes markup with no JavaScript behind it: it renders, it looks perfect, it logs nothing, and it does **nothing**. The build cannot see this.

1. **Every interactive primitive needs an explicit client directive.** Write `client:visible` on it (`client:load`, `client:idle`, `client:only` also work). `SeriesChart`, `GrowthTable`, `PrimitiveShell`, `Afterimage` and `MentalImage` are static and carry no directive.
2. **Astro islands cannot nest.** A `client:*` component rendered as a child of another `client:*` component is not hydrated. Each interactive primitive is therefore its own island; a driven composite — controls wired to a visual — must be **one self-contained component**: a bespoke island that imports the primitives, owns their state, and carries the single directive. Never wrap client children in a client parent from MDX.
3. **Only serializable props cross an island boundary.** A hydrated island receives plain data. A function prop — `onClick`, `onIndex`, any callback — is dropped between the server render and the browser, so the page compiles and the handler never fires. Pass callbacks *inside* a bespoke island, never from MDX.
4. **The lint enforces all of this.** `website/scripts/lint-algorithms-content.mjs` fails on a directive-less primitive, on a nested island, and on a primitive missing from `meta.yaml` `primitives` (or listed there but unused). Run `npm run lint:algorithms` before you build.

## MDX gotchas

| Trap | Fix |
|---|---|
| `{1,…,n}` in prose is parsed as a JSX expression and fails the build | Put it in a code span `` `{1,…,n}` `` or in maths `$\{1,\dots,n\}$`. |
| A bare `<` in prose starts a tag | Write "less than", or use maths. |
| `π_ab` in prose renders as italics | Put it in `$…$`. |
| `$$` blocks must be attributed | The lint flags a named theorem with no attribution nearby. |
| `$$` sharing its line with maths: `$$ \begin{aligned}` … `\end{aligned} $$` | remark-math takes the text after the opening `$$` as fence *meta* and discards it, and never recognises a closing `$$` that is not alone on its line. The math block then runs to end of file and **swallows the rest of the page**, which renders as literal text — with no build error and nothing in the log. Always put `$$` alone on its own line. The lint enforces this. |
| Frontmatter in `page.mdx` | Forbidden. The sync script prepends it from `meta.yaml`. |

KaTeX (`$…$`, `$$…$$`) is global in `astro.config.mjs`; do not import it.

## Verification

```bash
cd website
npm run sync:algorithms
npm run catalog:algorithms
npm run lint:algorithms
npm run build
```

Linting only your own page (useful while neighbours are mid-edit): `node scripts/lint-algorithms-content.mjs --slug <slug>`. Lint a single file standalone: `--file <path/page.mdx>`.

Then open the page in a real browser and check: zero console exceptions, zero KaTeX errors, every panel non-empty, every control responding. The build passing only proves it compiles.

## Rubric

Score 0–2 per dimension (0 fail, 1 pass, 2 exemplar). **Publish threshold: 23/30.**

| # | Dimension | 0 | 2 (exemplar) |
|---|---|---|---|
| 1 | Concrete opener | Definition or algebra first | A named, pointable artefact |
| 2 | Reframe headline | Algorithm name | A thesis a reader would repeat |
| 3 | Real object | Slogan | The mathematical structure, named and defined |
| 4 | Manipulability | Nothing the reader controls | The reader drives the central object |
| 5 | Predictions | None | ≥ 2, each scored on reveal |
| 6 | Pacing | Autoplay present | Reader controls every sequence |
| 7 | Attribution | Orphan theorem | Every claim carries author + year |
| 8 | Claim strength | Proof and measurement blurred | Each stated as what it is |
| 9 | Paragraph brevity | Any paragraph > 3 sentences | All ≤ 3 sentences |
| 10 | Maths honesty | Decorative symbols | Every symbol tied to something visible |
| 11 | Payoff | Ends on the definition | Names where else it appears |
| 12 | Housekeeping | Per-page CSS, TODO, relative import | No CSS, no TODO, alias imports only |
| 13 | Stake | No consequence; a count of objects | A specific number or consequence a reader would repeat |
| 14 | Image | No picture, or a new metaphor every section | One named image, used consistently, that *is* the mathematics |
| 15 | Recall | Ends on a definition or a summary | An `Afterimage` the reader can replay: object, motion, invariant, one number |

## The six-question test

Apply this to one page in under two minutes. Any two failures mean the page is a tour, not an explanation.

1. **Sketch.** Cover the page. Draw the object and an arrow for what moves.
2. **Belief.** What did I believe at the top that is false at the bottom?
3. **Finger.** Point at one symbol and find it on a panel.
4. **Transfer.** Predict the outcome for an input that is not on the page.
5. **Delete.** Which panel could go with no idea lost?
6. **Name.** State the page in one sentence without using the algorithm's name.

## Common mistakes

| Mistake | Fix |
|---|---|
| Opening with the definition | Screen 0 is the stake, then a concrete artefact; the algebra arrives in section 3. |
| A beautiful thing the reader only watches | Make the central object manipulable; add `PaceControls`. |
| Symbols on the page that map to nothing | Tie each symbol to a panel, or delete it. |
| Importing a primitive that does not exist yet | Check `website/src/components/algorithms/` first. |
| Relative import (`../../../components/...`) | Use `@alg/<Name>.tsx`. |
| `relatedTopics` slug that is not real | Check `website/src/data/topics.json`. |
| Editing `website/src/content/algorithms/` by hand | Edit `algorithms/` and re-sync. |
| Claiming the bound without attributing it | `α(n)` is Tarjan 1975; the lower bound is Tarjan 1979, Fredman–Saks 1989. |
| Confusing `α(n)` with `log* n` | `α(10^80) = 4`; `log*_2(10^80) = 5`. Keep them in separate columns. |
| Leaving a `TODO` in `page.mdx` | `grep -c TODO algorithms/<field>/<NAME>/page.mdx` must be 0. |
| A primitive with no client directive | Add `client:visible`; without it Astro ships static HTML and the control never works. |
| Nesting one island inside another | Islands cannot nest. Make the composite a single bespoke component; drop the inner directive. |
| Passing a callback to an island | Function props do not cross the boundary. Move the state into a bespoke island that owns the handlers. |
| `$$ \begin{aligned}` on one line | `$$` must be alone on its line: `$$`, then the maths, then `$$`. Sharing the line silently swallows the rest of the page as literal text. |
| A primitive in `meta.yaml` but not used (or used but not listed) | Keep `meta.yaml` `primitives` and the page's imports/uses in exact agreement — `bespoke:<Name>` entries are exempt. |
| Opening by counting objects ("Six vertices sit…") | Lead with the consequence; the count is a setting, not a stake. |
| A new metaphor in every section | One image, one name. Delete the synonyms, not the image. |
| A magnitude with no arithmetic | Compute it from the page's own data or a cited source, and state the units. |
| A prediction above a panel it depends on | Keep it after the idle panel; put "commit before you press play" above the panel. |
| No `Afterimage` | Add object, motion, invariant, one number. It is the close, not an appendix. |
| A `MentalImage` plate that only illustrates | The plate must be the mathematical object, not a screenshot of the algorithm. If it decorates, cut it. |

## Related paths

| Path | Role |
|---|---|
| `algorithms/README.md` | Human overview, add-an-algorithm steps |
| `algorithms/_TEMPLATE/` | Filled-in Binary Search starting point |
| `algorithms/programming/UNION_FIND/` | The first real page (batch 0) |
| `website/src/components/algorithms/` | The shared primitive library |
| `website/src/components/algorithms/Afterimage.tsx` | The recall close used on every page |
| `website/src/components/algorithms/MentalImage.tsx` | Five plates for pictures no panel shows |
| `website/scripts/sync-algorithms.mjs` | Source → content sync |
| `website/scripts/lint-algorithms-content.mjs` | Content quality lint |
| `docs/specs/2026-10-18-algorithms-section-design.md` | Authoritative design |
| `docs/plans/2026-10-18-algorithms-section.md` | Plan and definition of done |
