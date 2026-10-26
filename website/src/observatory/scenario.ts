import type { BoardView } from "../game/types";
import {
  ARRAY_STRATEGIES,
  GRAPH_STRATEGIES,
  GRID_STRATEGIES,
  LENS_IDS,
  SCAMPER_IDS,
  type Branch,
  type Draft,
  type GraphModel,
  type LensId,
  type Mutation,
  type ReaderBench,
  type ScamperId,
  type Scenario,
  type ScenarioParam,
  type Strategy,
  type Substrate,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const hasOnlyKeys = (record: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(record).every((key) => allowed.includes(key));

export function isSubstrate(value: unknown): value is Substrate {
  return value === "graph" || value === "array" || value === "grid";
}

export function isStrategy(value: unknown): value is Strategy {
  return (
    GRAPH_STRATEGIES.includes(value as never) ||
    ARRAY_STRATEGIES.includes(value as never) ||
    GRID_STRATEGIES.includes(value as never)
  );
}

export function isLensId(value: unknown): value is LensId {
  return LENS_IDS.includes(value as never);
}

export function isScamperId(value: unknown): value is ScamperId {
  return SCAMPER_IDS.includes(value as never);
}

function isGraphModel(value: unknown): value is GraphModel {
  if (!isRecord(value) || value.kind !== "graph") return false;
  if (!Array.isArray(value.nodes) || value.nodes.length < 1 || value.nodes.length > 30) {
    return false;
  }
  if (!Array.isArray(value.edges) || value.edges.length > 60) return false;

  const nodeIds = new Set<string>();
  for (const node of value.nodes) {
    if (!isRecord(node)) return false;
    if (!isNonEmptyString(node.id) || !isNonEmptyString(node.label)) return false;
    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) return false;
    if (nodeIds.has(node.id)) return false;
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of value.edges) {
    if (!isRecord(edge)) return false;
    if (!isNonEmptyString(edge.id) || edgeIds.has(edge.id)) return false;
    if (!isNonEmptyString(edge.from) || !isNonEmptyString(edge.to)) return false;
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return false;
    if (!isFiniteNumber(edge.weight)) return false;
    edgeIds.add(edge.id);
  }

  if (!isNonEmptyString(value.start) || !nodeIds.has(value.start)) return false;
  if (value.target !== undefined && (!isNonEmptyString(value.target) || !nodeIds.has(value.target))) {
    return false;
  }
  return typeof value.directed === "boolean";
}

function isArrayModel(value: unknown): boolean {
  if (!isRecord(value) || value.kind !== "array") return false;
  if (!Array.isArray(value.values) || value.values.length < 1 || value.values.length > 32) {
    return false;
  }
  if (!value.values.every(isFiniteNumber)) return false;
  if (value.target !== undefined && !isFiniteNumber(value.target)) return false;
  return typeof value.sorted === "boolean";
}

function isTableModel(value: unknown): boolean {
  if (!isRecord(value) || value.kind !== "table") return false;
  if (typeof value.a !== "string" || typeof value.b !== "string") return false;
  // The rendered grid is (a.length + 1) x (b.length + 1).
  return value.a.length <= 11 && value.b.length <= 13;
}

export function isScenario(value: unknown): value is Scenario {
  if (!isRecord(value)) return false;
  if (value.schema !== 1) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title)) return false;
  if (!isRecord(value.params)) return false;
  for (const param of Object.values(value.params)) {
    const primitive =
      typeof param === "string" || typeof param === "number" || typeof param === "boolean";
    if (!primitive) return false;
  }
  if (!isSubstrate(value.substrate) || !isStrategy(value.strategy)) return false;

  switch (value.substrate) {
    case "graph":
      return GRAPH_STRATEGIES.includes(value.strategy as never) && isGraphModel(value.model);
    case "array":
      return ARRAY_STRATEGIES.includes(value.strategy as never) && isArrayModel(value.model);
    case "grid":
      return GRID_STRATEGIES.includes(value.strategy as never) && isTableModel(value.model);
    default:
      return false;
  }
}

