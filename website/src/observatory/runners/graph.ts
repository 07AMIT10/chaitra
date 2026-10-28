import type { EdgeState, GraphView, NodeState } from "../../game/types";
import { canonicalJson, hash32, scenarioHash } from "../hash";
import {
  GRAPH_STRATEGIES,
  type Diagnostic,
  type Frame,
  type GraphEdge,
  type GraphModel,
  type GraphStrategy,
  type Highlight,
  type HighlightRole,
  type Invariant,
  type Metric,
  type RunResult,
  type Runner,
  type Scenario,
  type TraceEvent,
} from "../types";

type GraphScenario = Extract<Scenario, { substrate: "graph" }>;

const MAX_FRAMES = 300;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isGraphStrategy = (value: unknown): value is GraphStrategy =>
  GRAPH_STRATEGIES.includes(value as never);

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const sortedIds = (values: Iterable<string>): string[] => [...values].sort(compare);

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "∞";
}

function validateGraphScenario(scenario: Scenario): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const fail = (code: string, path: string, message: string): void => {
    diagnostics.push({ code, path, message });
  };

  const raw = scenario as unknown;
  if (!isRecord(raw)) {
    fail("graph/scenario", "/", "A scenario must be an object.");
    return diagnostics;
  }

  if (raw.schema !== 1) fail("graph/schema", "schema", "The scenario schema must be 1.");
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    fail("graph/id", "id", "The scenario needs a non-empty id.");
  }
  if (typeof raw.title !== "string" || raw.title.length === 0) {
    fail("graph/title", "title", "The scenario needs a non-empty title.");
  }
  if (!isRecord(raw.params)) {
    fail("graph/params", "params", "The scenario needs a params record.");
  } else {
    for (const [key, value] of Object.entries(raw.params)) {
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        fail("graph/params", `params.${key}`, "Scenario params must be strings, numbers, or booleans.");
      }
    }
  }

  if (raw.substrate !== "graph") {
    fail("graph/substrate", "substrate", "The graph runner only accepts graph scenarios.");
    if (!isGraphStrategy(raw.strategy)) {
      fail("graph/strategy", "strategy", "The scenario strategy is not a graph strategy.");
    }
    return diagnostics;
  }

  if (!isGraphStrategy(raw.strategy)) {
    fail("graph/strategy", "strategy", `Choose one of ${GRAPH_STRATEGIES.join(", ")}.`);
  }

  const model = raw.model;
  if (!isRecord(model) || model.kind !== "graph") {
    fail("graph/model", "model", "A graph scenario needs a graph model.");
    return diagnostics;
  }

  const nodeIds = new Set<string>();
  if (!Array.isArray(model.nodes)) {
    fail("graph/nodes", "model.nodes", "The model needs a nodes array.");
  } else {
    if (model.nodes.length < 1 || model.nodes.length > 30) {
      fail("graph/nodes", "model.nodes", "A graph needs between 1 and 30 nodes.");
    }
    model.nodes.forEach((value, index) => {
      const path = `model.nodes[${index}]`;
      if (!isRecord(value)) {
        fail("graph/node", path, "Each node must be an object.");
        return;
      }
      if (typeof value.id !== "string" || value.id.length === 0) {
        fail("graph/node", `${path}.id`, "Each node needs a non-empty id.");
      } else if (nodeIds.has(value.id)) {
        fail("graph/node-id", `${path}.id`, `Duplicate node id ${value.id}.`);
      } else {
        nodeIds.add(value.id);
      }
      if (typeof value.label !== "string" || value.label.length === 0) {
        fail("graph/node-label", `${path}.label`, "Each node needs a non-empty label.");
      }
      if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
        fail("graph/node-position", path, "Node coordinates must be finite numbers.");
      }
    });
  }

  const edgeIds = new Set<string>();
  if (!Array.isArray(model.edges)) {
    fail("graph/edges", "model.edges", "The model needs an edges array.");
  } else {
    if (model.edges.length > 60) {
      fail("graph/edges", "model.edges", "A graph may have at most 60 edges.");
    }
    model.edges.forEach((value, index) => {
      const path = `model.edges[${index}]`;
      if (!isRecord(value)) {
        fail("graph/edge", path, "Each edge must be an object.");
        return;
      }
      if (typeof value.id !== "string" || value.id.length === 0) {
        fail("graph/edge", `${path}.id`, "Each edge needs a non-empty id.");
      } else if (edgeIds.has(value.id)) {
        fail("graph/edge-id", `${path}.id`, `Duplicate edge id ${value.id}.`);
      } else {
        edgeIds.add(value.id);
      }

      const from = value.from;
      const to = value.to;
      if (typeof from !== "string" || from.length === 0) {
        fail("graph/edge-endpoint", `${path}.from`, "An edge needs a from id.");
      } else if (!nodeIds.has(from)) {
        fail("graph/edge-endpoint", `${path}.from`, `Edge endpoint ${from} is not a node.`);
      }
      if (typeof to !== "string" || to.length === 0) {
        fail("graph/edge-endpoint", `${path}.to`, "An edge needs a to id.");
      } else if (!nodeIds.has(to)) {
        fail("graph/edge-endpoint", `${path}.to`, `Edge endpoint ${to} is not a node.`);
      }

      if (!isFiniteNumber(value.weight)) {
        fail("graph/weight", `${path}.weight`, "Edge weights must be finite numbers.");
      } else if (raw.strategy === "dijkstra" && value.weight < 0) {
        fail(
          "graph/negative-weight",
          `${path}.weight`,
          "Dijkstra needs non-negative edge weights.",
        );
      }
    });
  }

  if (typeof model.start !== "string" || model.start.length === 0) {
    fail("graph/start", "model.start", "The model needs a start node id.");
  } else if (!nodeIds.has(model.start)) {
    fail("graph/start", "model.start", `Start node ${model.start} is not a node.`);
  }

  if (model.target !== undefined) {
    if (typeof model.target !== "string" || model.target.length === 0) {
      fail("graph/target", "model.target", "The target must be a node id.");
    } else if (!nodeIds.has(model.target)) {
      fail("graph/target", "model.target", `Target node ${model.target} is not a node.`);
    }
  }

  if (typeof model.directed !== "boolean") {
    fail("graph/directed", "model.directed", "The model needs a directed boolean.");
  } else if (raw.strategy === "topological" && model.directed !== true) {
    fail("graph/topological", "model.directed", "Topological sort needs a directed graph.");
  }

  return diagnostics;
}

