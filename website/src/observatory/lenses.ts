/**
 * The seven Drishti lenses as pure, frame-indexed projections.
 *
 * A projection never runs the scenario and never mutates the context: it reads
 * the current frame, the deterministic trace around it, and the scenario the
 * trace belongs to. Every highlight is resolved against the current view, so a
 * lens can point at nothing only by returning no highlight at all.
 */
import type { ArrayView, BoardView, GridView } from "../game/types";
import { LENS_BY_SLUG } from "../lib/drishti-lenses";
import { gridCellId, viewIds } from "./scenario";
import {
  LENS_IDS,
  type Frame,
  type GraphModel,
  type Highlight,
  type LensId,
  type LensProjection,
  type Metric,
  type RunContext,
  type Scenario,
} from "./types";

export { LENS_IDS };

const ABSENCE_REASON =
  "This specimen visits or reorders state but does not adapt a model or optimize a parameter.";

/** A done trace has no live frontier: the last frame is history, not motion. */
const TERMINAL_FLOW = "The trace is complete; nothing is in motion or waiting.";

/** Spec §5 field-note prompts, verbatim. */
const NOTE_PROMPTS: Record<LensId, string> = {
  "what-exists": "What did you treat as a thing before you looked?",
  "what-changes": "What did you assume was stationary?",
  "what-flows": "What was waiting, and what set the rate?",
  "what-learns": "What updated, and where is it stored?",
  "what-persists": "What survived a change you expected to break it?",
  "what-emerges": "What appeared that no single part contains?",
  "what-will-happen": "What do you expect next, and what evidence would move it?",
};

const UPDATE_RULE: Record<Scenario["strategy"], string> = {
  bfs: "the queue removes one node and enqueues its unseen neighbours",
  dfs: "the stack pops one node and pushes its unseen neighbours",
  topological: "a ready node is emitted and its out-edges decrement in-degree",
  dijkstra: "the smallest unsettled label settles and its out-edges relax",
  "binary-search": "each probe compares the midpoint and halves the candidate range",
  "merge-sort": "adjacent sorted runs merge, taking the smaller head each time",
  "quick-sort": "each partition moves smaller values left, then the pivot settles",
  "edit-distance": "each cell takes one plus the cheapest of its top-left neighbours",
  lcs: "each cell copies the diagonal on a match, otherwise the larger of top and left",
};

const FRONTIER_LABEL: Record<"bfs" | "dfs" | "topological" | "dijkstra", string> = {
  bfs: "Queue",
  dfs: "Stack",
  topological: "Ready",
  dijkstra: "Frontier",
};

const BOTTLENECK: Record<"bfs" | "dfs" | "topological" | "dijkstra", string> = {
  bfs: "queue head",
  dfs: "stack top",
  topological: "smallest ready node",
  dijkstra: "smallest unsettled label",
};

/* ------------------------------------------------------------------ helpers */

function lensCopy(lens: LensId): { title: string; question: string; glyph: string } {
  return LENS_BY_SLUG[lens] ?? { title: lens, question: lens, glyph: "•" };
}

function readout(ctx: RunContext, lens: LensId, body: string): string {
  const copy = lensCopy(lens);
  const total = Math.max(1, ctx.run.frames.length);
  return `${copy.glyph} ${copy.title} · frame ${ctx.frameIndex + 1}/${total} — ${body}`;
}

function eventText(frame: Frame | undefined): string {
  if (frame === undefined) return "no event";
  const event = frame.events[frame.events.length - 1];
  return event === undefined ? "no event" : event.text;
}

function metricValue(frame: Frame, label: string): string | undefined {
  return frame.metrics.find((metric) => metric.label === label)?.value;
}

function viewEntityStates(view: BoardView): Map<string, string> {
  const states = new Map<string, string>();
  switch (view.kind) {
    case "graph":
      for (const node of view.nodes) states.set(node.id, node.state ?? "idle");
      for (const edge of view.edges) states.set(edge.id, edge.state ?? "idle");
      break;
    case "array":
      for (const item of view.items) states.set(item.id, item.state ?? "idle");
      break;
    case "grid":
      for (const cell of view.cells) states.set(gridCellId(cell.r, cell.c), cell.state ?? "idle");
      break;
    default:
      break;
  }
  return states;
}

function idsInStates(view: BoardView, wanted: readonly string[]): string[] {
  const ids: string[] = [];
  for (const [id, state] of viewEntityStates(view)) {
    if (wanted.includes(state)) ids.push(id);
  }
  return ids;
}

function activeIds(view: BoardView): string[] {
  return idsInStates(view, ["active"]);
}

function doneIds(view: BoardView): string[] {
  return idsInStates(view, ["done", "target"]);
}

function highlightIds(frame: Frame, roles?: readonly Highlight["role"][]): string[] {
  const ids: string[] = [];
  for (const highlight of frame.highlights) {
    if (roles === undefined || roles.includes(highlight.role)) ids.push(highlight.id);
  }
  return ids;
}

