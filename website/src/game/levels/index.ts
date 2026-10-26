import type { LevelModule } from "../types";
import { LEVEL_META } from "./meta";

export { LEVEL_META, ACTS, metaBySlug, nextMeta, prevMeta } from "./meta";

/**
 * One dynamic import per level keeps the hub's bundle to metadata only; the
 * mission page loads just the level it needs.
 */
const LOADERS: Record<string, () => Promise<{ default: LevelModule<any> }>> = {
  "union-find": () => import("./modules/union-find"),
  "binary-search": () => import("./modules/binary-search"),
  "breadth-first-search": () => import("./modules/breadth-first-search"),
  "topological-sort": () => import("./modules/topological-sort"),
  "huffman-coding": () => import("./modules/huffman-coding"),
  "coin-change": () => import("./modules/coin-change"),
  "merge-sort": () => import("./modules/merge-sort"),
  "depth-first-search": () => import("./modules/depth-first-search"),
  "dijkstra": () => import("./modules/dijkstra"),
  "minimum-spanning-tree": () => import("./modules/minimum-spanning-tree"),
  "quicksort": () => import("./modules/quicksort"),
  "edit-distance": () => import("./modules/edit-distance"),
  "longest-increasing-subsequence": () => import("./modules/longest-increasing-subsequence"),
  "knapsack-0-1": () => import("./modules/knapsack-0-1"),
  "stable-matching": () => import("./modules/stable-matching"),
  "longest-common-subsequence": () => import("./modules/longest-common-subsequence"),
  "bellman-ford": () => import("./modules/bellman-ford"),
  "maximum-flow": () => import("./modules/maximum-flow"),
  "floyd-warshall": () => import("./modules/floyd-warshall"),
  "bipartite-matching": () => import("./modules/bipartite-matching"),
  "newton-method": () => import("./modules/newton-method"),
  "fixed-point-iteration": () => import("./modules/fixed-point-iteration"),
  "karatsuba-multiplication": () => import("./modules/karatsuba-multiplication"),
  "strassen-matrix-multiplication": () => import("./modules/strassen-matrix-multiplication"),
};

export function knownSlugs(): string[] {
  return LEVEL_META.map((level) => level.slug);
}

export async function loadLevel(slug: string): Promise<LevelModule<any> | null> {
  const loader = LOADERS[slug];
  if (!loader) return null;
  const module = await loader();
  return module.default;
}

export function hasLoader(slug: string): boolean {
  return slug in LOADERS;
}