type Arc = { edge: GraphEdge; to: string };

function buildAdjacency(model: GraphModel): Map<string, Arc[]> {
  const adjacency = new Map<string, Arc[]>();
  for (const node of model.nodes) adjacency.set(node.id, []);
  for (const edge of model.edges) {
    adjacency.get(edge.from)?.push({ edge, to: edge.to });
    if (!model.directed) adjacency.get(edge.to)?.push({ edge, to: edge.from });
  }
  for (const arcs of adjacency.values()) {
    arcs.sort((a, b) => compare(a.edge.id, b.edge.id) || compare(a.to, b.to));
  }
  return adjacency;
}

type TraceState = {
  current: string | null;
  done: ReadonlySet<string>;
  frontier: ReadonlySet<string>;
  discovery: ReadonlySet<string>;
  activeEdge: string | null;
  back: ReadonlySet<string>;
  cross?: ReadonlySet<string>;
  warn: ReadonlySet<string>;
  distances?: ReadonlyMap<string, number>;
  order?: ReadonlyMap<string, number>;
  indegree?: ReadonlyMap<string, number>;
};

type EmitOptions = {
  state: TraceState;
  sub: (id: string) => string;
  event: string;
  eventKind?: TraceEvent["kind"];
  metrics: Metric[];
  invariants: Invariant[];
};

type TraceContext = {
  scenario: GraphScenario;
  model: GraphModel;
  strategy: GraphStrategy;
  frames: Frame[];
  truncated: boolean;
  scenarioDigest: string;
  labelOf: (id: string) => string;
  emit: (options: EmitOptions) => boolean;
};

