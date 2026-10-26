/**
 * Optional mastery layer for The Long Repair.
 *
 * Three Deck Diagnostics sit at the close of each deck; six Overclock
 * challenges sit after the campaign. This file is data only: no React, no
 * level module, no storage, no route, no timer, no streak, no leaderboard.
 *
 * The layer is voluntary. `masteryUnlocked` reads campaign progress; campaign
 * progress never reads mastery. A challenge that is not `playable` must not be
 * linked from the hub: the definitions below are contracts for later composite
 * modules, not playable missions.
 *
 * Design record: /tmp/opencode/mastery-spec.md.
 */

import type { Progress } from "./progress";
import { isActComplete, isCampaignComplete } from "./progression";
import type { Act, LevelMeta } from "./types";

/** The campaign's installed shape. Guards partial builds from fake unlocks. */
export const EXPECTED_CAMPAIGN_SIZE = 24;
export const EXPECTED_DECK_SIZE = 8;

/** Bumped when the shape of a challenge definition changes. */
export const MASTERY_VERSION = 1 as const;

/** One honest line for the hub. Never a call to action by itself. */
export const MASTERY_NOTE = "Optional. The campaign does not wait on it.";

/** Copy rules the hub may render beside the layer. */
export const MASTERY_RULES = [
  "No mission, act, or ending is gated on a diagnostic or an Overclock.",
  "No leaderboard, loot, streak, timer, notification, or daily reset.",
  "A clean run is a local record of a stricter solve, not a grade.",
] as const;

export type BoardKind =
  | "graph"
  | "array"
  | "grid"
  | "tree"
  | "pairing"
  | "number"
  | "formula";

export type MasteryKind = "diagnostic" | "overclock";

/** Learning-science features this challenge deliberately uses. */
export type MasteryEvidence =
  | "retrieval"
  | "interleaving"
  | "spacing"
  | "desirable-difficulty"
  | "worked-example-fading"
  | "expertise-reversal";

export type MasteryPrereq =
  | { kind: "act-complete"; act: Act }
  | { kind: "campaign-complete" };

export type MasteryAlgorithm = {
  /** Campaign slug this system comes from. */
  slug: string;
  name: string;
  /** Campaign mission number, for the brief's "revisits" line. */
  mission: number;
  page: string;
  /** What this system contributes to the combined move. */
  role: string;
};

export type MasteryScenarioSeed = {
  from: string;
  code: string;
  /** Two or three short lines, ending on a question. */
  lines: readonly string[];
  question: string;
};

export type MasteryMoveBudget = {
  /** Moves in a clean run. */
  clean: number;
  /** Last move count that still reaches the terminal state. */
  solve: number;
};

export type MasteryLimit = {
  label: string;
  value: number;
  unit: string;
  /** Stricter value for a clean run, when it differs from the solve value. */
  clean?: number;
};

export type MasterySuccess = {
  /** One sentence with the exact terminal state and the solve budget. */
  criterion: string;
  /** The invariant the board checks after the last move. */
  invariant: string;
  /** The certificate the player must produce, when there is one. */
  certificate?: string;
};

export type MasteryConstraint = {
  id: string;
  label: string;
  description: string;
};

export type MasteryChallenge = {
  id: string;
  kind: MasteryKind;
  /** Canonical display order: diagnostics 1–3, then Overclock 1–6. */
  order: number;
  title: string;
  /** "DECK 1 DIAGNOSTIC" or "OVERCLOCK 01". */
  label: string;
  /** Diagnostic deck; null for a post-campaign Overclock. */
  act: Act | null;
  prereq: MasteryPrereq;
  /** Systems being combined. Shown in the brief, not on the play surface. */
  algorithms: readonly MasteryAlgorithm[];
  board: BoardKind;
  /** Estimate, never a countdown. */
  minutes: number;
  /** One-line hub summary. */
  summary: string;
  /** One sentence with the exact win condition. */
  objective: string;
  scenarioSeed: MasteryScenarioSeed;
  success: MasterySuccess;
  /** The one self-imposed rule that turns a solve into a clean run. */
  optionalConstraint: MasteryConstraint;
  /** How the two systems constrain each other, in one sentence. */
  coupling: string;
  /** Earlier campaign moves the challenge deliberately reuses. */
  reuses: readonly { mission: number; slug: string; move: string }[];
  /** Scaffolding: ghost move, seeded first move, or cold start. */
  fading: "ghost" | "seeded" | "cold";
  moves: MasteryMoveBudget;
  limits: readonly MasteryLimit[];
  evidence: readonly MasteryEvidence[];
  /**
   * Honest integration flag. All definitions are false until a composite
   * module exists; the hub must filter on this and never render a dead button.
   */
  playable: boolean;
};