function resolved(view: BoardView, ids: Iterable<string>): string[] {
  const allowed = viewIds(view);
  const result: string[] = [];
  for (const id of ids) {
    if (allowed.has(id) && !result.includes(id)) result.push(id);
  }
  return result;
}

function viewLabels(view: BoardView): Map<string, string> {
  const labels = new Map<string, string>();
  switch (view.kind) {
    case "graph":
      for (const node of view.nodes) labels.set(node.id, node.label);
      for (const edge of view.edges) labels.set(edge.id, `${edge.from}→${edge.to}`);
      break;
    case "array":
      for (const item of view.items) labels.set(item.id, item.label ?? String(item.value));
      break;
    case "grid":
      for (const cell of view.cells) labels.set(gridCellId(cell.r, cell.c), gridCellId(cell.r, cell.c));
      break;
    default:
      break;
  }
  return labels;
}

function describeIds(view: BoardView, ids: readonly string[], limit = 3): string {
  if (ids.length === 0) return "none";
  const labels = viewLabels(view);
  const shown = ids.slice(0, limit).map((id) => labels.get(id) ?? id);
  const rest = ids.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} (+${rest} more)` : shown.join(", ");
}

function mutationClause(ctx: RunContext): string {
  const count = ctx.mutations.length;
  if (count === 0) return "";
  return ` ${count} mutation${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} stacked on this scenario.`;
}

function graphModel(ctx: RunContext): GraphModel | null {
  return ctx.scenario.substrate === "graph" ? ctx.scenario.model : null;
}

function gridScenario(
  ctx: RunContext,
): { a: string; b: string; strategy: "edit-distance" | "lcs" } | null {
  if (ctx.scenario.substrate !== "grid") return null;
  return {
    a: ctx.scenario.model.a,
    b: ctx.scenario.model.b,
    strategy: ctx.scenario.strategy,
  };
}

function gridValues(view: GridView): (number | null)[][] {
  const values: (number | null)[][] = Array.from({ length: view.rows }, () =>
    Array<number | null>(view.cols).fill(null),
  );
  for (const cell of view.cells) {
    const value = cell.value === "" ? null : Number(cell.value);
    values[cell.r][cell.c] = Number.isFinite(value as number) ? (value as number) : null;
  }
  return values;
}

/* ----------------------------------------------------------- graph analysis */

type GraphAnalysis = {
  components: number;
  cycles: number;
  maxDegree: number;
  levels: number;
  reachable: number;
  cyclicNodes: string[];
  deepestNodes: string[];
};

function analyzeGraph(model: GraphModel): GraphAnalysis {
  const nodeOrder = model.nodes.map((node) => node.id);
  const parent = new Map<string, string>(nodeOrder.map((id) => [id, id]));

  const find = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) {
      const next = parent.get(current) as string;
      parent.set(current, parent.get(next) as string);
      current = next;
    }
    return current;
  };

  const union = (a: string, b: string): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return;
    const ordered = [rootA, rootB].sort();
    parent.set(ordered[1] as string, ordered[0] as string);
  };

  for (const edge of model.edges) union(edge.from, edge.to);

  const roots = new Map<string, number>();
  const componentOf = new Map<string, number>();
  const componentNodes = new Map<number, string[]>();
  for (const id of nodeOrder) {
    const root = find(id);
    let index = roots.get(root);
    if (index === undefined) {
      index = roots.size;
      roots.set(root, index);
    }
    componentOf.set(id, index);
    const group = componentNodes.get(index);
    if (group === undefined) componentNodes.set(index, [id]);
    else group.push(id);
  }

  const edgeCount = new Map<number, number>();
  for (const edge of model.edges) {
    const index = componentOf.get(edge.from) as number;
    edgeCount.set(index, (edgeCount.get(index) ?? 0) + 1);
  }

  const degree = new Map<string, number>(nodeOrder.map((id) => [id, 0]));
  for (const edge of model.edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  const maxDegree = Math.max(0, ...degree.values());

  // Adjacency for traversal. Directed graphs keep direction; undirected
  // graphs see both ends. Neighbour order is stable by id.
  const adjacency = new Map<string, string[]>(nodeOrder.map((id) => [id, []]));
  for (const edge of model.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    if (!model.directed) adjacency.get(edge.to)?.push(edge.from);
  }
  for (const neighbours of adjacency.values()) neighbours.sort();

  const levels = new Map<string, number>();
  const queue: string[] = [model.start];
  levels.set(model.start, 0);
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head] as string;
    const level = levels.get(id) as number;
    for (const next of adjacency.get(id) ?? []) {
      if (levels.has(next)) continue;
      levels.set(next, level + 1);
      queue.push(next);
    }
  }
  const levelCount = levels.size === 0 ? 0 : Math.max(...levels.values()) + 1;
  const deepest = levelCount === 0 ? -1 : levelCount - 1;
  const deepestNodes = nodeOrder.filter((id) => levels.get(id) === deepest);

  let cycles = 0;
  const cyclicNodes = new Set<string>();
  if (model.directed) {
    // Count cycle-closing (back) edges in a stable DFS.
    const colour = new Map<string, 0 | 1 | 2>(nodeOrder.map((id) => [id, 0]));
    const visit = (id: string): void => {
      colour.set(id, 1);
      for (const next of adjacency.get(id) ?? []) {
        const shade = colour.get(next) ?? 0;
        if (shade === 1) cycles += 1;
        else if (shade === 0) visit(next);
      }
      colour.set(id, 2);
    };
    for (const id of nodeOrder) if ((colour.get(id) ?? 0) === 0) visit(id);

    // A node is cyclic when it can reach itself along at least one edge.
    for (const id of nodeOrder) {
      const seen = new Set<string>();
      const stack = [...(adjacency.get(id) ?? [])];
      let cyclic = false;
      while (stack.length > 0) {
        const next = stack.pop() as string;
        if (next === id) {
          cyclic = true;
          break;
        }
        if (seen.has(next)) continue;
        seen.add(next);
        for (const step of adjacency.get(next) ?? []) stack.push(step);
      }
      if (cyclic) cyclicNodes.add(id);
    }
  } else {
    for (const [index, nodes] of componentNodes) {
      const independent = (edgeCount.get(index) ?? 0) - nodes.length + 1;
      if (independent > 0) {
        cycles += independent;
        for (const id of nodes) cyclicNodes.add(id);
      }
    }
  }

  return {
    components: roots.size,
    cycles,
    maxDegree,
    levels: levelCount,
    reachable: levels.size,
    cyclicNodes: nodeOrder.filter((id) => cyclicNodes.has(id)),
    deepestNodes,
  };
}

/* ----------------------------------------------------------- array analysis */

type ArrayAnalysis = {
  runs: number;
  longestRun: number;
  longestIds: string[];
  inversions: number;
  duplicates: number;
};

function analyzeArray(view: ArrayView): ArrayAnalysis {
  const values = view.items.map((item) => Number(item.value));
  const runs: string[][] = [];
  let current: string[] = [];
  for (let index = 0; index < view.items.length; index += 1) {
    const id = view.items[index].id;
    if (current.length === 0) {
      current = [id];
      continue;
    }
    if (values[index - 1] <= values[index]) current.push(id);
    else {
      runs.push(current);
      current = [id];
    }
  }
  if (current.length > 0) runs.push(current);

  let longestIds: string[] = [];
  for (const run of runs) {
    if (run.length > longestIds.length) longestIds = run;
  }

  let inversions = 0;
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i] > values[j]) inversions += 1;
    }
  }

  return {
    runs: runs.length,
    longestRun: longestIds.length,
    longestIds,
    inversions,
    duplicates: values.length - new Set(values).size,
  };
}

/* ------------------------------------------------------------ grid analysis */

function cellRef(id: string): { r: number; c: number } | null {
  const match = /^(\d+):(\d+)$/.exec(id);
  if (match === null) return null;
  return { r: Number(match[1]), c: Number(match[2]) };
}

function tracebackPath(
  view: GridView,
  a: string,
  b: string,
  strategy: "edit-distance" | "lcs",
  start: { r: number; c: number } | null,
): string[] {
  if (start === null) return [];
  const values = gridValues(view);
  if (values[start.r]?.[start.c] === null || values[start.r]?.[start.c] === undefined) return [];

  let r = start.r;
  let c = start.c;
  const path = [gridCellId(r, c)];
  const guard = view.rows * view.cols + 4;
  let steps = 0;

  while ((r > 0 || c > 0) && steps < guard) {
    steps += 1;
    const here = values[r][c] as number;
    if (strategy === "edit-distance") {
      const diagonal = r > 0 && c > 0 ? values[r - 1][c - 1] : null;
      const cost = r > 0 && c > 0 && a.charAt(r - 1) === b.charAt(c - 1) ? 0 : 1;
      if (diagonal !== null && here === diagonal + cost) {
        r -= 1;
        c -= 1;
      } else if (r > 0 && values[r - 1][c] !== null && here === (values[r - 1][c] as number) + 1) {
        r -= 1;
      } else if (c > 0 && values[r][c - 1] !== null && here === (values[r][c - 1] as number) + 1) {
        c -= 1;
      } else break;
    } else {
      const diagonal = r > 0 && c > 0 ? values[r - 1][c - 1] : null;
      const match = r > 0 && c > 0 && a.charAt(r - 1) === b.charAt(c - 1);
      if (match && diagonal !== null && here === diagonal + 1) {
        r -= 1;
        c -= 1;
      } else if (r > 0 && values[r - 1][c] !== null && here === values[r - 1][c]) {
        r -= 1;
      } else if (c > 0 && values[r][c - 1] !== null && here === values[r][c - 1]) {
        c -= 1;
      } else break;
    }
    path.push(gridCellId(r, c));
  }
  return path;
}

function gridPath(
  ctx: RunContext,
  view: GridView,
): { path: string[]; matches: number; start: string; end: string } {
  const scenario = gridScenario(ctx);
  if (scenario === null) return { path: [], matches: 0, start: "", end: "" };

  const active = activeIds(view).find((id) => cellRef(id) !== null);
  let start = active === undefined ? null : cellRef(active);
  if (start === null) {
    const corner = { r: view.rows - 1, c: view.cols - 1 };
    const values = gridValues(view);
    if (values[corner.r]?.[corner.c] !== null && values[corner.r]?.[corner.c] !== undefined) {
      start = corner;
    }
  }
  let path = resolved(
    view,
    tracebackPath(view, scenario.a, scenario.b, scenario.strategy, start),
  );
  if (path.length === 0) {
    // The runner plants the completed path on the last frame; use it when a
    // partial table does not offer a walkable endpoint.
    path = resolved(
      view,
      highlightIds(ctx.frame, ["emerge"]).filter((id) => cellRef(id) !== null),
    );
  }
  return {
    path,
    matches: countMatches(path, scenario.a, scenario.b),
    start: path[0] ?? "",
    end: path[path.length - 1] ?? "",
  };
}

function countMatches(path: readonly string[], a: string, b: string): number {
  let matches = 0;
  for (let index = 0; index + 1 < path.length; index += 1) {
    const here = cellRef(path[index]);
    const next = cellRef(path[index + 1]);
    if (here === null || next === null) continue;
    if (here.r - 1 === next.r && here.c - 1 === next.c && a.charAt(here.r - 1) === b.charAt(here.c - 1)) {
      matches += 1;
    }
  }
  return matches;
}

/* --------------------------------------------------------------- projections */

function projectWhatExists(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;
  const states = [...viewEntityStates(view).values()];
  const marked = states.filter((state) => state !== "idle").length;
  const selected = activeIds(view);
  let body = "";
  const metrics: Metric[] = [];

  if (view.kind === "graph") {
    const model = graphModel(ctx);
    const boundary = model === null
      ? "no start or target"
      : `start ${model.start}${model.target === undefined ? "" : `, target ${model.target}`}`;
    metrics.push(
      { label: "Nodes", value: String(view.nodes.length) },
      { label: "Edges", value: String(view.edges.length) },
      { label: "Parts", value: String(view.nodes.length + view.edges.length), tone: "signal" },
      { label: "Selected", value: String(selected.length) },
      { label: "Marked", value: `${marked} / ${states.length}` },
    );
    body =
      `${view.nodes.length} node(s), ${view.edges.length} edge(s). ` +
      `Boundary: ${boundary}; ${model?.directed === true ? "directed" : "undirected"} edges. ` +
      `Assumed: the weights and coordinates are given, and the graph is the whole specimen. ` +
      `Selected: ${describeIds(view, selected)}.`;
  } else if (view.kind === "array") {
    const items = view.items;
    const model = ctx.scenario.substrate === "array" ? ctx.scenario.model : null;
    const boundary = items.length === 0
      ? "empty"
      : `${items[0].id} to ${items[items.length - 1].id}`;
    metrics.push(
      { label: "Items", value: String(items.length) },
      { label: "Parts", value: String(items.length), tone: "signal" },
      { label: "Selected", value: String(selected.length) },
      { label: "Marked", value: `${marked} / ${states.length}` },
    );
    body =
      `${items.length} item(s) in positions 0–${items.length - 1}. ` +
      `Boundary: ${boundary}; ${model?.sorted === true ? "declared sorted" : "order is data"}` +
      `${model?.target === undefined ? "" : `, target ${model.target}`}. ` +
      `Assumed: each item keeps its stable id while its position changes. ` +
      `Selected: ${describeIds(view, selected)}.`;
  } else if (view.kind === "grid") {
    const filled = view.cells.filter((cell) => cell.state !== "idle").length;
    metrics.push(
      { label: "Cells", value: `${view.rows} × ${view.cols}` },
      { label: "Parts", value: String(view.rows * view.cols), tone: "signal" },
      { label: "Filled", value: `${filled} / ${view.rows * view.cols}` },
      { label: "Selected", value: String(selected.length) },
      { label: "Marked", value: `${marked} / ${states.length}` },
    );
    body =
      `${view.rows} row(s) by ${view.cols} column(s). ` +
      `Boundary: row 0 and column 0 are base cases. ` +
      `Assumed: the two strings are the whole alignment and each cell stores one number. ` +
      `Selected: ${describeIds(view, selected)}; ${filled} cell(s) are filled.`;
  } else {
    metrics.push({ label: "Parts", value: String(states.length) });
  }

  return {
    available: true,
    readout: readout(
      ctx,
      "what-exists",
      `${marked} of ${states.length} exposed part(s) are marked at this frame. ${body}${mutationClause(ctx)}`,
    ),
    metrics,
    highlights: resolved(view, viewIds(view)),
    notePrompt: NOTE_PROMPTS["what-exists"],
  };
}

function projectWhatChanges(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;
  const previous = ctx.frameIndex > 0 ? ctx.run.frames[ctx.frameIndex - 1] : undefined;
  const currentStates = viewEntityStates(view);
  const previousStates = previous === undefined ? null : viewEntityStates(previous.view);

  // With no prior frame there is nothing to compare against: the seeded
  // starting state is not movement. Counting it as movement made the metric
  // contradict the starting-state readout.
  let moved = 0;
  const movedIds: string[] = [];
  if (previousStates !== null) {
    for (const [id, state] of currentStates) {
      if ((previousStates.get(id) ?? "idle") !== state) {
        moved += 1;
        movedIds.push(id);
      }
    }
  }
  const fixed = currentStates.size - moved;

  const highlights = resolved(
    view,
    highlightIds(ctx.frame, ["active", "flow", "warn", "emerge"]).length > 0
      ? highlightIds(ctx.frame, ["active", "flow", "warn", "emerge"])
      : activeIds(view),
  );

  const rule = UPDATE_RULE[ctx.scenario.strategy];
  const body =
    previous === undefined
      ? `This is the starting state: ${eventText(ctx.frame)} Nothing has moved yet; the update rule is ${rule}.`
      : `${moved} part(s) moved since the prior frame${movedIds.length === 0 ? "" : ` (${describeIds(view, movedIds)})`}; ${fixed} stayed fixed. ` +
        `Prior step: ${eventText(previous)} Current step: ${eventText(ctx.frame)} Update rule: ${rule}.`;

  return {
    available: true,
    readout: readout(ctx, "what-changes", body),
    metrics: [
      { label: "Frame", value: `${ctx.frameIndex + 1} / ${Math.max(1, ctx.run.frames.length)}` },
      { label: "Moved", value: String(moved), tone: moved > 0 ? "signal" : "neutral" },
      { label: "Fixed", value: String(fixed) },
    ],
    highlights,
    notePrompt: NOTE_PROMPTS["what-changes"],
  };
}

function projectWhatFlows(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;
  const terminal =
    ctx.frameIndex === ctx.run.frames.length - 1 && ctx.run.outcome === "done";

  if (view.kind === "graph") {
    const strategy = ctx.scenario.substrate === "graph" ? ctx.scenario.strategy : "bfs";
    const frontierLabel = FRONTIER_LABEL[strategy];
    const waiting = terminal ? "0" : metricValue(ctx.frame, frontierLabel) ?? "—";
    const active = terminal ? [] : activeIds(view);
    const edges = terminal
      ? []
      : view.edges.filter((edge) => edge.state === "active").map((edge) => edge.id);
    const motion = active.length + edges.length;
    const flowHighlights = terminal ? [] : highlightIds(ctx.frame, ["flow", "active"]);
    const body = terminal
      ? TERMINAL_FLOW
      : `${motion} part(s) in motion${active.length === 0 ? "" : ` around ${describeIds(view, active)}`}` +
        `${edges.length === 0 ? "" : `; edge ${describeIds(view, edges)} carries the step`}. ` +
        `${waiting} wait in the ${frontierLabel.toLowerCase()}; the ${BOTTLENECK[strategy]} sets the rate. ` +
        `Current step: ${eventText(ctx.frame)}`;
    return {
      available: true,
      readout: readout(ctx, "what-flows", body),
      metrics: [
        { label: "In motion", value: String(motion), tone: motion > 0 ? "signal" : "neutral" },
        { label: "Waiting", value: waiting },
        { label: "Flow edge", value: String(edges.length) },
      ],
      highlights: terminal ? [] : resolved(view, [...active, ...edges, ...flowHighlights]),
      notePrompt: NOTE_PROMPTS["what-flows"],
    };
  }

  if (view.kind === "array") {
    const pointers = view.pointers ?? [];
    const pointerIds: string[] = [];
    for (const pointer of pointers) {
      if (pointer.index >= 0 && pointer.index < view.items.length) {
        pointerIds.push(view.items[pointer.index].id);
      }
    }
    const active = terminal ? [] : activeIds(view);
    const segments = view.segments ?? [];
    const activeSegment = segments.find((segment) => segment.state === "active");
    let waiting = view.items.length - view.items.filter((item) => item.state === "done").length;
    if (activeSegment !== undefined) waiting = activeSegment.to - activeSegment.from + 1;
    const lo = pointers.find((pointer) => pointer.label === "lo");
    const hi = pointers.find((pointer) => pointer.label === "hi");
    if (lo !== undefined && hi !== undefined) waiting = Math.max(0, hi.index - lo.index + 1);
    if (terminal) waiting = 0;

    const pointerText =
      pointers.length === 0
        ? "no pointer is exposed"
        : pointers.map((pointer) => `${pointer.label}→item:${pointer.index}`).join(", ");
    const body = terminal
      ? TERMINAL_FLOW
      : `${pointerText}. ${active.length} item(s) are being compared or written; ${waiting} item(s) wait. ` +
        `The bottleneck is ${ctx.scenario.strategy === "merge-sort" ? "the two run heads" : ctx.scenario.strategy === "quick-sort" ? "the pivot comparison" : "the midpoint comparison"}. ` +
        `Current step: ${eventText(ctx.frame)}`;
    return {
      available: true,
      readout: readout(ctx, "what-flows", body),
      metrics: [
        { label: "In motion", value: String(active.length), tone: active.length > 0 ? "signal" : "neutral" },
        { label: "Waiting", value: String(waiting) },
        { label: "Pointers", value: String(pointers.length) },
      ],
      highlights: terminal
        ? []
        : resolved(view, [...active, ...pointerIds, ...highlightIds(ctx.frame, ["flow", "active"])]),
      notePrompt: NOTE_PROMPTS["what-flows"],
    };
  }

  if (view.kind === "grid") {
    const active = terminal ? [] : activeIds(view);
    const dependencies: string[] = [];
    const activeId = active.find((id) => cellRef(id) !== null);
    const ref = activeId === undefined ? null : cellRef(activeId);
    if (ref !== null) {
      for (const dependency of [
        { r: ref.r - 1, c: ref.c - 1 },
        { r: ref.r - 1, c: ref.c },
        { r: ref.r, c: ref.c - 1 },
      ]) {
        if (dependency.r >= 0 && dependency.r < view.rows && dependency.c >= 0 && dependency.c < view.cols) {
          dependencies.push(gridCellId(dependency.r, dependency.c));
        }
      }
    }
    const filled = view.cells.filter((cell) => cell.state !== "idle").length;
    const waiting = terminal ? 0 : view.rows * view.cols - filled;
    const body = terminal
      ? TERMINAL_FLOW
      : ref === null
        ? `No interior cell is in motion; the base row and column are seeded, and ${waiting} cell(s) wait.`
        : `Cell ${activeId} is in motion and waits on ${dependencies.length} neighbour(s); ${waiting} cell(s) still wait. ` +
          `One cell fills per frame, so that dependency set sets the rate. Current step: ${eventText(ctx.frame)}`;
    return {
      available: true,
      readout: readout(ctx, "what-flows", body),
      metrics: [
        { label: "In motion", value: String(active.length), tone: active.length > 0 ? "signal" : "neutral" },
        { label: "Waiting", value: String(waiting) },
        { label: "Dependencies", value: String(dependencies.length) },
      ],
      highlights: terminal
        ? []
        : resolved(view, [...active, ...dependencies, ...highlightIds(ctx.frame, ["flow", "active"])]),
      notePrompt: NOTE_PROMPTS["what-flows"],
    };
  }

  return {
    available: true,
    readout: readout(ctx, "what-flows", "No flow is exposed by this view."),
    metrics: [],
    highlights: [],
    notePrompt: NOTE_PROMPTS["what-flows"],
  };
}

function projectWhatLearns(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;
  const strategy = ctx.scenario.strategy;
  const copy = lensCopy("what-learns");

  if (strategy === "binary-search" && view.kind === "array") {
    const pointers = view.pointers ?? [];
    const range = metricValue(ctx.frame, "Candidate range") ?? "empty";
    const probes = metricValue(ctx.frame, "Probes") ?? "0";
    const lo = pointers.find((pointer) => pointer.label === "lo")?.index;
    const hi = pointers.find((pointer) => pointer.label === "hi")?.index;
    const bounds = lo === undefined || hi === undefined ? "no open bounds" : `lo ${lo}, hi ${hi}`;
    const active = activeIds(view);
    const body =
      `The adaptive state is the pair of search bounds (${bounds}); the probe index splits them. ` +
      `Update rule: each probe eliminates half the candidate range; if the probed value is below the target then lo := mid + 1, and if it is above then hi := mid - 1. ` +
      `At this frame the candidate range is ${range} after ${probes} probe(s).`;
    return {
      available: true,
      readout: readout(ctx, "what-learns", body),
      metrics: [
        { label: "Candidate range", value: range, tone: "signal" },
        { label: "Probes", value: probes },
        { label: "Bounds", value: bounds },
      ],
      highlights: resolved(view, [...active, ...highlightIds(ctx.frame, ["active", "done"])]),
      notePrompt: NOTE_PROMPTS["what-learns"],
    };
  }

  if (strategy === "dijkstra" && view.kind === "graph") {
    const active = activeIds(view);
    const edge = view.edges.find((item) => item.state === "active");
    const settled = metricValue(ctx.frame, "Settled") ?? "0";
    const frontier = metricValue(ctx.frame, "Frontier") ?? "0";
    const relaxations = metricValue(ctx.frame, "Relaxations") ?? "0";
    const activeNode = active.map((id) => view.nodes.find((node) => node.id === id)).find((node) => node !== undefined);
    const label = activeNode === undefined ? "no node is settling" : `${activeNode.label} carries ${activeNode.sub ?? "a label"}`;
    const body =
      `The adaptive state is the distance label on every reached node. ` +
      `Update rule: when u settles, each edge (u,v) relaxes d(v) := min(d(v), d(u) + w(u,v)); settled labels are final. ` +
      `At this frame ${label}${edge === undefined ? "" : ` and edge ${edge.from}→${edge.to} is relaxing`}; ${frontier} label(s) wait in the frontier after ${relaxations} relaxation(s).`;
    return {
      available: true,
      readout: readout(ctx, "what-learns", body),
      metrics: [
        { label: "Settled", value: settled, tone: "signal" },
        { label: "Frontier", value: frontier },
        { label: "Relaxations", value: relaxations },
      ],
      highlights: resolved(view, [...active, ...highlightIds(ctx.frame, ["active", "flow"])]),
      notePrompt: NOTE_PROMPTS["what-learns"],
    };
  }

  return {
    available: false,
    absenceReason: ABSENCE_REASON,
    readout: readout(
      ctx,
      "what-learns",
      `No adaptive mechanism. For "${copy.question}" this specimen has no stored model to update. ` +
        `${ABSENCE_REASON} The current step (${eventText(ctx.frame)}) only moves the specimen through its states.`,
    ),
    metrics: [
      { label: "Adaptive state", value: "none" },
      { label: "Frame", value: `${ctx.frameIndex + 1} / ${Math.max(1, ctx.run.frames.length)}` },
    ],
    highlights: [],
    notePrompt: NOTE_PROMPTS["what-learns"],
  };
}

function projectWhatPersists(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;
  const invariants = ctx.frame.invariants;
  const held = invariants.filter((invariant) => invariant.holds).length;
  const failed = invariants.filter((invariant) => !invariant.holds);

  const persistIds = highlightIds(ctx.frame, ["persist"]);
  const fallback = persistIds.length > 0 ? persistIds : doneIds(view).length > 0 ? doneIds(view) : activeIds(view);
  const highlights = resolved(
    view,
    fallback.length > 0 ? fallback : highlightIds(ctx.frame),
  );

  const body =
    invariants.length === 0
      ? "No invariant is declared at this frame, so nothing is claimed to persist."
      : `${held} of ${invariants.length} declared invariant(s) hold. ` +
        (failed.length === 0
          ? `All hold: ${invariants.map((invariant) => invariant.label).join("; ")}.`
          : `Failing: ${failed.map((invariant) => `${invariant.label} — ${invariant.detail}`).join("; ")}.`);

  return {
    available: true,
    readout: readout(ctx, "what-persists", body),
    metrics: [
      { label: "Held", value: `${held} / ${invariants.length}`, tone: failed.length === 0 ? "signal" : "warn" },
      { label: "Failing", value: String(failed.length), tone: failed.length > 0 ? "warn" : "neutral" },
    ],
    highlights,
    notePrompt: NOTE_PROMPTS["what-persists"],
  };
}

function projectWhatEmerges(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;

  if (view.kind === "graph") {
    const model = graphModel(ctx);
    if (model === null) {
      return {
        available: true,
        readout: readout(ctx, "what-emerges", "No graph is exposed at this frame."),
        metrics: [],
        highlights: [],
        notePrompt: NOTE_PROMPTS["what-emerges"],
      };
    }
    const analysis = analyzeGraph(model);
    const pattern =
      analysis.cyclicNodes.length > 0 ? analysis.cyclicNodes : analysis.deepestNodes;
    const settled = doneIds(view).length;
    const body =
      `${analysis.components} weak component(s), ${analysis.cycles} independent cycle(s), ` +
      `maximum degree ${analysis.maxDegree}, and ${analysis.levels} level(s) from the start. ` +
      `The global pattern is ${analysis.cyclicNodes.length > 0 ? "the cyclic cluster" : "the deepest frontier"} ` +
      `(${describeIds(view, pattern)}). ${settled}/${view.nodes.length} node(s) are settled at this frame.`;
    return {
      available: true,
      readout: readout(ctx, "what-emerges", body),
      metrics: [
        { label: "Components", value: String(analysis.components), tone: "signal" },
        { label: "Cycles", value: String(analysis.cycles), tone: analysis.cycles > 0 ? "warn" : "neutral" },
        { label: "Max degree", value: String(analysis.maxDegree) },
        { label: "Levels", value: String(analysis.levels) },
        { label: "Reached", value: `${analysis.reachable} / ${view.nodes.length}` },
      ],
      highlights: resolved(view, [
        ...pattern,
        ...highlightIds(ctx.frame, ["warn"]),
        ...activeIds(view),
      ]),
      notePrompt: NOTE_PROMPTS["what-emerges"],
    };
  }

  if (view.kind === "array") {
    const analysis = analyzeArray(view);
    const body =
      `${analysis.runs} ascending run(s); the longest run holds ${analysis.longestRun} item(s) ` +
      `(${describeIds(view, analysis.longestIds)}). ${analysis.inversions} inversion(s) remain and ` +
      `${analysis.duplicates} duplicate copy/copies are present. ` +
      `The run boundaries are global: no single item knows where its run starts or ends.`;
    return {
      available: true,
      readout: readout(ctx, "what-emerges", body),
      metrics: [
        { label: "Runs", value: String(analysis.runs), tone: "signal" },
        { label: "Longest run", value: String(analysis.longestRun) },
        { label: "Inversions", value: String(analysis.inversions), tone: analysis.inversions > 0 ? "warn" : "neutral" },
        { label: "Duplicates", value: String(analysis.duplicates) },
      ],
      highlights: resolved(view, [...analysis.longestIds, ...activeIds(view)]),
      notePrompt: NOTE_PROMPTS["what-emerges"],
    };
  }

  if (view.kind === "grid") {
    const { path, matches, start, end } = gridPath(ctx, view);
    const filled = view.cells.filter((cell) => cell.state !== "idle").length;
    const body =
      path.length === 0
        ? `No alignment path is visible yet: ${filled} of ${view.rows * view.cols} cell(s) are filled and only the base cases are seeded.`
        : `The alignment path runs from ${start} to ${end} through ${path.length} cell(s), with ${matches} matched character(s). ` +
          `${filled} of ${view.rows * view.cols} cell(s) are filled, so the global path is ${filled === view.rows * view.cols ? "complete" : "still forming"}. ` +
          `No single cell contains that path; it is read from the table's back-pointers.`;
    return {
      available: true,
      readout: readout(ctx, "what-emerges", body),
      metrics: [
        { label: "Path cells", value: String(path.length), tone: path.length > 0 ? "signal" : "neutral" },
        { label: "Matches", value: String(matches) },
        { label: "Filled", value: `${filled} / ${view.rows * view.cols}` },
      ],
      highlights: resolved(view, [...path, ...activeIds(view)]),
      notePrompt: NOTE_PROMPTS["what-emerges"],
    };
  }

  return {
    available: true,
    readout: readout(ctx, "what-emerges", "No global pattern is exposed by this view."),
    metrics: [],
    highlights: [],
    notePrompt: NOTE_PROMPTS["what-emerges"],
  };
}