const HIGHLIGHT_PRIORITY: Record<HighlightRole, number> = {
  warn: 6,
  active: 5,
  emerge: 4,
  flow: 3,
  persist: 2,
  done: 1,
};

function buildHighlights(state: TraceState, target?: string): Highlight[] {
  const roles = new Map<string, HighlightRole>();
  const add = (id: string, role: HighlightRole): void => {
    const current = roles.get(id);
    if (current === undefined || HIGHLIGHT_PRIORITY[role] > HIGHLIGHT_PRIORITY[current]) {
      roles.set(id, role);
    }
  };

  for (const id of state.done) add(id, "done");
  for (const id of state.discovery) add(id, "persist");
  for (const id of state.back) add(id, "warn");
  if (state.activeEdge !== null) add(state.activeEdge, "flow");
  if (state.current !== null) add(state.current, "active");
  if (target !== undefined) add(target, "emerge");
  for (const id of state.warn) add(id, "warn");

  return [...roles.entries()]
    .sort(
      ([idA, roleA], [idB, roleB]) =>
        HIGHLIGHT_PRIORITY[roleB] - HIGHLIGHT_PRIORITY[roleA] || compare(idA, idB),
    )
    .map(([id, role]) => ({ id, role }));
}

const VERBS: Record<GraphStrategy, string> = {
  dijkstra: "settled",
  bfs: "visited",
  dfs: "visited",
  topological: "emitted",
};

function buildGraphView(
  model: GraphModel,
  strategy: GraphStrategy,
  state: TraceState,
  sub: (id: string) => string,
  labelOf: (id: string) => string,
): GraphView {
  const target = model.target;

  const nodes = model.nodes.map((node) => {
    const isStart = node.id === model.start;
    const isTarget = node.id === target;
    const markers = `${isStart ? " · start" : ""}${isTarget ? " · target" : ""}`;
    const subText = `${sub(node.id)}${markers}`;
    const nodeState: NodeState = state.warn.has(node.id)
      ? "bad"
      : state.current === node.id
        ? "active"
        : state.done.has(node.id)
          ? "done"
          : isTarget
            ? "target"
            : "idle";
    const roles = [isStart ? "start" : undefined, isTarget ? "target" : undefined].filter(
      (role): role is string => role !== undefined,
    );
    const prefix = roles.length > 0 ? ` (${roles.join(", ")})` : "";

    return {
      id: node.id,
      x: node.x,
      y: node.y,
      label: node.label,
      sub: subText,
      state: nodeState,
      aria: `${node.label}${prefix}. ${subText}.`,
    };
  });

  const edges = model.edges.map((edge) => {
    const isBack = state.back.has(edge.id);
    const isCross = state.cross?.has(edge.id) ?? false;
    const edgeState: EdgeState = isBack
      ? "bad"
      : isCross
        ? "done"
        : state.activeEdge === edge.id
          ? "active"
          : state.discovery.has(edge.id)
            ? "done"
            : "idle";
    const direction = model.directed ? "to" : "and";
    const note = isBack ? " Back edge." : isCross ? " Forward/cross edge." : "";

    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: formatNumber(edge.weight),
      state: edgeState,
      directed: model.directed,
      aria: `${labelOf(edge.from)} ${direction} ${labelOf(edge.to)}, weight ${formatNumber(
        edge.weight,
      )}.${note}`,
    };
  });

  return {
    kind: "graph",
    height: 340,
    caption: `${strategy} · ${state.done.size}/${model.nodes.length} ${
      VERBS[strategy]
    }${target === undefined ? "" : ` · target ${labelOf(target)}`}`,
    nodes,
    edges,
  };
}

function serialiseMap(
  map: ReadonlyMap<string, number> | undefined,
): [string, number][] | undefined {
  if (map === undefined) return undefined;
  return [...map.entries()].sort(([a], [b]) => compare(a, b));
}

function stateSignature(
  scenarioDigest: string,
  strategy: GraphStrategy,
  state: TraceState,
): string {
  return hash32(
    canonicalJson({
      scenario: scenarioDigest,
      strategy,
      current: state.current,
      done: sortedIds(state.done),
      frontier: sortedIds(state.frontier),
      discovery: sortedIds(state.discovery),
      activeEdge: state.activeEdge,
      back: sortedIds(state.back),
      cross: state.cross === undefined ? undefined : sortedIds(state.cross),
      warn: sortedIds(state.warn),
      distances: serialiseMap(state.distances),
      order: serialiseMap(state.order),
      indegree: serialiseMap(state.indegree),
    }),
  );
}

