# Algorithms section — implementation plan

Date: 2026-10-18
Design: `docs/specs/2026-10-18-algorithms-section-design.md`

## Batching model

Architecture is built and proven **before** content is parallelised. Once the pipeline is green, content
proceeds in batches of parallel subagents, one algorithm per agent, with `npm run build` gating each batch.

Nothing in `topics/` or `drishti/` is modified.

## Batch 0 — foundations (parallel, non-overlapping file ownership)

| Workstream | Owns | Delivers |
|---|---|---|
| **P — pipeline** | `website/scripts/generate-algorithms-catalog.mjs`, `sync-algorithms.mjs`, `lint-algorithms-content.mjs`, `website/src/content.config.ts`, `website/src/layouts/AlgorithmsLayout.astro`, `website/src/pages/algorithms/**`, `website/package.json`, `website/tsconfig.json`, `.github/workflows/website-ci.yml`, `website/scripts/check-github-links.mjs`, `website/src/styles/tokens.css`, `website/src/layouts/BaseLayout.astro`, `website/src/pages/index.astro` | The section renders end to end |
| **B — primitives** | `website/src/components/algorithms/**`, `website/src/styles/algorithms.css` | The shared interactive library |
| **C — content** | `algorithms/**` | `_TEMPLATE/`, `README.md`, `AGENTS.md`, and the first algorithm (`programming/UNION_FIND`) |

Dependencies: P must add a tsconfig path alias so primitives can be imported from any depth.
C authors against the primitive contract fixed in P/B/C prompts; B implements exactly that contract.
B verifies against a temporary demo route, then removes it.

### Gate for Batch 0
1. `cd website && npm run catalog:algorithms && npm run sync:algorithms && npm run build` → exit 0.
2. Page count is baseline (72) + the new algorithms pages.
3. The union-find page renders in a real browser with zero console exceptions.

## Batch 1 — the core consensus set (first parallel content batch)

Algorithms that appear in every canonical DSA list. Grouped so that shared primitives are reused:

| Batch | Algorithms | Primitives exercised |
|---|---|---|
| 1a | Binary search · Merge sort · Quicksort | RecursionTree, InvariantRibbon, MonteCarloBound |
| 1b | Dijkstra · Bellman–Ford · Floyd–Warshall | SemiringMatrix, DPHeatmap, SeriesChart |
| 1c | BFS/DFS · Topological sort · Kruskal/Prim | LatticeClimb, ChainAntichain, SeriesChart |
| 1d | Hash tables · Heaps · BST/balanced trees | GrowthTable, PotentialBank, MonteCarloBound |
| 1e | Dynamic programming (edit distance, knapsack, LIS) · Greedy/matroids · Huffman | DPHeatmap, ChainAntichain, MonteCarloBound |
| 1f | KMP · Aho–Corasick · Rabin–Karp | bespoke + shared shell |
| 1g | Euclidean algorithm · Fast exponentiation · Sieve · Miller–Rabin | GrowthTable, bespoke |
| 1h | FFT · Karatsuba/Strassen · Union–find (done) | SemiringMatrix, RecursionTree |

## Batch 2 — the long tail

Max-flow/min-cut, matching (Hungarian, Hopcroft–Karp, Gale–Shapley), DP optimisations, computational
geometry, PageRank/spectral, compression (Huffman, arithmetic, BWT), streaming/probabilistic
(Bloom, HyperLogLog, Count-Min, MinHash), randomised (Karger, reservoir sampling), advanced strings
(suffix arrays/automata), numerical (Newton, gradient descent), LP (simplex), matroids.

## Definition of done, per algorithm

1. `meta.yaml` validates: `title`, `slug`, `field`, `reframe`, `oneLine`, `tldr` (≥3), `mathBranches`,
   `primitives`, `attributions`.
2. `page.mdx` follows the skeleton: concrete artefact → the question → the real object → the mathematics
   → the centrepiece → payoff → advanced/optional → attributions.
3. At least one genuinely manipulable interaction; at least one prediction prompt.
4. Every mathematical claim attributed; no decorative symbols.
5. No per-page CSS; primitives and tokens only.
6. Passes `npm run build`, and renders in a browser with zero console exceptions and no empty panels.

## Risks

- **Primitive over-generality.** The three spikes needed bespoke logic (flow simulation, RSK insertion,
  partition lattice) that a generic prop API cannot cover. Mitigation: primitives own the *shell,
  pacing, charting and scoring*; algorithms may add one small bespoke component on the shared shell
  rather than re-implementing 90 KB of chrome. Bespoke components require justification in the page's
  `meta.yaml` (`primitives` entry `bespoke:<name>`).
- **Attribution drift.** The spikes already produced one Dilworth↔Mirsky swap. Mitigation: the content
  lint checks that every `$$` block is attributed where a named theorem is invoked.
- **Maths quality at scale.** Parallel agents hallucinate. Mitigation: the lint plus a review pass;
  prefer classical, citable results.