const OUTCOME_TEXT: Record<RunContext["run"]["outcome"], string> = {
  done: "the deterministic trace ends in the done state",
  "max-steps": "the trace stops at the frame cap (max-steps)",
  cycle: "the trace ends on a cycle",
  invalid: "there is no valid trace",
};

function projectWhatWillHappen(ctx: RunContext): LensProjection {
  const view = ctx.frame.view;
  const total = ctx.run.frames.length;
  const remaining = Math.max(0, total - 1 - ctx.frameIndex);
  const nextFrames = ctx.run.frames.slice(ctx.frameIndex + 1, ctx.frameIndex + 4);
  const nextEvents = nextFrames
    .map((frame) => eventText(frame))
    .filter((text) => text !== "no event");
  const outcome = ctx.run.outcome;

  const body =
    nextFrames.length === 0
      ? `Extrapolation, not a probability: no future frames remain at frame ${ctx.frameIndex + 1}/${total}; ${OUTCOME_TEXT[outcome]}.`
      : `Extrapolation, not a probability: from frame ${ctx.frameIndex + 1}/${total} the deterministic trace has ${remaining} frame(s) left. ` +
        `Next: ${nextEvents[0] ?? "no declared event"}` +
        `${nextEvents.length <= 1 ? "." : ` Then: ${nextEvents.slice(1).join(" ")}`} ` +
        `${OUTCOME_TEXT[outcome]}.`;

  let futureIds: string[] = [];
  const next = ctx.run.frames[ctx.frameIndex + 1];
  if (next !== undefined) {
    futureIds = activeIds(next.view);
    if (futureIds.length === 0) futureIds = highlightIds(next, ["active", "flow", "emerge", "warn"]);
    if (futureIds.length === 0) futureIds = doneIds(next.view);
  }
  if (futureIds.length === 0) futureIds = activeIds(view);
  if (futureIds.length === 0) futureIds = highlightIds(ctx.frame);

  return {
    available: true,
    readout: readout(ctx, "what-will-happen", `${body}${mutationClause(ctx)}`),
    metrics: [
      { label: "Frames left", value: String(remaining), tone: remaining > 0 ? "signal" : "neutral" },
      { label: "Outcome", value: outcome, tone: outcome === "done" ? "signal" : outcome === "invalid" ? "warn" : "neutral" },
    ],
    highlights: resolved(view, futureIds),
    notePrompt: NOTE_PROMPTS["what-will-happen"],
  };
}

const PROJECTORS: Record<LensId, (ctx: RunContext) => LensProjection> = {
  "what-exists": projectWhatExists,
  "what-changes": projectWhatChanges,
  "what-flows": projectWhatFlows,
  "what-learns": projectWhatLearns,
  "what-persists": projectWhatPersists,
  "what-emerges": projectWhatEmerges,
  "what-will-happen": projectWhatWillHappen,
};

/** Project one lens at the context's frame. Pure in (scenario, frameIndex, run, mutations). */
export function projectLens(lens: LensId, ctx: RunContext): LensProjection {
  return PROJECTORS[lens](ctx);
}