const MERGE_SORT_PAGE = "/algorithms/programming/merge-sort";
const BINARY_SEARCH_PAGE = "/algorithms/programming/binary-search";
const TOPOLOGICAL_SORT_PAGE = "/algorithms/programming/topological-sort";
const DIJKSTRA_PAGE = "/algorithms/programming/dijkstra";
const BIPARTITE_MATCHING_PAGE = "/algorithms/programming/bipartite-matching";
const MAXIMUM_FLOW_PAGE = "/algorithms/programming/maximum-flow";
const MST_PAGE = "/algorithms/programming/minimum-spanning-tree";
const UNION_FIND_PAGE = "/algorithms/programming/union-find";
const STRASSEN_PAGE = "/algorithms/programming/strassen-matrix-multiplication";
const KARATSUBA_PAGE = "/algorithms/programming/karatsuba-multiplication";
const QUICKSORT_PAGE = "/algorithms/programming/quicksort";
const NEWTON_PAGE = "/algorithms/programming/newton-method";
const FIXED_POINT_PAGE = "/algorithms/programming/fixed-point-iteration";
const FLOYD_WARSHALL_PAGE = "/algorithms/programming/floyd-warshall";
const BELLMAN_FORD_PAGE = "/algorithms/programming/bellman-ford";
const HUFFMAN_PAGE = "/algorithms/programming/huffman-coding";