export function isMutation(value: unknown): value is Mutation {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["id", "card", "op", "label", "payload"])) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.op) || !isNonEmptyString(value.label)) {
    return false;
  }
  if (!isScamperId(value.card) || !isRecord(value.payload)) return false;
  return Object.values(value.payload).every(
    (item) =>
      typeof item === "string" || typeof item === "number" || typeof item === "boolean",
  );
}

export function isBranch(value: unknown): value is Branch {
  if (!isRecord(value)) return false;
  if (
    !hasOnlyKeys(value, [
      "version",
      "id",
      "parentId",
      "title",
      "scenario",
      "mutations",
      "lens",
      "frameIndex",
      "note",
      "createdAt",
      "updatedAt",
    ])
  ) {
    return false;
  }
  if (value.version !== 1) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title)) return false;
  if (value.parentId !== undefined && !isNonEmptyString(value.parentId)) return false;
  if (!isScenario(value.scenario) || !isLensId(value.lens)) return false;
  if (!Array.isArray(value.mutations) || value.mutations.length > 12) return false;
  if (!value.mutations.every(isMutation)) return false;
  if (!Number.isInteger(value.frameIndex) || Number(value.frameIndex) < 0) return false;
  if (typeof value.note !== "string" || value.note.length > 800) return false;
  if (!isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt)) return false;
  return true;
}

export function isDraft(value: unknown): value is Draft {
  if (!isRecord(value)) return false;
  if (
    !hasOnlyKeys(value, [
      "version",
      "savedAt",
      "scenario",
      "mutations",
      "lens",
      "frameIndex",
      "title",
      "note",
    ])
  ) {
    return false;
  }
  if (value.version !== 1) return false;
  if (!isFiniteNumber(value.savedAt) || !isScenario(value.scenario) || !isLensId(value.lens)) {
    return false;
  }
  if (!Array.isArray(value.mutations) || value.mutations.length > 12) return false;
  if (!value.mutations.every(isMutation)) return false;
  if (!Number.isInteger(value.frameIndex) || Number(value.frameIndex) < 0) return false;
  if (typeof value.title !== "string" || typeof value.note !== "string" || value.note.length > 800) {
    return false;
  }
  return true;
}

export function isReaderBench(value: unknown): value is ReaderBench {
  if (!isRecord(value)) return false;
  if (
    !hasOnlyKeys(value, [
      "version",
      "id",
      "title",
      "framing",
      "substrate",
      "strategy",
      "scenario",
      "createdAt",
    ])
  ) {
    return false;
  }
  if (value.version !== 1) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title)) return false;
  if (typeof value.framing !== "string" || !isSubstrate(value.substrate) || !isStrategy(value.strategy)) {
    return false;
  }
  if (!isScenario(value.scenario)) return false;
  if (value.scenario.substrate !== value.substrate) return false;
  if (value.scenario.strategy !== value.strategy) return false;
  return isFiniteNumber(value.createdAt);
}

export function cloneScenario<T extends Scenario>(scenario: T): T {
  return structuredClone(scenario);
}

export function scenarioBytes(scenario: Scenario): number {
  return new TextEncoder().encode(JSON.stringify(scenario)).length;
}

export function gridCellId(row: number, col: number): string {
  return `${row}:${col}`;
}

/** Stable entity ids a lens may highlight in a rendered frame. */
export function viewIds(view: BoardView): Set<string> {
  const ids = new Set<string>();
  switch (view.kind) {
    case "graph":
      for (const node of view.nodes) ids.add(node.id);
      for (const edge of view.edges) ids.add(edge.id);
      break;
    case "array":
      for (const item of view.items) ids.add(item.id);
      break;
    case "grid":
      for (const cell of view.cells) ids.add(gridCellId(cell.r, cell.c));
      break;
    default:
      break;
  }
  return ids;
}

export function isScenarioParam(value: unknown): value is ScenarioParam {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
