export type PageRankGraphPreset = {
  id: string;
  label: string;
  /** Outgoing link targets per node (empty = dangling → teleport to all) */
  links: number[][];
  nodeLabels: string[];
};

/** Classic 4-node web from README ASCII diagram */
export const CLASSIC_WEB: PageRankGraphPreset = {
  id: "classic",
  label: "Classic web",
  links: [[1, 2], [2], [0, 1], [0]],
  nodeLabels: ["A", "B", "C", "D"],
};

/** Hub receives many links; leaves are peripheral */
export const HUB_SPOKE: PageRankGraphPreset = {
  id: "hub",
  label: "Hub & spokes",
  links: [[1, 2, 3], [0], [0], [0]],
  nodeLabels: ["Hub", "S1", "S2", "S3"],
};

/** Two-node trap absorbing rank without teleport would stall */
export const SPIDER_TRAP: PageRankGraphPreset = {
  id: "trap",
  label: "Spider trap",
  links: [[1], [0], [0, 1], []],
  nodeLabels: ["Entry", "T1", "T2", "Sink"],
};

export const GRAPH_PRESETS: PageRankGraphPreset[] = [CLASSIC_WEB, HUB_SPOKE, SPIDER_TRAP];

export function getGraphPreset(id: string): PageRankGraphPreset {
  return GRAPH_PRESETS.find((g) => g.id === id) ?? CLASSIC_WEB;
}

/**
 * One power-iteration step with damping and dangling-node teleport.
 * Matches README: PR(u) = (1-d)/N + d * sum_{v->u} PR(v)/L(v)
 */
export function pagerankStep(
  links: number[][],
  ranks: number[],
  damping: number
): number[] {
  const n = ranks.length;
  const next = Array(n).fill((1 - damping) / n);
  for (let i = 0; i < n; i++) {
    const targets = links[i].length ? links[i] : Array.from({ length: n }, (_, k) => k);
    const out = targets.length;
    for (const j of targets) {
      next[j] += (damping * ranks[i]) / out;
    }
  }
  return next;
}

export function powerIteration(
  links: number[][],
  damping: number,
  iterations: number,
  initial?: number[]
): number[] {
  const n = links.length;
  let r = initial ?? uniformInit(n);
  for (let i = 0; i < iterations; i++) {
    r = pagerankStep(links, r, damping);
  }
  return r;
}

function uniformInit(n: number): number[] {
  return Array(n).fill(1 / n);
}

/** Node layout on a unit circle for SVG rendering */
export function nodePositions(n: number): { x: number; y: number }[] {
  const cx = 0.5;
  const cy = 0.5;
  const r = 0.38;
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}