export const MASTERY_CHALLENGES = [
  // -------------------------------------------------------------------------
  // Deck Diagnostics — one after each act, 2–3 minutes, optional
  // -------------------------------------------------------------------------
  {
    id: "diagnostic-ribbon-index",
    kind: "diagnostic",
    order: 1,
    title: "The Ribbon Index",
    label: "DECK 1 DIAGNOSTIC",
    act: 1,
    prereq: { kind: "act-complete", act: 1 },
    algorithms: [
      {
        slug: "merge-sort",
        name: "Merge Sort",
        mission: 7,
        page: MERGE_SORT_PAGE,
        role: "order the eight ribbons to depth 3",
      },
      {
        slug: "binary-search",
        name: "Binary Search",
        mission: 2,
        page: BINARY_SEARCH_PAGE,
        role: "isolate tile 8 in the sorted ribbon",
      },
    ],
    board: "array",
    minutes: 3,
    summary: "Sort the loom, then probe the index; one comparison ledger.",
    objective:
      "Sort the eight ribbons to depth 3, then isolate tile 8; the loom and the probe share 21 comparisons, and a clean run uses 20.",
    scenarioSeed: {
      from: "SIGNAL LOOM",
      code: "DIAGNOSTIC 01",
      lines: [
        "The loom holds the same eight ribbons: 1, 3, 2, 7, 4, 6, 5, 8. The crack is tile 8.",
        "A probe on an unsorted ribbon reads a stale index. The sort and the search draw from one 21-comparison ledger.",
        "Seventeen comparisons buy the sorted ribbon. Three probes buy the tile.",
      ],
      question: "Which split opens the sequence, and which tile do you probe first?",
    },
    success: {
      criterion:
        "One sorted ribbon 1 2 3 4 5 6 7 8 and tile 8 found within 21 comparisons; a clean run uses 20 and three probes.",
      invariant:
        "A probe is legal only in a sorted bracket; each probe halves the live range, and every merge comparison is charged to the same ledger.",
      certificate: "The final probe names tile 8; the ledger reads 17 plus the probes.",
    },
    optionalConstraint: {
      id: "no-undo",
      label: "NO UNDO",
      description: "Every accepted split and probe stands.",
    },
    coupling:
      "The search cannot start until the loom is one sorted run; a probe before the zip reads a stale index, and the 17-comparison sort leaves exactly the probe budget.",
    reuses: [
      { mission: 7, slug: "merge-sort", move: "split runs to depth 3" },
      { mission: 2, slug: "binary-search", move: "probe the live bracket" },
    ],
    fading: "ghost",
    moves: { clean: 10, solve: 11 },
    limits: [
      { label: "comparisons", value: 21, clean: 20, unit: "comparisons" },
      { label: "depth", value: 3, unit: "levels" },
    ],
    evidence: [
      "retrieval",
      "interleaving",
      "spacing",
      "desirable-difficulty",
      "worked-example-fading",
    ],
    playable: false,
  },
  {
    id: "diagnostic-night-schedule",
    kind: "diagnostic",
    order: 2,
    title: "The Night Schedule",
    label: "DECK 2 DIAGNOSTIC",
    act: 2,
    prereq: { kind: "act-complete", act: 2 },
    algorithms: [
      {
        slug: "topological-sort",
        name: "Topological Sort",
        mission: 4,
        page: TOPOLOGICAL_SORT_PAGE,
        role: "emit a stage only when every prerequisite is emitted",
      },
      {
        slug: "dijkstra",
        name: "Dijkstra's Algorithm",
        mission: 9,
        page: DIJKSTRA_PAGE,
        role: "settle the least-starting stage on the frontier",
      },
    ],
    board: "graph",
    minutes: 3,
    summary: "Emit the night shift and stamp the critical path.",
    objective:
      "Emit the six stages by settling the least-starting available stage, stamp each earliest start, and name the critical path; the last stage finishes at 11.",
    scenarioSeed: {
      from: "NIGHT CREW",
      code: "DIAGNOSTIC 02",
      lines: [
        "Six stages wait on one crew: A 2 h, B 3 h, C 6 h, D 2 h, E 1 h, F 2 h.",
        "A→C, A→D, B→D, C→E, D→E, D→F, E→F. A stage starts only when every predecessor has finished.",
        "A is already on the board at 0. The longest chain, not the busiest stage, sets the finish.",
      ],
      question: "Which stage starts next, and which chain sets the finish?",
    },
    success: {
      criterion:
        "A least-start frontier order with starts A 0, B 0, C 2, D 3, E 8, F 9; the certificate names A→C→E→F and a finish of 11.",
      invariant:
        "A stage is emittable only at in-degree zero; its label is the maximum finish of its predecessors, and the final label is the longest path.",
      certificate: "The critical path A→C→E→F.",
    },
    optionalConstraint: {
      id: "no-hints",
      label: "NO HINTS",
      description: "Recall the frontier rule; reveal nothing.",
    },
    coupling:
      "The topological order decides which stages are available; the least earliest-start label decides which one settles next, so a wrong frontier moves the finish.",
    reuses: [
      { mission: 4, slug: "topological-sort", move: "emit an in-degree-zero stage" },
      { mission: 9, slug: "dijkstra", move: "settle the least frontier label" },
    ],
    fading: "seeded",
    moves: { clean: 6, solve: 7 },
    limits: [
      { label: "makespan", value: 11, unit: "hours" },
      { label: "stages", value: 6, unit: "stages" },
    ],
    evidence: [
      "retrieval",
      "interleaving",
      "spacing",
      "desirable-difficulty",
      "worked-example-fading",
    ],
    playable: false,
  },
  {
    id: "diagnostic-manifest-cut",
    kind: "diagnostic",
    order: 3,
    title: "The Manifest Cut",
    label: "DECK 3 DIAGNOSTIC",
    act: 3,
    prereq: { kind: "act-complete", act: 3 },
    algorithms: [
      {
        slug: "bipartite-matching",
        name: "Bipartite Matching",
        mission: 20,
        page: BIPARTITE_MATCHING_PAGE,
        role: "place crew through augmenting paths",
      },
      {
        slug: "maximum-flow",
        name: "Maximum Flow",
        mission: 18,
        page: MAXIMUM_FLOW_PAGE,
        role: "draw the residual cut that certifies the placement count",
      },
    ],
    board: "pairing",
    minutes: 3,
    summary: "Place four crew, then draw the cut that certifies them.",
    objective:
      "Place four of the five crew in the five berths, then draw the cut; flow 4 and cut 4 must agree.",
    scenarioSeed: {
      from: "CREW MANIFEST",
      code: "DIAGNOSTIC 03",
      lines: [
        "Five crew, five berths. The berth Vex is cold. Ben can take Wren or Xiu; Ana Wren or Yara; Cid Xiu; Dee Yara or Zara; Eli Zara.",
        "A placement is a unit of flow. A berth can hold one. The manifest is tight only when no augmenting path remains.",
        "The cut is the boundary of the set the residual flow can still reach, not the berths you happened to use.",
      ],
      question: "Who gets the fourth berth, and where does the cut fall?",
    },
    success: {
      criterion:
        "Four placements; the cut has capacity 4 and excludes the cold berth Vex; no augmenting path remains.",
      invariant:
        "Max flow equals min cut; a cut is tight only when its capacity equals the placement count.",
      certificate: "The residual reachable set and its cut boundary; the four active berths.",
    },
    optionalConstraint: {
      id: "one-cut",
      label: "ONE CUT",
      description: "Draw the cut once; a rejected cut opens the run.",
    },
    coupling:
      "The matching supplies the flow; the cut certifies it. A cut drawn before the fourth placement is not tight, so the board rejects it until flow and cut agree.",
    reuses: [
      { mission: 20, slug: "bipartite-matching", move: "place or flip an augmenting path" },
      { mission: 18, slug: "maximum-flow", move: "certify the cut" },
    ],
    fading: "cold",
    moves: { clean: 5, solve: 7 },
    limits: [
      { label: "flow", value: 4, unit: "placements" },
      { label: "cut", value: 4, unit: "placements" },
    ],
    evidence: [
      "retrieval",
      "interleaving",
      "spacing",
      "desirable-difficulty",
      "expertise-reversal",
    ],
    playable: false,
  },

  // -------------------------------------------------------------------------
  // Overclock — six post-campaign adversarial/optimality variants
  // -------------------------------------------------------------------------
  {
    id: "overclock-diagonal-bridge",
    kind: "overclock",
    order: 4,
    title: "The Diagonal Bridge",
    label: "OVERCLOCK 01",
    act: null,
    prereq: { kind: "campaign-complete" },
    algorithms: [
      {
        slug: "minimum-spanning-tree",
        name: "Minimum Spanning Tree",
        mission: 10,
        page: MST_PAGE,
        role: "weld a minimum grid",
      },
      {
        slug: "union-find",
        name: "Union–Find",
        mission: 1,
        page: UNION_FIND_PAGE,
        role: "certify the cycle that excludes the diagonal",
      },
    ],
    board: "graph",
    minutes: 4,
    summary: "A minimum grid where the cheapest diagonal never ships.",
    objective:
      "Weld a minimum grid of weight 4, then mark the diagonal A–C as in no minimum tree and the bridge C–E as in every one.",
    scenarioSeed: {
      from: "POWER GRID",
      code: "OVERCLOCK 01",
      lines: [
        "Five domes, six bridges: A–B 1, B–C 1, C–D 1, D–A 1, A–C 2, C–E 1.",
        "The diagonal A–C looks cheap at 2. It is in no minimum grid; the bridge C–E is in every one.",
        "A weld is certified by a cut; an exclusion is certified by a cycle.",
      ],
      question: "Which four bridges carry the grid, and which bridge can never ship?",
    },
    success: {
      criterion:
        "A spanning grid of weight 4; A–C marked NONE with the cycle A–B–C–A; C–E marked ALL with the cut {E}.",
      invariant:
        "The cut property admits the lightest bridge across a cut; the cycle property excludes the unique heaviest edge on a cycle.",
      certificate: "Cycle A–B–C–A for A–C; cut {E} for C–E.",
    },
    optionalConstraint: {
      id: "no-uncertified-exclusion",
      label: "NO UNCERTIFIED EXCLUSION",
      description: "Every bridge left out carries a cycle or cut certificate.",
    },
    coupling:
      "Union–Find decides whether a weld closes a cycle; the cut certificate decides whether an excluded bridge could have been in some minimum grid.",
    reuses: [
      { mission: 10, slug: "minimum-spanning-tree", move: "weld the lightest bridge across the cut" },
      { mission: 1, slug: "union-find", move: "relabel a block to detect a cycle" },
    ],
    fading: "cold",
    moves: { clean: 7, solve: 8 },
    limits: [
      { label: "grid weight", value: 4, unit: "mass" },
      { label: "welds", value: 4, unit: "bridges" },
    ],
    evidence: ["retrieval", "interleaving", "desirable-difficulty", "expertise-reversal"],
    playable: false,
  },
  {
    id: "overclock-zero-block",
    kind: "overclock",
    order: 5,
    title: "The Zero Block",
    label: "OVERCLOCK 02",
    act: null,
    prereq: { kind: "campaign-complete" },
    algorithms: [
      {
        slug: "strassen-matrix-multiplication",
        name: "Strassen's Algorithm",
        mission: 24,
        page: STRASSEN_PAGE,
        role: "route the block products",
      },
      {
        slug: "karatsuba-multiplication",
        name: "Karatsuba Multiplication",
        mission: 23,
        page: KARATSUBA_PAGE,
        role: "count the measurements, not the additions",
      },
    ],
    board: "formula",
    minutes: 5,
    summary: "Six measurements for a block with a zero.",
    objective:
      "Compute C = A·B for A = [[2,3],[0,5]], B = [[7,11],[13,17]] with six measurements; the zero block lowers the count below the general seven.",
    scenarioSeed: {
      from: "MATRIX BAY",
      code: "OVERCLOCK 02",
      lines: [
        "The block multiplier is warm: A = [[2, 3], [0, 5]], B = [[7, 11], [13, 17]].",
        "Seven products are the general recipe. The lower-left zero of A removes the c terms; six products carry every cell.",
        "The target cell is C = [[53, 73], [65, 85]]. Count the measurements, not the additions.",
      ],
      question: "Which six products build C, and how do they route to the four cells?",
    },
    success: {
      criterion:
        "C = [[53, 73], [65, 85]] with six nonzero products; every cell is assembled from the six.",
      invariant:
        "The lower-left zero removes the c terms from C, so the general seven-product identity collapses to six independent products; the saving is structural, not a rounding.",
      certificate: "The six products and their four sign routes.",
    },
    optionalConstraint: {
      id: "no-undo",
      label: "NO UNDO",
      description: "Every measurement and sign route stands.",
    },
    coupling:
      "The zero block removes a product from the general recipe; the remaining measurements must still route signs to all four cells, so a saved product is not a free one.",
    reuses: [
      { mission: 24, slug: "strassen-matrix-multiplication", move: "buy and route a block product" },
      { mission: 23, slug: "karatsuba-multiplication", move: "count the products per split" },
    ],
    fading: "cold",
    moves: { clean: 7, solve: 8 },
    limits: [
      { label: "products", value: 6, unit: "measurements" },
      { label: "cells", value: 4, unit: "cells" },
    ],
    evidence: ["retrieval", "desirable-difficulty", "expertise-reversal"],
    playable: false,
  },
  {
    id: "overclock-median-trap",
    kind: "overclock",
    order: 6,
    title: "The Median Trap",
    label: "OVERCLOCK 03",
    act: null,
    prereq: { kind: "campaign-complete" },
    algorithms: [
      {
        slug: "quicksort",
        name: "Quicksort",
        mission: 11,
        page: QUICKSORT_PAGE,
        role: "freeze pivots that keep the depth bounded",
      },
    ],
    board: "array",
    minutes: 4,
    summary: "A sorted rack where median-of-three is one comparison short.",
    objective:
      "Sort the eight keys 1 8 2 7 3 6 4 5 within 14 comparisons at depth 3; a clean run uses the exact median every time and finishes in 13.",
    scenarioSeed: {
      from: "SORT CORE",
      code: "OVERCLOCK 03",
      lines: [
        "Eight coolant keys: 1, 8, 2, 7, 3, 6, 4, 5.",
        "A median-of-three probe on 1, 3, 5 returns 3. The exact median is 4 or 5; the difference is one comparison, and the clean run has no spare.",
        "A partition pays one comparison per other key in the segment and freezes the pivot.",
      ],
      question: "Which key do you freeze first?",
    },
    success: {
      criterion:
        "Sorted 1 2 3 4 5 6 7 8 within 14 comparisons at depth 3; a clean run uses 13 and an exact median at every pivot.",
      invariant:
        "A pivot is final after its partition; the comparison cost is the segment length minus one. The median split minimises depth, not the first partition's cost.",
      certificate: "Every pivot is frozen in its final position.",
    },
    optionalConstraint: {
      id: "exact-median",
      label: "EXACT MEDIAN",
      description: "Every pivot is the exact median of its live segment.",
    },
    coupling:
      "The heuristic pivot and the exact median both partition the rack; only the exact median spends the 13-comparison clean budget, so the clean run tests the invariant rather than the habit.",
    reuses: [{ mission: 11, slug: "quicksort", move: "choose and freeze a pivot" }],
    fading: "cold",
    moves: { clean: 7, solve: 8 },
    limits: [
      { label: "comparisons", value: 14, clean: 13, unit: "comparisons" },
      { label: "depth", value: 3, unit: "levels" },
    ],
    evidence: ["retrieval", "desirable-difficulty", "expertise-reversal"],
    playable: false,
  },
  {
    id: "overclock-equal-derivative",
    kind: "overclock",
    order: 7,
    title: "The Equal Derivative",
    label: "OVERCLOCK 04",
    act: null,
    prereq: { kind: "campaign-complete" },
    algorithms: [
      {
        slug: "newton-method",
        name: "Newton's Method",
        mission: 21,
        page: NEWTON_PAGE,
        role: "take the tangent steps that converge",
      },
      {
        slug: "fixed-point-iteration",
        name: "Fixed-Point Iteration",
        mission: 22,
        page: FIXED_POINT_PAGE,
        role: "refuse the contraction certificate when |g'| = 1",
      },
    ],
    board: "number",
    minutes: 4,
    summary: "Newton converges; the fixed-point bound refuses.",
    objective:
      "Reach √2 to 10⁻⁶ with tangent steps, then refuse the fixed-point certificate for x ← 2/x; |g'(√2)| = 1.",
    scenarioSeed: {
      from: "ORBITAL GUIDANCE",
      code: "OVERCLOCK 04",
      lines: [
        "The guidance loop can be written x ← 2/x. It has a fixed point at √2 and derivative −1 there.",
        "The old certificate asks for q < 1. At q = 1 the bound qⁿ/(1−q) has no value; more iterations cannot buy one.",
        "Newton's map has derivative 0 at the same root. Three full tangent steps from 1.2 clear 10⁻⁶.",
      ],
      question: "Which loop certifies the root, and when do you stop?",
    },
    success: {
      criterion:
        "x = 1.41421356… within 10⁻⁶ in three tangent steps; the fixed-point certificate is marked INVALID because q = 1.",
      invariant:
        "Newton's error squares when f'(root) ≠ 0; the contraction bound needs q < 1. At |g'| = 1 the bound is undefined, not large.",
      certificate: "The tangent residual below 10⁻⁶ and the invalid contraction bound.",
    },
    optionalConstraint: {
      id: "stop-on-residual",
      label: "STOP ON RESIDUAL",
      description: "Stop at the first tangent step whose residual is below 10⁻⁶.",
    },
    coupling:
      "Newton and the fixed-point loop share the same root; one has a zero derivative at it and the other has |g'| = 1, so the choice of loop decides whether a certificate exists at all.",
    reuses: [
      { mission: 21, slug: "newton-method", move: "take a full tangent step" },
      { mission: 22, slug: "fixed-point-iteration", move: "check the contraction bound" },
    ],
    fading: "cold",
    moves: { clean: 4, solve: 5 },
    limits: [
      { label: "tangent steps", value: 3, unit: "steps" },
      { label: "residual", value: 1e-6, unit: "error" },
    ],
    evidence: ["retrieval", "interleaving", "desirable-difficulty", "expertise-reversal"],
    playable: false,
  },
  {
    id: "overclock-negative-diagonal",
    kind: "overclock",
    order: 8,
    title: "The Negative Diagonal",
    label: "OVERCLOCK 05",
    act: null,
    prereq: { kind: "campaign-complete" },
    algorithms: [
      {
        slug: "floyd-warshall",
        name: "Floyd–Warshall",
        mission: 19,
        page: FLOYD_WARSHALL_PAGE,
        role: "close the distance table under (min, +)",
      },
      {
        slug: "bellman-ford",
        name: "Bellman–Ford",
        mission: 17,
        page: BELLMAN_FORD_PAGE,
        role: "name the negative cycle and stop",
      },
    ],
    board: "grid",
    minutes: 4,
    summary: "A distance table with a negative diagonal.",
    objective:
      "Close the 4×4 table under (min, +), detect the negative diagonal, and name the cycle A→B→C→A of weight −1 before certifying any distance.",
    scenarioSeed: {
      from: "ROUTE ARCHIVE",
      code: "OVERCLOCK 05",
      lines: [
        "Four towns, five one-way roads: A→B 1, B→C −3, C→A 1, A→D 4, C→D 2.",
        "The table closes under (min, +). If a diagonal turns negative, the closure is not a distance table.",
        "The cycle A→B→C→A weighs −1. A negative diagonal is the certificate, not a rounding error.",
      ],
      question: "Which cell turns first, and what cycle does it name?",
    },
    success: {
      criterion:
        "The diagonal A→A reads −1; the certificate names A→B→C→A with total −1; no finite distance table is certified.",
      invariant:
        "A negative cycle makes every diagonal on the cycle negative under (min, +); the closure is a walk table, not a shortest-path table.",
      certificate: "The negative diagonal A→A and the cycle A→B→C→A.",
    },
    optionalConstraint: {
      id: "stop-at-diagonal",
      label: "STOP AT THE DIAGONAL",
      description: "Stop at the first negative diagonal; do not fill the rest.",
    },
    coupling:
      "The semiring closure and the negative-cycle certificate use the same table; a negative diagonal means the closure can no longer be read as distance, so the certificate must stop the computation.",
    reuses: [
      { mission: 19, slug: "floyd-warshall", move: "close one cell under a semiring" },
      { mission: 17, slug: "bellman-ford", move: "certify a negative cycle" },
    ],
    fading: "cold",
    moves: { clean: 5, solve: 6 },
    limits: [
      { label: "cycle weight", value: -1, unit: "weight" },
      { label: "table", value: 4, unit: "towns" },
    ],
    evidence: ["retrieval", "interleaving", "desirable-difficulty", "expertise-reversal"],
    playable: false,
  },
  {
    id: "overclock-three-bit-window",
    kind: "overclock",
    order: 9,
    title: "The Three-Bit Window",
    label: "OVERCLOCK 06",
    act: null,
    prereq: { kind: "campaign-complete" },
    algorithms: [
      {
        slug: "huffman-coding",
        name: "Huffman Coding",
        mission: 5,
        page: HUFFMAN_PAGE,
        role: "graft a prefix tree under a depth cap",
      },
    ],
    board: "tree",
    minutes: 4,
    summary: "A prefix code under a three-bit window.",
    objective:
      "After 5 + 5, build the rest of the prefix tree for 40, 25, 15, 10, 5, 5 with no codeword longer than 3 bits; the second graft decides the window; the best average is 2.35.",
    scenarioSeed: {
      from: "RELAY BUFFER",
      code: "OVERCLOCK 06",
      lines: [
        "The same six channels: A 40, B 25, C 15, D 10, E 5, F 5. The decoder window is three bits.",
        "The first graft is already on the tree: 5 + 5. The second is not 10 + 10; that greedy merge builds the depth-5 tree the window rejects.",
        "The best three-bit tree is 2.35: two symbols at depth 2, four at depth 3.",
      ],
      question: "After 5 + 5, which two roots do you graft next?",
    },
    success: {
      criterion:
        "A prefix tree with maximum depth 3 and L = 2.35 bits/symbol; the four depth-3 leaves are 15, 10, 5, 5.",
      invariant:
        "The Kraft sum is 1: 2·2⁻² + 4·2⁻³ = 1. The length limit, not the exchange argument alone, sets the optimum.",
      certificate: "The depth-3 prefix tree and its weighted average 2.35.",
    },
    optionalConstraint: {
      id: "no-undo",
      label: "NO UNDO",
      description: "Every graft stands; the window has no spare depth.",
    },
    coupling:
      "Huffman's exchange argument chooses the two lightest roots first; the seeded first graft is that choice. The three-bit window forbids the second greedy merge, so the optimal graft trades 0.10 bits for a feasible depth.",
    reuses: [{ mission: 5, slug: "huffman-coding", move: "graft two roots" }],
    fading: "seeded",
    moves: { clean: 4, solve: 5 },
    limits: [
      { label: "max depth", value: 3, unit: "bits" },
      { label: "average length", value: 2.35, unit: "bits/symbol" },
    ],
    evidence: ["retrieval", "spacing", "desirable-difficulty", "expertise-reversal"],
    playable: false,
  },
] as const satisfies readonly MasteryChallenge[];

