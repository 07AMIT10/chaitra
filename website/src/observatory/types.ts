import type { BoardView } from "../game/types";

export const LENS_IDS = [
  "what-exists",
  "what-changes",
  "what-flows",
  "what-learns",
  "what-persists",
  "what-emerges",
  "what-will-happen",
] as const;

export const SCAMPER_IDS = [
  "substitute",
  "combine",
  "adapt",
  "modify",
  "put-to-another-use",
  "eliminate",
  "reverse",
] as const;

export const GRAPH_STRATEGIES = ["dijkstra", "bfs", "dfs", "topological"] as const;
export const ARRAY_STRATEGIES = ["binary-search", "merge-sort", "quick-sort"] as const;
export const GRID_STRATEGIES = ["edit-distance", "lcs"] as const;

export type Substrate = "graph" | "array" | "grid";
export type GraphStrategy = (typeof GRAPH_STRATEGIES)[number];
export type ArrayStrategy = (typeof ARRAY_STRATEGIES)[number];
export type GridStrategy = (typeof GRID_STRATEGIES)[number];
export type Strategy = GraphStrategy | ArrayStrategy | GridStrategy;
export type LensId = (typeof LENS_IDS)[number];
export type ScamperId = (typeof SCAMPER_IDS)[number];
export type ScenarioParam = string | number | boolean;

export type GraphNode = { id: string; label: string; x: number; y: number };
export type GraphEdge = { id: string; from: string; to: string; weight: number };
export type GraphModel = {
  kind: "graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
  start: string;
  target?: string;
  directed: boolean;
};

export type ArrayModel = {
  kind: "array";
  values: number[];
  target?: number;
  sorted: boolean;
};

export type TableModel = { kind: "table"; a: string; b: string };

type ScenarioBase = {
  schema: 1;
  id: string;
  title: string;
  params: Record<string, ScenarioParam>;
};

export type Scenario =
  | (ScenarioBase & {
      substrate: "graph";
      strategy: GraphStrategy;
      model: GraphModel;
    })
  | (ScenarioBase & {
      substrate: "array";
      strategy: ArrayStrategy;
      model: ArrayModel;
    })
  | (ScenarioBase & {
      substrate: "grid";
      strategy: GridStrategy;
      model: TableModel;
    });

export type Diagnostic = { code: string; path: string; message: string };
export type Metric = { label: string; value: string; tone?: "neutral" | "signal" | "warn" };
export type HighlightRole = "active" | "done" | "flow" | "persist" | "emerge" | "warn";
export type Highlight = { id: string; role: HighlightRole };
export type TraceEvent = { step: number; text: string; kind?: "info" | "good" | "bad" };
export type Invariant = { label: string; holds: boolean; detail: string };

export type Frame = {
  index: number;
  view: BoardView;
  metrics: Metric[];
  highlights: Highlight[];
  events: TraceEvent[];
  invariants: Invariant[];
  stateHash: string;
};

export type RunOutcome = "done" | "max-steps" | "cycle" | "invalid";
export type RunResult = {
  frames: Frame[];
  outcome: RunOutcome;
  diagnostics: Diagnostic[];
  hash: string;
};

export type Runner = {
  substrate: Substrate;
  strategies: readonly Strategy[];
  validate(scenario: Scenario): Diagnostic[];
  run(scenario: Scenario): RunResult;
};

export type LensProjection = {
  available: boolean;
  absenceReason?: string;
  readout: string;
  metrics: Metric[];
  highlights: string[];
  notePrompt: string;
};

export type RunContext = {
  scenario: Scenario;
  run: RunResult;
  frame: Frame;
  frameIndex: number;
  mutations: Mutation[];
};

export type Mutation = {
  id: string;
  card: ScamperId;
  op: string;
  label: string;
  payload: Record<string, ScenarioParam>;
};

export type MutationDiff = {
  summary: string;
  changes: { path: string; before: string; after: string }[];
};

export type MutationResult =
  | { ok: true; mutation: Mutation; scenario: Scenario; diff: MutationDiff; summary: string }
  | { ok: false; diagnostics: Diagnostic[] };

export type Branch = {
  version: 1;
  id: string;
  parentId?: string;
  title: string;
  scenario: Scenario;
  mutations: Mutation[];
  lens: LensId;
  frameIndex: number;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type Draft = {
  version: 1;
  savedAt: number;
  scenario: Scenario;
  mutations: Mutation[];
  lens: LensId;
  frameIndex: number;
  title: string;
  note: string;
};

export type ReaderBench = {
  version: 1;
  id: string;
  title: string;
  framing: string;
  substrate: Substrate;
  strategy: Strategy;
  scenario: Scenario;
  createdAt: number;
};

export type LiveBench = {
  id: string;
  title: string;
  framing: string;
  what: string;
  substrate: Substrate;
  strategies: readonly Strategy[];
  defaultScenario: Scenario;
  articleHref: string;
  gameHref?: string;
};

export type FieldSpecimen = {
  id: string;
  kind: "algorithm" | "study";
  title: string;
  summary: string;
  href: string;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};