function createContext(scenario: GraphScenario): TraceContext {
  const model = scenario.model;
  const strategy = scenario.strategy;
  const frames: Frame[] = [];
  const scenarioDigest = scenarioHash(scenario);
  const labels = new Map(model.nodes.map((node) => [node.id, node.label] as const));
  const labelOf = (id: string): string => labels.get(id) ?? id;

  const context: TraceContext = {
    scenario,
    model,
    strategy,
    frames,
    truncated: false,
    scenarioDigest,
    labelOf,
    emit(options): boolean {
      if (frames.length >= MAX_FRAMES) {
        context.truncated = true;
        return false;
      }
      const index = frames.length;
      const view = buildGraphView(model, strategy, options.state, options.sub, labelOf);
      const highlights = buildHighlights(options.state, model.target);
      const event: TraceEvent = { step: index, text: options.event };
      if (options.eventKind !== undefined) event.kind = options.eventKind;
      frames.push({
        index,
        view,
        metrics: options.metrics,
        highlights,
        events: [event],
        invariants: options.invariants,
        stateHash: stateSignature(scenarioDigest, strategy, options.state),
      });
      return true;
    },
  };

  return context;
}

function runBfs(context: TraceContext): void {
  const { model, labelOf, emit } = context;
  const adjacency = buildAdjacency(model);
  const done = new Set<string>();
  const discovered = new Set<string>([model.start]);
  const distances = new Map<string, number>([[model.start, 0]]);
  const order = new Map<string, number>();
  const discovery = new Set<string>();
  const back = new Set<string>();
  const warn = new Set<string>();
  const queue: string[] = [model.start];
  let head = 0;

  const sub = (id: string): string => {
    const rank = order.get(id);
    const distance = distances.get(id);
    if (rank !== undefined && distance !== undefined) return `#${rank} · d${distance}`;
    if (distance !== undefined) return `d${distance} · queued`;
    return "— · unreached";
  };

  const metrics = (): Metric[] => {
    const result: Metric[] = [
      { label: "Visited", value: `${done.size} / ${model.nodes.length}`, tone: "signal" },
      { label: "Queue", value: String(queue.length - head) },
      { label: "Tree edges", value: String(discovery.size) },
    ];
    if (model.target !== undefined) {
      const distance = distances.get(model.target);
      result.push({
        label: "Target distance",
        value: distance === undefined ? "unreached" : `d${distance}`,
        tone: distance === undefined ? "neutral" : "signal",
      });
    }
    return result;
  };

  const invariants = (): Invariant[] => [
    {
      label: "Queue holds discovered nodes only",
      holds: true,
      detail: `${queue.length - head} queued`,
    },
    {
      label: "Each node is enqueued once",
      holds: true,
      detail: `${done.size} visited`,
    },
    {
      label: "Visits follow breadth-first layers",
      holds: true,
      detail: `${discovery.size} discovery edges`,
    },
  ];

  const first = emit({
    state: {
      current: model.start,
      done,
      frontier: new Set(queue.slice(head)),
      discovery,
      activeEdge: null,
      back,
      warn,
      distances,
      order,
    },
    sub,
    event: `Queue ${labelOf(model.start)}; BFS begins.`,
    metrics: metrics(),
    invariants: invariants(),
  });
  if (!first) return;

  while (head < queue.length) {
    const id = queue[head] as string;
    head += 1;
    done.add(id);
    order.set(id, done.size);

    const found: GraphEdge[] = [];
    for (const arc of adjacency.get(id) ?? []) {
      if (discovered.has(arc.to)) continue;
      discovered.add(arc.to);
      distances.set(arc.to, (distances.get(id) ?? 0) + 1);
      discovery.add(arc.edge.id);
      queue.push(arc.to);
      found.push(arc.edge);
    }

    const names = found.map((item) => labelOf(item.to));
    const event =
      names.length > 0
        ? `Visit ${labelOf(id)}; enqueue ${names.join(", ")}.`
        : `Visit ${labelOf(id)}; no new neighbour.`;

    const ok = emit({
      state: {
        current: id,
        done,
        frontier: new Set(queue.slice(head)),
        discovery,
        activeEdge: null,
        back,
        warn,
        distances,
        order,
      },
      sub,
      event,
      metrics: metrics(),
      invariants: invariants(),
    });
    if (!ok) return;
  }
}

