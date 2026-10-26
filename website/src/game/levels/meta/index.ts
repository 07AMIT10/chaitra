import type { LevelMeta } from "../../types";
import { unionFindMeta } from "./union-find";
import { binarySearchMeta } from "./binary-search";
import { breadthFirstSearchMeta } from "./breadth-first-search";
import { topologicalSortMeta } from "./topological-sort";
import { huffmanCodingMeta } from "./huffman-coding";
import { coinChangeMeta } from "./coin-change";
import { mergeSortMeta } from "./merge-sort";
import { depthFirstSearchMeta } from "./depth-first-search";
import { dijkstraMeta } from "./dijkstra";
import { minimumSpanningTreeMeta } from "./minimum-spanning-tree";
import { quicksortMeta } from "./quicksort";
import { editDistanceMeta } from "./edit-distance";
import { longestIncreasingSubsequenceMeta } from "./longest-increasing-subsequence";
import { knapsack01Meta } from "./knapsack-0-1";
import { stableMatchingMeta } from "./stable-matching";
import { longestCommonSubsequenceMeta } from "./longest-common-subsequence";
import { bellmanFordMeta } from "./bellman-ford";
import { maximumFlowMeta } from "./maximum-flow";
import { floydWarshallMeta } from "./floyd-warshall";
import { bipartiteMatchingMeta } from "./bipartite-matching";
import { newtonMethodMeta } from "./newton-method";
import { fixedPointIterationMeta } from "./fixed-point-iteration";
import { karatsubaMultiplicationMeta } from "./karatsuba-multiplication";
import { strassenMatrixMultiplicationMeta } from "./strassen-matrix-multiplication";

/** Every playable mission, in campaign order. */
export const LEVEL_META: LevelMeta[] = [
  unionFindMeta,
  binarySearchMeta,
  breadthFirstSearchMeta,
  topologicalSortMeta,
  huffmanCodingMeta,
  coinChangeMeta,
  mergeSortMeta,
  depthFirstSearchMeta,
  dijkstraMeta,
  minimumSpanningTreeMeta,
  quicksortMeta,
  editDistanceMeta,
  longestIncreasingSubsequenceMeta,
  knapsack01Meta,
  stableMatchingMeta,
  longestCommonSubsequenceMeta,
  bellmanFordMeta,
  maximumFlowMeta,
  floydWarshallMeta,
  bipartiteMatchingMeta,
  newtonMethodMeta,
  fixedPointIterationMeta,
  karatsubaMultiplicationMeta,
  strassenMatrixMultiplicationMeta,
].sort((a, b) => a.number - b.number);

export const ACTS = [
  { act: 1 as const, name: "Cadet", subtitle: "One verb per system." },
  { act: 2 as const, name: "Engineer", subtitle: "The rules stop holding your hand." },
  { act: 3 as const, name: "Architect", subtitle: "Adversaries and optimality." },
];

export function metaBySlug(slug: string): LevelMeta | undefined {
  return LEVEL_META.find((level) => level.slug === slug);
}

export function nextMeta(slug: string): LevelMeta | undefined {
  const index = LEVEL_META.findIndex((level) => level.slug === slug);
  return index >= 0 ? LEVEL_META[index + 1] : undefined;
}

export function prevMeta(slug: string): LevelMeta | undefined {
  const index = LEVEL_META.findIndex((level) => level.slug === slug);
  return index > 0 ? LEVEL_META[index - 1] : undefined;
}
