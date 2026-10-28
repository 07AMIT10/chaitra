/**
 * The game's level contract. A level is a pure state machine plus a view
 * description; the React shell only renders and calls moves. Level modules
 * must treat their state as immutable and return a new state from `apply`.
 */

export type Act = 1 | 2 | 3;
export type Status = "playing" | "won" | "lost";

export type Move = {
  id: string;
  label: string;
  /** Board moves are bound to an element; tray moves are rendered as buttons. */
  placement?: "board" | "tray";
  disabled?: boolean;
};

export type GameEvent = {
  text: string;
  kind?: "info" | "good" | "bad";
};

export type NodeState = "idle" | "active" | "done" | "bad" | "target";
export type EdgeState = "idle" | "active" | "done" | "bad" | "ghost";

type ViewBase = { caption?: string };

export type GraphView = ViewBase & {
  kind: "graph";
  height?: number;
  nodes: {
    id: string;
    x: number;
    y: number;
    label: string;
    sub?: string;
    state?: NodeState;
    moveId?: string;
    aria?: string;
  }[];
  edges: {
    id: string;
    from: string;
    to: string;
    label?: string;
    state?: EdgeState;
    directed?: boolean;
    moveId?: string;
    aria?: string;
  }[];
};

export type ArrayView = ViewBase & {
  kind: "array";
  items: {
    id: string;
    value: number | string;
    label?: string;
    state?: NodeState;
    moveId?: string;
    aria?: string;
  }[];
  pointers?: { label: string; index: number }[];
  segments?: { from: number; to: number; label?: string; state?: "idle" | "active" | "done" }[];
};

export type GridView = ViewBase & {
  kind: "grid";
  rows: number;
  cols: number;
  cells: {
    r: number;
    c: number;
    value: number | string;
    state?: NodeState;
    moveId?: string;
    aria?: string;
  }[];
  rowLabels?: string[];
  colLabels?: string[];
};

export type TreeView = ViewBase & {
  kind: "tree";
  height?: number;
  nodes: {
    id: string;
    x: number;
    y: number;
    label: string;
    weight?: number;
    state?: NodeState;
    moveId?: string;
    aria?: string;
  }[];
  edges: { from: string; to: string; state?: EdgeState; label?: string }[];
};

export type PairingView = ViewBase & {
  kind: "pairing";
  left: { id: string; label: string; state?: NodeState; moveId?: string }[];
  right: { id: string; label: string; state?: NodeState; moveId?: string }[];
  links: { left: string; right: string; state?: EdgeState }[];
};

export type NumberView = ViewBase & {
  kind: "number";
  value: number;
  target: number;
  history: { x: number; y: number }[];
  xLabel?: string;
  yLabel?: string;
  note?: string;
};

export type FormulaView = ViewBase & {
  kind: "formula";
  rows: {
    id: string;
    label: string;
    formula: string;
    state?: NodeState;
    moveId?: string;
  }[];
  outputs: { id: string; label: string; formula: string; state?: NodeState; moveId?: string }[];
};

export type BoardView =
  | GraphView
  | ArrayView
  | GridView
  | TreeView
  | PairingView
  | NumberView
  | FormulaView;

export type LevelMeta = {
  slug: string;
  /** 1-based position in the campaign. */
  number: number;
  act: Act;
  title: string;
  algorithm: string;
  /** The mathematics page this mission practises. */
  page: string;
  minutes: number;
  scenario: { from: string; code?: string; lines: string[]; question: string };
  goal: string;
  constraint?: string;
  hints: string[];
  win: string;
  invariant: string;
};

export type ApplyResult<S> = {
  state: S;
  events: GameEvent[];
  /** Reject the move: the state does not change and the reader sees why. */
  error?: string;
  /** Override the status after an accepted move (e.g. a fatal branch). */
  status?: Status;
};

export type LevelModule<S = any> = {
  meta: LevelMeta;
  initial: S;
  moves: (state: S) => Move[];
  apply: (state: S, moveId: string) => ApplyResult<S>;
  view: (state: S) => BoardView;
  status: (state: S) => Status;
  score?: (state: S) => { stars: 1 | 2 | 3; detail: string };
  /** A known winning sequence of move ids; the level test plays it. */
  solution: string[];
};

export type LevelMetaOnly = Pick<
  LevelMeta,
  "slug" | "number" | "act" | "title" | "algorithm" | "page" | "minutes"
>;