type DfsFrame = { id: string; next: number };

type DfsShade = "white" | "gray" | "black";

function runDfs(context: TraceContext): void {
  const { model, labelOf, emit } = context;
  const adjacency = buildAdjacency(model);
  const shade = new Map<string, DfsShade>();
  for (const node of model.nodes) shade.set(node.id, "white");
  const done = new Set<string>();
  const open = new Set<string>();
  const order = new Map<string, number>();
  const discovery = new Set<string>();
  const back = new Set<string>();
  const cross = new Set<string>();
  const warn = new Set<string>();
  const stack: DfsFrame[] = [];

  const sub = (id: string): string => {
    const rank = order.get(id);
    if (rank === undefined) return "— · unreached";
    return shade.get(id) === "gray" ? `#${rank} · open` : `#${rank} · done`;
  };

  const metrics = (): Metric[] => [
    { label: "Visited", value: `${done.size} / ${model.nodes.length}`, tone: "signal" },
    { label: "Stack", value: String(stack.length) },
    {
      label: "Back edges",
      value: String(back.size),
      tone: back.size > 0 ? "warn" : "neutral",
    },
    { label: "Cross edges", value: String(cross.size), tone: "neutral" },
  ];

  const invariants = (): Invariant[] => [
    {
      label: "Stack holds gray nodes only",
      holds: true,
      detail: `${stack.length} open`,
    },
    {
      label: "Back edges are recorded, not fatal",
      holds: true,
      detail: `${back.size} back edge${back.size === 1 ? "" : "s"}, ${cross.size} cross edge${
        cross.size === 1 ? "" : "s"
      }`,
    },
    {
      label: "Each node is visited once",
      holds: true,
      detail: `${done.size} visited`,
    },
  ];

  const frameState = (current: string | null, activeEdge: string | null = null): TraceState => ({
    current,
    done,
    frontier: new Set(open),
    discovery,
    activeEdge,
    back,
    cross,
    warn,
    order,
  });

  const emitFrame = (options: {
    current: string | null;
    activeEdge?: string | null;
    event: string;
    eventKind?: TraceEvent["kind"];
  }): boolean =>
    emit({
      state: frameState(options.current, options.activeEdge ?? null),
      sub,
      event: options.event,
      eventKind: options.eventKind,
      metrics: metrics(),
      invariants: invariants(),
    });

  const enter = (id: string): void => {
    shade.set(id, "gray");
    open.add(id);
    order.set(id, order.size + 1);
    stack.push({ id, next: 0 });
  };

  enter(model.start);
  const first = emitFrame({
    current: model.start,
    event: `Push ${labelOf(model.start)}; DFS begins.`,
  });
  if (!first) return;

  const root = emitFrame({
    current: model.start,
    event: `Visit ${labelOf(model.start)}; root of the DFS tree.`,
  });
  if (!root) return;

  while (stack.length > 0) {
    const frame = stack[stack.length - 1] as DfsFrame;
    const arcs = adjacency.get(frame.id) ?? [];

    if (frame.next < arcs.length) {
      const arc = arcs[frame.next] as Arc;
      frame.next += 1;

      if (discovery.has(arc.edge.id) || back.has(arc.edge.id) || cross.has(arc.edge.id)) {
        continue;
      }

      const targetShade = shade.get(arc.to) ?? "white";
      if (targetShade === "white") {
        discovery.add(arc.edge.id);
        enter(arc.to);
        const ok = emitFrame({
          current: arc.to,
          event: `Visit ${labelOf(arc.to)}; tree edge ${labelOf(frame.id)}→${labelOf(arc.to)}.`,
        });
        if (!ok) return;
      } else if (targetShade === "gray") {
        back.add(arc.edge.id);
        const ok = emitFrame({
          current: frame.id,
          activeEdge: arc.edge.id,
          event: `Record back edge ${labelOf(frame.id)}→${labelOf(arc.to)}; ${labelOf(
            arc.to,
          )} is still open on the recursion path.`,
        });
        if (!ok) return;
      } else {
        cross.add(arc.edge.id);
        const ok = emitFrame({
          current: frame.id,
          activeEdge: arc.edge.id,
          event: `Record cross edge ${labelOf(frame.id)}→${labelOf(arc.to)}; ${labelOf(
            arc.to,
          )} is already finished.`,
        });
        if (!ok) return;
      }
      continue;
    }

    shade.set(frame.id, "black");
    open.delete(frame.id);
    done.add(frame.id);
    stack.pop();
    const parent = stack.length > 0 ? (stack[stack.length - 1] as DfsFrame).id : null;
    const ok = emitFrame({
      current: parent,
      event:
        parent === null
          ? `Finish ${labelOf(frame.id)}; DFS complete.`
          : `Finish ${labelOf(frame.id)}; return to ${labelOf(parent)}.`,
    });
    if (!ok) return;
  }
}

