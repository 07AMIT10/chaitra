/**
 * Registry: the five curated live benches, the field specimens that link to
 * published Algorithms and Drishti pages, and the starter scenarios for the
 * blank bench. Pure data and constructors: no clock, storage, DOM, or React.
 */
import algorithmsCatalog from "../data/algorithms.json";
import drishtiCatalog from "../data/drishti.json";
import {
  ARRAY_STRATEGIES,
  GRAPH_STRATEGIES,
  GRID_STRATEGIES,
  type ArrayStrategy,
  type FieldSpecimen,
  type GraphEdge,
  type GraphModel,
  type GraphNode,
  type GraphStrategy,
  type GridStrategy,
  type LiveBench,
  type Scenario,
  type Strategy,
  type Substrate,
} from "./types";

const SUBSTRATE_STRATEGIES: Record<Substrate, readonly Strategy[]> = {
  graph: GRAPH_STRATEGIES,
  array: ARRAY_STRATEGIES,
  grid: GRID_STRATEGIES,
};

/** Algorithm slugs that already have a live bench; everything else is a field card. */
const LIVE_ALGORITHM_SLUGS = new Set([
  "dijkstra",
  "breadth-first-search",
  "depth-first-search",
  "topological-sort",
  "binary-search",
  "merge-sort",
  "quicksort",
  "edit-distance",
  "longest-common-subsequence",
]);

const node = (id: string, x: number, y: number): GraphNode => ({
  id,
  label: id,
  x,
  y,
});

const edge = (from: string, to: string, weight: number): GraphEdge => ({
  id: `${from}>${to}`,
  from,
  to,
  weight,
});

/* --------------------------------------------------------------- live benches */

/**
 * The seven-town graph from `src/game/levels/modules/dijkstra.ts`. Edge ids
 * and node positions match the guided mission so the two read as one system.
 */
const LEAST_LABEL_GRAPH: GraphModel = {
  kind: "graph",
  nodes: [
    node("A", 60, 170),
    node("C", 175, 85),
    node("D", 295, 85),
    node("E", 415, 85),
    node("G", 560, 170),
    node("B", 390, 240),
    node("F", 200, 240),
  ],
  edges: [
    edge("A", "C", 1),
    edge("A", "F", 6),
    edge("A", "B", 9),
    edge("C", "D", 1),
    edge("D", "E", 1),
    edge("D", "B", 2),
    edge("F", "E", 1),
    edge("F", "B", 4),
    edge("E", "G", 4),
    edge("B", "G", 1),
  ],
  start: "A",
  target: "G",
  directed: true,
};

/** A directed acyclic graph whose arrival order differs by strategy. */
const ARRIVAL_ORDER_GRAPH: GraphModel = {
  kind: "graph",
  nodes: [
    node("A", 60, 170),
    node("B", 180, 80),
    node("C", 180, 260),
    node("D", 320, 170),
    node("E", 440, 80),
    node("F", 440, 260),
    node("G", 560, 170),
  ],
  edges: [
    edge("A", "B", 3),
    edge("A", "C", 2),
    edge("B", "D", 4),
    edge("C", "D", 1),
    edge("D", "E", 5),
    edge("D", "F", 2),
    edge("E", "G", 1),
    edge("F", "G", 3),
  ],
  start: "A",
  directed: true,
};

export const LIVE_BENCHES: readonly LiveBench[] = [
  {
    id: "least-label",
    title: "Least Label",
    framing: "Towns quote travel times; some estimates become final.",
    what: "A courier graph of seven towns where each label is a promise and settlement is a final answer. Dijkstra settles the least label first, so the road to the target is built from estimates that stop changing.",
    substrate: "graph",
    strategies: ["dijkstra"],
    defaultScenario: {
      schema: 1,
      id: "least-label",
      title: "Least Label",
      substrate: "graph",
      strategy: "dijkstra",
      model: LEAST_LABEL_GRAPH,
      params: { framing: "traffic" },
    },
    articleHref: "/algorithms/programming/dijkstra",
    gameHref: "/algorithms/game/dijkstra",
  },
  {
    id: "arrival-order",
    title: "Arrival Order",
    framing: "Work waits for inputs; the order of arrival changes what is reachable.",
    what: "One directed acyclic graph, three ways to walk it. Breadth-first visits by distance, depth-first follows a corridor to its end, and topological order waits until every dependency has arrived.",
    substrate: "graph",
    strategies: ["bfs", "dfs", "topological"],
    defaultScenario: {
      schema: 1,
      id: "arrival-order",
      title: "Arrival Order",
      substrate: "graph",
      strategy: "bfs",
      model: ARRIVAL_ORDER_GRAPH,
      params: { framing: "scheduling" },
    },
    articleHref: "/algorithms/programming/breadth-first-search",
    gameHref: "/algorithms/game/breadth-first-search",
  },
  {
    id: "halving-horizon",
    title: "Halving Horizon",
    framing: "A sorted shelf; each question should halve the uncertainty.",
    what: "Eleven prices sit in ascending order and the target is 19. Each probe discards one side of the shelf, so the horizon of possible answers halves until a single cell remains.",
    substrate: "array",
    strategies: ["binary-search"],
    defaultScenario: {
      schema: 1,
      id: "halving-horizon",
      title: "Halving Horizon",
      substrate: "array",
      strategy: "binary-search",
      model: {
        kind: "array",
        values: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31],
        target: 19,
        sorted: true,
      },
      params: { framing: "shelf" },
    },
    articleHref: "/algorithms/programming/binary-search",
    gameHref: "/algorithms/game/binary-search",
  },
  {
    id: "order-rack",
    title: "Order Rack",
    framing: "A rack must become ordered; the comparison pattern is the story.",
    what: "Twelve mixed values arrive out of order. Merge sort splits and rebuilds sorted runs; quicksort partitions around a pivot. The result is identical, but the comparison pattern is not.",
    substrate: "array",
    strategies: ["merge-sort", "quick-sort"],
    defaultScenario: {
      schema: 1,
      id: "order-rack",
      title: "Order Rack",
      substrate: "array",
      strategy: "merge-sort",
      model: {
        kind: "array",
        values: [7, 2, 9, 4, 1, 8, 3, 6, 5, 12, 10, 11],
        sorted: false,
      },
      params: { framing: "shelf" },
    },
    articleHref: "/algorithms/programming/merge-sort",
    gameHref: "/algorithms/game/merge-sort",
  },
  {
    id: "prefix-loom",
    title: "Prefix Loom",
    framing: "Two texts on axes; each cell reconciles a prefix pair.",
    what: "Two words, kitten and sitting, are woven across a table. Edit distance asks what it costs to rewrite one into the other; longest common subsequence asks what can be kept unchanged.",
    substrate: "grid",
    strategies: ["edit-distance", "lcs"],
    defaultScenario: {
      schema: 1,
      id: "prefix-loom",
      title: "Prefix Loom",
      substrate: "grid",
      strategy: "edit-distance",
      model: { kind: "table", a: "kitten", b: "sitting" },
      params: { framing: "texts" },
    },
    articleHref: "/algorithms/programming/edit-distance",
    gameHref: "/algorithms/game/edit-distance",
  },
];

