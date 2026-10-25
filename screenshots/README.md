# Screenshots

Curated captures of the **algorithms** section.

`algorithms/` documents two stages. The three prototype spikes (Union–Find, LIS, max-flow) tested
the thesis before anything shipped. The **shipped section** captures below were taken from the real
built pages in `website/dist`, each driven to a meaningful state before capture.

## Shipped section (24 algorithms, built pages)

Captured with headless Chrome over CDP at 1500 px wide, after hydrating every island and driving
each panel (stepped fills, run-to-completion flows, the `(+,×)` semiring selected). The
`quicksort` panel was deliberately omitted: it renders the same balanced `a=2,b=2,d=1` tree as the
merge-sort shot, so it would duplicate it.

| File | What it shows |
|---|---|
| `algorithms/section-hub.png` | The section hub: thesis, field card, mathematics filter tags |
| `algorithms/binary-search-halving.png` | The `a=1,b=2,d=0` recurrence panel: one chain, balanced case, `Θ(log n)` |
| `algorithms/merge-sort-recursion.png` | The `a=2,b=2,d=1` panel: flat ribbon, balanced case, `Θ(n log n)` |
| `algorithms/strassen-rank-tensor.png` | The `a=7,b=2,d=2` panel: 7-way fan-out, `×count` bands, `Θ(n^2.807)` |
| `algorithms/karatsuba-rank.png` | The `a=3,b=2,d=1` panel: 3-ary tree, growing ribbon, leaf-dominated |
| `algorithms/knapsack-grid.png` | The 0/1-knapsack table mid-fill with the `58` trace readout |
| `algorithms/lcs-staircase.png` | The LCS table mid-fill, headers clean, current cell highlighted |
| `algorithms/coin-change-greedy.png` | The coin-change table with play/Trace controls and the `min coins = 2` readout |
| `algorithms/edit-distance-heatmap.png` | The edit-distance table half-filled, wavefront visible |
| `algorithms/floyd-warshall-semiring.png` | The semiring switch on `(+,×)`, `k = 4/4`, closure grid reading diagonal 1, A→D 3 |
| `algorithms/dijkstra-settled-labels.png` | The seven-town map, transport, distance table, settle-order quiz |
| `algorithms/max-flow-duality.png` | Edmonds–Karp run to completion: primal 7 = dual 7, gap 0 |
| `algorithms/union-find-lattice-page.png` | The shipped partition-lattice panel (`B₄`, rank `ρ = n − |π|`) |
| `algorithms/lis-chains-page.png` | The shipped chains/antichains panel (Mirsky's theorem made visible) |

## The WHY pass (2026-10-25)

The editorial pass that put a stake before the setup, one named image on every page, and an
`Afterimage` close. Plates are clipped from the built page at 2×; openings are 1500 px viewport
captures after the first heading.

| File | What it shows |
|---|---|
| `algorithms/plate-quicksort-ghost.png` | The ghost tree: random pivots at depth `1.39 log₂ n` vs sorted input as a chain; `2,018,053` against `4,999,950,000` comparisons, `2,478×` worse |
| `algorithms/plate-karatsuba-split.png` | Schoolbook's four products against Karatsuba's three; the middle measurement covers the cross terms, and subtracting the two squares isolates them |
| `algorithms/plate-strassen-seven-measurements.png` | The signed contribution table: seven measurements `M1…M7`, four outputs `C11…C22`, a sign wherever a measurement is added or removed |
| `algorithms/plate-mst-weld.png` | The welding archipelago: five violet welds, total weight 6, and the cut at the last Prim weld `C–F` whose only crossing edges are `C–F` (1) and `E–C` (2) |
| `algorithms/plate-toposort-shadow.png` | The six-task DAG with all seven arrows and all five linear extensions; `5` valid schedules out of `6! = 720` |
| `algorithms/opening-toposort.png` | The stake, the named image, the plate, the queue-chip instruction, and the commit line above the panel |
| `algorithms/opening-mst.png` | `Exactly 2 of the 24 spanning trees on this six-vertex board weigh 6` — the enumeration stake before either algorithm is named |
| `algorithms/opening-quicksort.png` | Sorted input with a first-element pivot costs `5×10⁹` comparisons at `100,000` keys; the `2,478×` average-case damage |
| `algorithms/opening-dfs.png` | The two clocks: one pass classifies every arc, one back edge certifies a cycle, and one low-link number adds SCCs |
| `algorithms/opening-lcs.png` | The quadratic table against the exponential count: `4,225` cells for two 64-character strings with `2³²` distinct LCSs |
| `algorithms/opening-union-find.png` | The naive relabel writes `10^18` labels at `n = 10^9`; the close contrasts that with `4×10^9` parent steps |
| `algorithms/afterimage-quicksort.png` | The close itself: object, motion, invariant, and the one number to carry away |

## Prototypes

`algorithms/` documents three throwaway spikes built to test a thesis: that algorithms in this
curriculum should be explained through **raw mathematics** rather than computer science, and that the
mathematical object itself should be manipulable. Each spike is a single self-contained interactive
page built outside the repo; these are the panels worth looking at.

Nothing in the repo links these yet — they exist so a README (or the eventual section) can use them.

## Union–Find

| File | What it shows |
|---|---|
| `algorithms/union-find-hero.png` | The reframe, and the concrete opening artefact (six objects, one merge) |
| `algorithms/union-find-partition-lattice.png` | The real state object: a partition climbing the lattice of partitions |
| `algorithms/union-find-potential-bank.png` | The physicist's potential as a bank account that cannot go negative |
| `algorithms/union-find-inverse-ackermann.png` | Four repair policies on one adversarial workload; the α(n) table (`α(10⁸⁰)=5`) |

## LIS / patience sorting

| File | What it shows |
|---|---|
| `algorithms/lis-hero.png` | The reframe, the motivation, and the prediction prompt |
| `algorithms/lis-chains-antichains.png` | Climbs are chains, drops are antichains — the same picture, two colourings |
| `algorithms/lis-card-game.png` | Patience sorting as a card game that executes Mirsky's theorem |
| `algorithms/lis-tableau-tracy-widom.png` | The pile tops are row 1 of the RSK tableau; 3000 random permutations against Tracy–Widom |

## Max-flow / min-cut

| File | What it shows |
|---|---|
| `algorithms/max-flow-hero.png` | The concrete question: how much gets through? |
| `algorithms/max-flow-lp-dual.png` | The linear program, written down; the dual derived in three moves |
| `algorithms/max-flow-duality-closed.png` | The gap closed: primal 23 = dual 23, watched rather than asserted |
| `algorithms/max-flow-integrality.png` | A continuous optimum that lands on the lattice — total unimodularity |

## Provenance

Captured 2026-10-18 with headless Chrome 155 over CDP, at 1500 px wide, after driving each page to a
meaningful state (the Tracy–Widom histogram is populated; the flow has been run to completion).

The WHY-pass captures were taken 2026-10-25 with the same Chrome binary. Plates are 2× element clips;
openings are 1500 px viewport captures centred on the first heading.

The `chrome-devtools` MCP could not be used — it looks for Chrome at `/opt/google/chrome/chrome`, which
does not exist on this machine. The real binary is `/home/amit/.local/bin/google-chrome`.