function runTopological(context: TraceContext): Diagnostic[] {
  const { model, labelOf, emit } = context;
  const adjacency = buildAdjacency(model);
  const indegree = new Map<string, number>();
  for (const node of model.nodes) indegree.set(node.id, 0);
  for (const edge of model.edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const ready = new Set<string>();
  for (const node of model.nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) ready.add(node.id);
  }

  const done = new Set<string>();
  const order = new Map<string, number>();
  const discovery = new Set<string>();
  const back = new Set<string>();
  const warn = new Set<string>();

  const sub = (id: string): string => {
    const rank = order.get(id);
    if (rank !== undefined) return `#${rank} · emitted`;
    const degree = indegree.get(id) ?? 0;
    if (warn.has(id)) return `cycle · indeg ${degree}`;
    if (ready.has(id)) return `ready · indeg ${degree}`;
    return `waiting · indeg ${degree}`;
  };

  const metrics = (): Metric[] => {
    const remaining = model.nodes.length - done.size;
    return [
      { label: "Emitted", value: `${done.size} / ${model.nodes.length}`, tone: "signal" },
      { label: "Ready", value: String(ready.size) },
      {
        label: "Remaining",
        value: String(remaining),
        tone: warn.size > 0 ? "warn" : "neutral",
      },
    ];
  };

  const invariants = (): Invariant[] => {
    const remaining = model.nodes.length - done.size;
    return [
      {
        label: "Emitted nodes had in-degree zero",
        holds: true,
        detail: `${done.size} emitted`,
      },
      {
        label: "No node is emitted twice",
        holds: true,
        detail: `${order.size} ranks`,
      },
      {
        label: "Every node is emitted",
        holds: remaining === 0,
        detail: remaining === 0 ? "all nodes emitted" : `${remaining} remain`,
      },
    ];
  };

  const initialReady = sortedIds(ready);
  const first = emit({
    state: {
      current: null,
      done,
      frontier: new Set(ready),
      discovery,
      activeEdge: null,
      back,
      warn,
      order,
      indegree,
    },
    sub,
    event:
      initialReady.length > 0
        ? `Ready: ${initialReady.map(labelOf).join(", ")} (in-degree 0).`
        : "No node has in-degree 0; the graph is cyclic.",
    eventKind: initialReady.length > 0 ? "info" : "bad",
    metrics: metrics(),
    invariants: invariants(),
  });
  if (!first) return [];

  while (ready.size > 0 && done.size < model.nodes.length) {
    const id = sortedIds(ready)[0] as string;
    ready.delete(id);
    done.add(id);
    order.set(id, done.size);

    const newlyReady = new Set<string>();
    for (const arc of adjacency.get(id) ?? []) {
      const next = (indegree.get(arc.to) ?? 0) - 1;
      indegree.set(arc.to, next);
      if (next === 0) {
        ready.add(arc.to);
        newlyReady.add(arc.to);
      }
    }

    const added = sortedIds(newlyReady).map(labelOf);
    const event =
      added.length > 0
        ? `Emit ${labelOf(id)}; ready adds ${added.join(", ")}.`
        : `Emit ${labelOf(id)}; ready holds ${ready.size}.`;

    const ok = emit({
      state: {
        current: id,
        done,
        frontier: new Set(ready),
        discovery,
        activeEdge: null,
        back,
        warn,
        order,
        indegree,
      },
      sub,
      event,
      metrics: metrics(),
      invariants: invariants(),
    });
    if (!ok) return [];
  }

  if (done.size < model.nodes.length) {
    const remaining = sortedIds(model.nodes.map((node) => node.id).filter((id) => !done.has(id)));
    for (const id of remaining) warn.add(id);
    const diagnostic: Diagnostic = {
      code: "graph/cycle",
      path: "model.edges",
      message: `Cycle detected: ${remaining.map(labelOf).join(", ")} remain at positive in-degree.`,
    };
    emit({
      state: {
        current: null,
        done,
        frontier: new Set(ready),
        discovery,
        activeEdge: null,
        back,
        warn,
        order,
        indegree,
      },
      sub,
      event: `Cycle: ${remaining.map(labelOf).join(", ")} never reach in-degree 0.`,
      eventKind: "bad",
      metrics: metrics(),
      invariants: invariants(),
    });
    return [diagnostic];
  }

  return [];
}