export function getLiveBench(id: string): LiveBench | undefined {
  return LIVE_BENCHES.find((bench) => bench.id === id);
}

/* ------------------------------------------------------------ field specimens */

const algorithmSpecimens: FieldSpecimen[] = algorithmsCatalog.algorithms
  .filter((algorithm) => !LIVE_ALGORITHM_SLUGS.has(algorithm.slug))
  .map((algorithm) => ({
    id: `algorithm:${algorithm.slug}`,
    kind: "algorithm",
    title: algorithm.title,
    summary: algorithm.oneLine,
    // Published route is /algorithms/<field>/<slug>.
    href: `/algorithms/${algorithm.field}/${algorithm.slug}`,
  }));

const studySpecimens: FieldSpecimen[] = drishtiCatalog.studies.map((study) => ({
  id: `study:${study.slug}`,
  kind: "study",
  title: study.title,
  summary: study.tagline,
  href: `/drishti/studies/${study.slug}`,
}));

export const FIELD_SPECIMENS: readonly FieldSpecimen[] = [
  ...algorithmSpecimens,
  ...studySpecimens,
];

/* ------------------------------------------------------------- blank factories */

function resolveStrategy<S extends Strategy>(
  substrate: Substrate,
  allowed: readonly S[],
  requested: Strategy | undefined,
  fallback: S,
): S {
  if (requested === undefined) return fallback;
  if (!(allowed as readonly Strategy[]).includes(requested)) {
    throw new Error(
      `Strategy "${requested}" is not compatible with the "${substrate}" substrate. Choose one of ${allowed.join(", ")}.`,
    );
  }
  return requested as S;
}

/**
 * A small valid starter scenario for the blank bench. A requested strategy is
 * honoured only on its own substrate; incompatible requests fail loudly.
 */
export function blankScenario(substrate: Substrate, strategy?: Strategy): Scenario {
  switch (substrate) {
    case "graph": {
      const chosen = resolveStrategy<GraphStrategy>(
        "graph",
        GRAPH_STRATEGIES,
        strategy,
        "bfs",
      );
      return {
        schema: 1,
        id: "blank-graph",
        title: "Blank graph",
        substrate: "graph",
        strategy: chosen,
        model: {
          kind: "graph",
          nodes: [
            node("A", 80, 60),
            node("B", 260, 60),
            node("C", 80, 230),
            node("D", 260, 230),
          ],
          edges: [edge("A", "B", 2), edge("A", "C", 1), edge("B", "D", 3)],
          start: "A",
          directed: true,
        },
        params: {},
      };
    }
    case "array": {
      const chosen = resolveStrategy<ArrayStrategy>(
        "array",
        ARRAY_STRATEGIES,
        strategy,
        "merge-sort",
      );
      if (chosen === "binary-search") {
        return {
          schema: 1,
          id: "blank-array",
          title: "Blank array",
          substrate: "array",
          strategy: chosen,
          model: {
            kind: "array",
            values: [1, 3, 5, 7, 9],
            target: 5,
            sorted: true,
          },
          params: {},
        };
      }
      return {
        schema: 1,
        id: "blank-array",
        title: "Blank array",
        substrate: "array",
        strategy: chosen,
        model: {
          kind: "array",
          values: [5, 1, 4, 2, 3],
          sorted: false,
        },
        params: {},
      };
    }
    case "grid": {
      const chosen = resolveStrategy<GridStrategy>(
        "grid",
        GRID_STRATEGIES,
        strategy,
        "edit-distance",
      );
      return {
        schema: 1,
        id: "blank-grid",
        title: "Blank grid",
        substrate: "grid",
        strategy: chosen,
        model: { kind: "table", a: "cat", b: "cut" },
        params: {},
      };
    }
    default:
      throw new Error(`Unknown substrate: ${String(substrate)}.`);
  }
}