export type MasteryId = (typeof MASTERY_CHALLENGES)[number]["id"];

export type MasteryAvailability = {
  challenge: MasteryChallenge;
  unlocked: boolean;
  playable: boolean;
};

function deckInstalled(metas: readonly LevelMeta[], act: Act): boolean {
  return metas.filter((meta) => meta.act === act).length >= EXPECTED_DECK_SIZE;
}

function campaignInstalled(metas: readonly LevelMeta[]): boolean {
  return metas.length >= EXPECTED_CAMPAIGN_SIZE;
}

/**
 * A challenge unlocks only after the deck or campaign is both installed and
 * repaired. The guard prevents a partial build from announcing an act complete
 * at 2 of 8 or a campaign complete at 2 of 24.
 */
export function masteryUnlocked(
  challenge: MasteryChallenge,
  metas: readonly LevelMeta[],
  progress: Progress,
): boolean {
  if (challenge.prereq.kind === "act-complete") {
    const act = challenge.prereq.act;
    return deckInstalled(metas, act) && isActComplete(metas, progress, act);
  }
  return campaignInstalled(metas) && isCampaignComplete(metas, progress);
}

/** All definitions with their honest unlock/playable state. */
export function masteryAvailability(
  metas: readonly LevelMeta[],
  progress: Progress,
): MasteryAvailability[] {
  return [...MASTERY_CHALLENGES]
    .sort((a, b) => a.order - b.order)
    .map((challenge) => ({
      challenge,
      unlocked: masteryUnlocked(challenge, metas, progress),
      playable: challenge.playable,
    }));
}

/**
 * The only list the hub may link. A definition is not a mission: until a
 * composite module exists, `playable` is false and the challenge is omitted.
 */
export function availableMastery(
  metas: readonly LevelMeta[],
  progress: Progress,
): MasteryChallenge[] {
  return masteryAvailability(metas, progress)
    .filter((entry) => entry.unlocked && entry.playable)
    .map((entry) => entry.challenge);
}

/** Challenges that are unlocked but not yet installed, for an honest brief. */
export function pendingMastery(
  metas: readonly LevelMeta[],
  progress: Progress,
): MasteryChallenge[] {
  return masteryAvailability(metas, progress)
    .filter((entry) => entry.unlocked && !entry.playable)
    .map((entry) => entry.challenge);
}

export function masteryById(id: string): MasteryChallenge | undefined {
  return MASTERY_CHALLENGES.find((challenge) => challenge.id === id);
}