function runDijkstra(context: TraceContext): void {
  const { model, labelOf, emit } = context;
  const adjacency = buildAdjacency(model);
  const done = new Set<string>();
  const distances = new Map<string, number>([[model.start, 0]]);
  const discovery = new Set<string>();
  const parentEdge = new Map<string, string>();
  const back = new Set<string>();
  const warn = new Set<string>();
  const nodeIds = sortedIds(model.nodes.map((node) => node.id));
  let relaxations = 0;

  const frontier = (): Set<string> =>
    new Set([...distances.keys()].filter((id) => !done.has(id)));

  const sub = (id: string): string => {
    const distance = distances.get(id);
    if (distance === undefined) return "∞ · unreached";
    return `${formatNumber(distance)} · ${done.has(id) ? "settled" : "frontier"}`;
  };

  const metrics = (): Metric[] => {
    const result: Metric[] = [
      { label: "Settled", value: `${done.size} / ${model.nodes.length}`, tone: "signal" },
      { label: "Frontier", value: String(frontier().size) },
      { label: "Relaxations", value: String(relaxations) },
    ];
    if (model.target !== undefined) {
      const distance = distances.get(model.target);
      result.push({
        label: "Target label",
        value: distance === undefined ? "∞" : formatNumber(distance),
        tone: done.has(model.target) ? "signal" : "neutral",
      });
    }
    return result;
  };

  const invariants = (): Invariant[] => {
    const open = frontier();
    const settledValues = [...done].flatMap((id) => {
      const value = distances.get(id);
      return value === undefined ? [] : [value];
    });
    const frontierValues = [...open].flatMap((id) => {
      const value = distances.get(id);
      return value === undefined ? [] : [value];
    });
    const maxSettled = settledValues.length > 0 ? Math.max(...settledValues) : 0;
    const minFrontier = frontierValues.length > 0 ? Math.min(...frontierValues) : Infinity;
    return [
      {
        label: "Settled labels are final",
        holds: true,
        detail: `${done.size} settled`,
      },
      {
        label: "Relaxations only decrease labels",
        holds: true,
        detail: `${relaxations} relaxation${relaxations === 1 ? "" : "s"}`,
      },
      {
        label: "No settled label exceeds a frontier label",
        holds: maxSettled <= minFrontier,
        detail:
          minFrontier === Infinity
            ? "frontier empty"
            : `${formatNumber(maxSettled)} ≤ ${formatNumber(minFrontier)}`,
      },
      {
        label: "Edge weights are non-negative",
        holds: true,
        detail: "validated before the run",
      },
      {
        label: "The target is inspected, not a stopping rule",
        holds: true,
        detail: model.target === undefined ? "no target" : labelOf(model.target),
      },
    ];
  };

  const first = emit({
    state: {
      current: model.start,
      done,
      frontier: frontier(),
      discovery,
      activeEdge: null,
      back,
      warn,
      distances,
    },
    sub,
    event: `Label ${labelOf(model.start)} = 0; frontier holds ${labelOf(model.start)}.`,
    metrics: metrics(),
    invariants: invariants(),
  });
  if (!first) return;

  while (true) {
    let bestId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const id of nodeIds) {
      if (done.has(id)) continue;
      const distance = distances.get(id);
      if (distance === undefined) continue;
      if (distance < bestDistance || (distance === bestDistance && (bestId === null || compare(id, bestId) < 0))) {
        bestId = id;
        bestDistance = distance;
      }
    }
    if (bestId === null) return;

    const settledId = bestId;
    done.add(settledId);

    const settled = emit({
      state: {
        current: settledId,
        done,
        frontier: frontier(),
        discovery,
        activeEdge: null,
        back,
        warn,
        distances,
      },
      sub,
      event: `Settle ${labelOf(settledId)} at ${formatNumber(bestDistance)}.`,
      metrics: metrics(),
      invariants: invariants(),
    });
    if (!settled) return;

    for (const arc of adjacency.get(settledId) ?? []) {
      if (done.has(arc.to)) continue;
      const candidate = bestDistance + arc.edge.weight;
      const previous = distances.get(arc.to);
      if (previous !== undefined && candidate >= previous) continue;

      distances.set(arc.to, candidate);
      relaxations += 1;
      const oldEdge = parentEdge.get(arc.to);
      if (oldEdge !== undefined) discovery.delete(oldEdge);
      parentEdge.set(arc.to, arc.edge.id);
      discovery.add(arc.edge.id);

      const event =
        previous === undefined
          ? `Relax ${labelOf(settledId)}→${labelOf(arc.to)}: ${formatNumber(
              bestDistance,
            )} + ${formatNumber(arc.edge.weight)} = ${formatNumber(
              candidate,
            )}; ${labelOf(arc.to)} enters the frontier.`
          : `Relax ${labelOf(settledId)}→${labelOf(arc.to)}: ${formatNumber(
              bestDistance,
            )} + ${formatNumber(arc.edge.weight)} = ${formatNumber(
              candidate,
            )}; ${labelOf(arc.to)} falls from ${formatNumber(previous)} to ${formatNumber(
              candidate,
            )}.`;

      const ok = emit({
        state: {
          current: settledId,
          done,
          frontier: frontier(),
          discovery,
          activeEdge: arc.edge.id,
          back,
          warn,
          distances,
        },
        sub,
        event,
        eventKind: "good",
        metrics: metrics(),
        invariants: invariants(),
      });
      if (!ok) return;
    }
  }
}

function executeGraph(scenario: GraphScenario): RunResult {
  const context = createContext(scenario);
  const strategy = scenario.strategy;
  let cycleDiagnostics: Diagnostic[] = [];

  switch (strategy) {
    case "bfs":
      runBfs(context);
      break;
    case "dfs":
      runDfs(context);
      break;
    case "topological":
      cycleDiagnostics = runTopological(context);
      break;
    case "dijkstra":
      runDijkstra(context);
      break;
  }

  const outcome = context.truncated
    ? "max-steps"
    : cycleDiagnostics.length > 0
      ? "cycle"
      : "done";

  return {
    frames: context.frames,
    outcome,
    diagnostics: cycleDiagnostics,
    hash: scenarioHash(scenario),
  };
}

export const graphRunner: Runner = {
  substrate: "graph",
  strategies: GRAPH_STRATEGIES,
  validate: validateGraphScenario,
  run(scenario: Scenario): RunResult {
    const diagnostics = validateGraphScenario(scenario);
    if (diagnostics.length > 0) {
      return {
        frames: [],
        outcome: "invalid",
        diagnostics,
        hash: scenarioHash(scenario),
      };
    }
    return executeGraph(scenario as GraphScenario);
  },
};
