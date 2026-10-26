import { useEffect, useId, useRef, useState } from "react";
import { isScenario } from "../../observatory/scenario";
import { validateScenario } from "../../observatory/runners";
import type {
  ArrayModel,
  Diagnostic,
  GraphEdge,
  GraphModel,
  GraphNode,
  Scenario,
  TableModel,
} from "../../observatory/types";
import type { InspectorProps } from "./ui-types";

const GRAPH_NODE_CAP = 30;
const GRAPH_EDGE_CAP = 60;
const ARRAY_CAP = 32;
const GRID_A_CAP = 11;
const GRID_B_CAP = 13;

type NodeDraft = { id: string; label: string; x: string; y: string };
type EdgeDraft = { id: string; from: string; to: string; weight: string };

type GraphDraft = {
  kind: "graph";
  nodes: NodeDraft[];
  edges: EdgeDraft[];
  start: string;
  target: string;
  directed: boolean;
};

type ArrayDraft = { kind: "array"; values: string; target: string };
type GridDraft = { kind: "grid"; a: string; b: string };
type Draft = GraphDraft | ArrayDraft | GridDraft;

type BuildResult =
  | { ok: true; scenario: Scenario }
  | { ok: false; diagnostics: Diagnostic[] };

function draftOf(scenario: Scenario): Draft {
  switch (scenario.substrate) {
    case "graph": {
      const model = scenario.model;
      return {
        kind: "graph",
        nodes: model.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          x: String(node.x),
          y: String(node.y),
        })),
        edges: model.edges.map((edge) => ({
          id: edge.id,
          from: edge.from,
          to: edge.to,
          weight: String(edge.weight),
        })),
        start: model.start,
        target: model.target ?? "",
        directed: model.directed,
      };
    }
    case "array":
      return {
        kind: "array",
        values: scenario.model.values.join(", "),
        target: scenario.model.target === undefined ? "" : String(scenario.model.target),
      };
    case "grid":
      return { kind: "grid", a: scenario.model.a, b: scenario.model.b };
  }
}

function nextId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let index = 1;
  while (used.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

function tokensOf(text: string): string[] {
  return text.split(/[\s,]+/).filter((token) => token.length > 0);
}

function readNumber(
  value: string,
  path: string,
  label: string,
  diagnostics: Diagnostic[],
): number {
  const trimmed = value.trim();
  if (trimmed === "") {
    diagnostics.push({
      code: "inspector/required",
      path,
      message: `${label} is required.`,
    });
    return Number.NaN;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    diagnostics.push({
      code: "inspector/number",
      path,
      message: `${label} must be a finite number.`,
    });
    return Number.NaN;
  }
  return parsed;
}

function finish(candidate: Scenario): BuildResult {
  if (!isScenario(candidate)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "scenario/invalid",
          path: "$",
          message: "The scenario does not match the observatory contract.",
        },
      ],
    };
  }
  const diagnostics = validateScenario(candidate);
  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return { ok: true, scenario: candidate };
}

function buildGraph(base: Extract<Scenario, { substrate: "graph" }>, draft: GraphDraft): BuildResult {
  const diagnostics: Diagnostic[] = [];
  const nodeIds = new Set<string>();

  const nodes: GraphNode[] = draft.nodes.map((node, index) => {
    const id = node.id.trim();
    const label = node.label.trim();
    if (id === "") {
      diagnostics.push({
        code: "inspector/node-id",
        path: `model.nodes[${index}].id`,
        message: `Node ${index + 1} needs an id.`,
      });
    } else if (nodeIds.has(id)) {
      diagnostics.push({
        code: "inspector/node-id",
        path: `model.nodes[${index}].id`,
        message: `Node id “${id}” is used twice.`,
      });
    } else {
      nodeIds.add(id);
    }
    if (label === "") {
      diagnostics.push({
        code: "inspector/node-label",
        path: `model.nodes[${index}].label`,
        message: `Node ${index + 1} needs a label.`,
      });
    }
    return {
      id,
      label,
      x: readNumber(node.x, `model.nodes[${index}].x`, `Node ${index + 1} x`, diagnostics),
      y: readNumber(node.y, `model.nodes[${index}].y`, `Node ${index + 1} y`, diagnostics),
    };
  });

  const edgeIds = new Set<string>();
  const edges: GraphEdge[] = draft.edges.map((edge, index) => {
    const id = edge.id.trim();
    const from = edge.from.trim();
    const to = edge.to.trim();
    if (id === "") {
      diagnostics.push({
        code: "inspector/edge-id",
        path: `model.edges[${index}].id`,
        message: `Edge ${index + 1} needs an id.`,
      });
    } else if (edgeIds.has(id)) {
      diagnostics.push({
        code: "inspector/edge-id",
        path: `model.edges[${index}].id`,
        message: `Edge id “${id}” is used twice.`,
      });
    } else {
      edgeIds.add(id);
    }
    if (!nodeIds.has(from)) {
      diagnostics.push({
        code: "inspector/edge-endpoint",
        path: `model.edges[${index}].from`,
        message: `Edge ${index + 1} starts at an unknown node.`,
      });
    }
    if (!nodeIds.has(to)) {
      diagnostics.push({
        code: "inspector/edge-endpoint",
        path: `model.edges[${index}].to`,
        message: `Edge ${index + 1} ends at an unknown node.`,
      });
    }
    return {
      id,
      from,
      to,
      weight: readNumber(
        edge.weight,
        `model.edges[${index}].weight`,
        `Edge ${index + 1} weight`,
        diagnostics,
      ),
    };
  });

  const start = draft.start.trim();
  const target = draft.target.trim();
  if (start === "") {
    diagnostics.push({
      code: "inspector/start",
      path: "model.start",
      message: "Choose a start node.",
    });
  } else if (!nodeIds.has(start)) {
    diagnostics.push({
      code: "inspector/start",
      path: "model.start",
      message: `Start node “${start}” is not in the node list.`,
    });
  }
  if (target !== "" && !nodeIds.has(target)) {
    diagnostics.push({
      code: "inspector/target",
      path: "model.target",
      message: `Target node “${target}” is not in the node list.`,
    });
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const model: GraphModel = {
    kind: "graph",
    nodes,
    edges,
    start,
    directed: draft.directed,
  };
  if (target !== "") model.target = target;

  return finish({
    schema: base.schema,
    id: base.id,
    title: base.title,
    params: base.params,
    substrate: "graph",
    strategy: base.strategy,
    model,
  });
}

function buildArray(base: Extract<Scenario, { substrate: "array" }>, draft: ArrayDraft): BuildResult {
  const diagnostics: Diagnostic[] = [];
  const tokens = tokensOf(draft.values);

  if (tokens.length === 0) {
    diagnostics.push({
      code: "inspector/values",
      path: "model.values",
      message: "The array needs between 1 and 32 values.",
    });
  } else if (tokens.length > ARRAY_CAP) {
    diagnostics.push({
      code: "inspector/values",
      path: "model.values",
      message: `The array holds at most ${ARRAY_CAP} values; found ${tokens.length}.`,
    });
  }

  const values = tokens.map((token, index) => {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) {
      diagnostics.push({
        code: "inspector/value",
        path: `model.values[${index}]`,
        message: `“${token}” is not a finite number.`,
      });
      return Number.NaN;
    }
    return parsed;
  });

  let target: number | undefined;
  if (draft.target.trim() !== "") {
    target = readNumber(draft.target, "model.target", "Target", diagnostics);
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const sorted = values.every((value, index) => index === 0 || values[index - 1] <= value);
  const model: ArrayModel = { kind: "array", values, sorted };
  if (target !== undefined) model.target = target;

  return finish({
    schema: base.schema,
    id: base.id,
    title: base.title,
    params: base.params,
    substrate: "array",
    strategy: base.strategy,
    model,
  });
}

function buildGrid(base: Extract<Scenario, { substrate: "grid" }>, draft: GridDraft): BuildResult {
  const diagnostics: Diagnostic[] = [];
  if (draft.a.length > GRID_A_CAP) {
    diagnostics.push({
      code: "inspector/grid-a",
      path: "model.a",
      message: `The row string holds at most ${GRID_A_CAP} characters.`,
    });
  }
  if (draft.b.length > GRID_B_CAP) {
    diagnostics.push({
      code: "inspector/grid-b",
      path: "model.b",
      message: `The column string holds at most ${GRID_B_CAP} characters.`,
    });
  }
  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const model: TableModel = { kind: "table", a: draft.a, b: draft.b };
  return finish({
    schema: base.schema,
    id: base.id,
    title: base.title,
    params: base.params,
    substrate: "grid",
    strategy: base.strategy,
    model,
  });
}

function candidateOf(base: Scenario, draft: Draft): BuildResult {
  if (base.substrate === "graph") {
    if (draft.kind !== "graph") return { ok: false, diagnostics: [mismatch()] };
    return buildGraph(base, draft);
  }
  if (base.substrate === "array") {
    if (draft.kind !== "array") return { ok: false, diagnostics: [mismatch()] };
    return buildArray(base, draft);
  }
  if (draft.kind !== "grid") return { ok: false, diagnostics: [mismatch()] };
  return buildGrid(base, draft);
}

function mismatch(): Diagnostic {
  return {
    code: "inspector/mismatch",
    path: "$",
    message: "The editor does not match the mounted scenario.",
  };
}

export function Inspector({ scenario, selectedId, onChange, onSelect, onClose }: InspectorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(scenario));
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [status, setStatus] = useState("Edits stay local until you apply them.");
  const scenarioRef = useRef(JSON.stringify(scenario));
  const hintBase = useId();

  useEffect(() => {
    const next = JSON.stringify(scenario);
    if (next === scenarioRef.current) return;
    scenarioRef.current = next;
    setDraft(draftOf(scenario));
    setDiagnostics([]);
    setStatus("Editor reset to the current scenario.");
  }, [scenario]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(scenario));

  const apply = () => {
    const result = candidateOf(scenario, draft);
    if (!result.ok) {
      setDiagnostics(result.diagnostics);
      setStatus(
        result.diagnostics.length === 1
          ? "Not applied: one issue needs attention."
          : `Not applied: ${result.diagnostics.length} issues need attention.`,
      );
      return;
    }
    setDiagnostics([]);
    setStatus("Applied. The bench reruns with the new scenario.");
    onChange(result.scenario);
  };

  const discard = () => {
    setDraft(draftOf(scenario));
    setDiagnostics([]);
    setStatus("Draft discarded.");
  };

  const graphDraft = draft.kind === "graph" ? draft : null;
  const arrayDraft = draft.kind === "array" ? draft : null;
  const gridDraft = draft.kind === "grid" ? draft : null;

  const patchGraph = (patch: Partial<GraphDraft>) => {
    setDraft((current) => (current.kind === "graph" ? { ...current, ...patch } : current));
  };

  const updateNode = (index: number, patch: Partial<NodeDraft>) => {
    setDraft((current) =>
      current.kind === "graph"
        ? {
            ...current,
            nodes: current.nodes.map((node, position) =>
              position === index ? { ...node, ...patch } : node,
            ),
          }
        : current,
    );
  };

  const updateEdge = (index: number, patch: Partial<EdgeDraft>) => {
    setDraft((current) =>
      current.kind === "graph"
        ? {
            ...current,
            edges: current.edges.map((edge, position) =>
              position === index ? { ...edge, ...patch } : edge,
            ),
          }
        : current,
    );
  };

  const addNode = () => {
    setDraft((current) => {
      if (current.kind !== "graph" || current.nodes.length >= GRAPH_NODE_CAP) return current;
      const id = nextId("n", current.nodes.map((node) => node.id.trim()));
      const order = current.nodes.length;
      return {
        ...current,
        nodes: [
          ...current.nodes,
          {
            id,
            label: id.toUpperCase(),
            x: String(60 + (order % 5) * 120),
            y: String(Math.min(300, 60 + Math.floor(order / 5) * 70)),
          },
        ],
      };
    });
  };

  const removeNode = (index: number) => {
    const target = graphDraft?.nodes[index];
    if (target && selectedId === target.id.trim()) onSelect(null);
    setDraft((current) => {
      if (current.kind !== "graph" || current.nodes.length <= 1) return current;
      const removed = current.nodes[index];
      if (!removed) return current;
      const removedId = removed.id.trim();
      const nodes = current.nodes.filter((_, position) => position !== index);
      const remaining = new Set(nodes.map((node) => node.id.trim()));
      const fallback = nodes[0]?.id.trim() ?? "";
      return {
        ...current,
        nodes,
        edges: current.edges.filter(
          (edge) => edge.from.trim() !== removedId && edge.to.trim() !== removedId,
        ),
        start: remaining.has(current.start.trim()) ? current.start : fallback,
        target: remaining.has(current.target.trim()) ? current.target : "",
      };
    });
  };

  const addEdge = () => {
    setDraft((current) => {
      if (current.kind !== "graph" || current.edges.length >= GRAPH_EDGE_CAP) return current;
      const id = nextId("e", current.edges.map((edge) => edge.id.trim()));
      const from = current.nodes[0]?.id.trim() ?? "";
      const to = current.nodes[1]?.id.trim() ?? from;
      return { ...current, edges: [...current.edges, { id, from, to, weight: "1" }] };
    });
  };

  const removeEdge = (index: number) => {
    const target = graphDraft?.edges[index];
    if (target && selectedId === target.id.trim()) onSelect(null);
    setDraft((current) =>
      current.kind === "graph"
        ? { ...current, edges: current.edges.filter((_, position) => position !== index) }
        : current,
    );
  };

  const addValue = () => {
    setDraft((current) => {
      if (current.kind !== "array") return current;
      const tokens = tokensOf(current.values);
      if (tokens.length >= ARRAY_CAP) return current;
      const last = tokens.length > 0 ? Number(tokens[tokens.length - 1]) : Number.NaN;
      const next = Number.isFinite(last) ? String(last + 1) : "0";
      return {
        ...current,
        values: current.values.trim() === "" ? next : `${current.values.trimEnd()}, ${next}`,
      };
    });
  };

  const removeValue = () => {
    setDraft((current) => {
      if (current.kind !== "array") return current;
      const tokens = tokensOf(current.values);
      tokens.pop();
      return { ...current, values: tokens.join(", ") };
    });
  };

  const nodeIds = graphDraft
    ? graphDraft.nodes.map((node) => node.id.trim()).filter((id) => id !== "")
    : [];
  const startMissing =
    graphDraft !== null && graphDraft.start !== "" && !nodeIds.includes(graphDraft.start.trim());
  const targetMissing =
    graphDraft !== null && graphDraft.target !== "" && !nodeIds.includes(graphDraft.target.trim());
  const arrayTokens = arrayDraft ? tokensOf(arrayDraft.values) : [];

  return (
    <aside className="obs-inspector" aria-label="Scenario inspector">
      <header className="obs-inspector__head">
        <div>
          <p className="obs-inspector__kicker">Inspector</p>
          <h2 className="obs-inspector__title">{scenario.title}</h2>
          <p className="obs-inspector__meta obs-mono">
            {scenario.substrate} · {scenario.strategy} · {scenario.id}
          </p>
        </div>
        <button
          type="button"
          className="obs-inspector__close"
          onClick={onClose}
          aria-label="Close inspector"
        >
          Close
        </button>
      </header>

      <form
        className="obs-inspector__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        {graphDraft && (
          <>
            <fieldset className="obs-inspector__group">
              <legend>
                Nodes <span className="obs-inspector__count">{graphDraft.nodes.length}/{GRAPH_NODE_CAP}</span>
              </legend>
              <ul className="obs-inspector__rows">
                {graphDraft.nodes.map((node, index) => {
                  const selected = selectedId !== null && selectedId === node.id.trim();
                  return (
                    <li
                      key={index}
                      className={`obs-inspector__row${selected ? " is-selected" : ""}`}
                      aria-current={selected ? "true" : undefined}
                      onClick={() => {
                        if (node.id.trim() !== "") onSelect(node.id.trim());
                      }}
                      onFocusCapture={() => {
                        if (node.id.trim() !== "") onSelect(node.id.trim());
                      }}
                    >
                      <div className="obs-inspector__row-head">
                        <span className="obs-inspector__tag">node {index + 1}</span>
                        <button
                          type="button"
                          className="obs-inspector__remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeNode(index);
                          }}
                          disabled={graphDraft.nodes.length <= 1}
                          aria-label={`Remove node ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="obs-inspector__fields obs-inspector__fields--node">
                        <label>
                          ID
                          <input
                            value={node.id}
                            aria-label={`Node ${index + 1} id`}
                            spellCheck={false}
                            onChange={(event) => updateNode(index, { id: event.target.value })}
                          />
                        </label>
                        <label>
                          Label
                          <input
                            value={node.label}
                            aria-label={`Node ${index + 1} label`}
                            onChange={(event) => updateNode(index, { label: event.target.value })}
                          />
                        </label>
                        <label>
                          X
                          <input
                            value={node.x}
                            inputMode="decimal"
                            aria-label={`Node ${index + 1} x coordinate`}
                            onChange={(event) => updateNode(index, { x: event.target.value })}
                          />
                        </label>
                        <label>
                          Y
                          <input
                            value={node.y}
                            inputMode="decimal"
                            aria-label={`Node ${index + 1} y coordinate`}
                            onChange={(event) => updateNode(index, { y: event.target.value })}
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="obs-inspector__actions">
                <button
                  type="button"
                  onClick={addNode}
                  disabled={graphDraft.nodes.length >= GRAPH_NODE_CAP}
                >
                  Add node
                </button>
              </div>
            </fieldset>

            <fieldset className="obs-inspector__group">
              <legend>
                Edges <span className="obs-inspector__count">{graphDraft.edges.length}/{GRAPH_EDGE_CAP}</span>
              </legend>
              {graphDraft.edges.length === 0 && (
                <p className="obs-inspector__hint">No edges yet. Add one to connect the nodes.</p>
              )}
              <ul className="obs-inspector__rows">
                {graphDraft.edges.map((edge, index) => {
                  const selected = selectedId !== null && selectedId === edge.id.trim();
                  return (
                    <li
                      key={index}
                      className={`obs-inspector__row${selected ? " is-selected" : ""}`}
                      aria-current={selected ? "true" : undefined}
                      onClick={() => {
                        if (edge.id.trim() !== "") onSelect(edge.id.trim());
                      }}
                      onFocusCapture={() => {
                        if (edge.id.trim() !== "") onSelect(edge.id.trim());
                      }}
                    >
                      <div className="obs-inspector__row-head">
                        <span className="obs-inspector__tag">edge {index + 1}</span>
                        <button
                          type="button"
                          className="obs-inspector__remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeEdge(index);
                          }}
                          aria-label={`Remove edge ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="obs-inspector__fields">
                        <label>
                          ID
                          <input
                            value={edge.id}
                            aria-label={`Edge ${index + 1} id`}
                            spellCheck={false}
                            onChange={(event) => updateEdge(index, { id: event.target.value })}
                          />
                        </label>
                        <label>
                          From
                          <input
                            value={edge.from}
                            list={`${hintBase}-nodes`}
                            aria-label={`Edge ${index + 1} from node`}
                            spellCheck={false}
                            onChange={(event) => updateEdge(index, { from: event.target.value })}
                          />
                        </label>
                        <label>
                          To
                          <input
                            value={edge.to}
                            list={`${hintBase}-nodes`}
                            aria-label={`Edge ${index + 1} to node`}
                            spellCheck={false}
                            onChange={(event) => updateEdge(index, { to: event.target.value })}
                          />
                        </label>
                        <label>
                          Weight
                          <input
                            value={edge.weight}
                            inputMode="decimal"
                            aria-label={`Edge ${index + 1} weight`}
                            onChange={(event) => updateEdge(index, { weight: event.target.value })}
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="obs-inspector__actions">
                <button
                  type="button"
                  onClick={addEdge}
                  disabled={graphDraft.edges.length >= GRAPH_EDGE_CAP}
                >
                  Add edge
                </button>
              </div>
              <datalist id={`${hintBase}-nodes`}>
                {nodeIds.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            </fieldset>

            <fieldset className="obs-inspector__group">
              <legend>Traversal</legend>
              <div className="obs-inspector__fields">
                <label>
                  Start
                  <select
                    value={graphDraft.start}
                    aria-label="Start node"
                    onChange={(event) => patchGraph({ start: event.target.value })}
                  >
                    {graphDraft.start === "" && (
                      <option value="" disabled>
                        Choose a node
                      </option>
                    )}
                    {startMissing && (
                      <option value={graphDraft.start}>{graphDraft.start} (missing)</option>
                    )}
                    {graphDraft.nodes.map((node, index) =>
                      node.id.trim() === "" ? null : (
                        <option key={index} value={node.id.trim()}>
                          {node.label.trim() || node.id.trim()}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Target
                  <select
                    value={graphDraft.target}
                    aria-label="Target node"
                    onChange={(event) => patchGraph({ target: event.target.value })}
                  >
                    <option value="">— none —</option>
                    {targetMissing && (
                      <option value={graphDraft.target}>{graphDraft.target} (missing)</option>
                    )}
                    {graphDraft.nodes.map((node, index) =>
                      node.id.trim() === "" ? null : (
                        <option key={index} value={node.id.trim()}>
                          {node.label.trim() || node.id.trim()}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label className="obs-inspector__check">
                <input
                  type="checkbox"
                  checked={graphDraft.directed}
                  onChange={(event) => patchGraph({ directed: event.target.checked })}
                />
                <span>Directed edges</span>
              </label>
              <p className="obs-inspector__hint">
                Strategy stays {scenario.strategy}; change specimens to change strategy.
              </p>
            </fieldset>
          </>
        )}

        {arrayDraft && (
          <fieldset className="obs-inspector__group">
            <legend>Values</legend>
            <label className="obs-inspector__wide">
              Values (comma-separated)
              <textarea
                rows={3}
                value={arrayDraft.values}
                spellCheck={false}
                aria-describedby={`${hintBase}-array-hint`}
                onChange={(event) =>
                  setDraft((current) =>
                    current.kind === "array"
                      ? { ...current, values: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <p id={`${hintBase}-array-hint`} className="obs-inspector__hint">
              {arrayTokens.length} of {ARRAY_CAP} values · status: 1–32 numbers · “sorted” is
              recomputed on apply.
            </p>
            <div className="obs-inspector__actions">
              <button type="button" onClick={addValue} disabled={arrayTokens.length >= ARRAY_CAP}>
                Add value
              </button>
              <button type="button" onClick={removeValue} disabled={arrayTokens.length === 0}>
                Remove last
              </button>
            </div>
            {arrayTokens.length > 0 && (
              <ul className="obs-inspector__chips" aria-label="Values in edit order">
                {arrayTokens.map((token, index) => {
                  const id = `item:${index}`;
                  const selected = selectedId === id;
                  return (
                    <li key={`${index}-${token}`}>
                      <button
                        type="button"
                        className={selected ? "is-selected" : undefined}
                        aria-pressed={selected}
                        onClick={() => onSelect(id)}
                      >
                        <span className="obs-mono">{token}</span>
                        <span className="obs-inspector__chip-index">{index}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <label>
              Target (optional)
              <input
                value={arrayDraft.target}
                inputMode="decimal"
                aria-label="Target value"
                onChange={(event) =>
                  setDraft((current) =>
                    current.kind === "array"
                      ? { ...current, target: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <p className="obs-inspector__hint">
              Strategy stays {scenario.strategy}.
            </p>
          </fieldset>
        )}

        {gridDraft && (
          <fieldset className="obs-inspector__group">
            <legend>Strings</legend>
            <div className="obs-inspector__fields">
              <label>
                a · rows
                <input
                  value={gridDraft.a}
                  maxLength={GRID_A_CAP}
                  spellCheck={false}
                  aria-describedby={`${hintBase}-grid-hint`}
                  onChange={(event) =>
                    setDraft((current) =>
                      current.kind === "grid" ? { ...current, a: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                b · columns
                <input
                  value={gridDraft.b}
                  maxLength={GRID_B_CAP}
                  spellCheck={false}
                  aria-describedby={`${hintBase}-grid-hint`}
                  onChange={(event) =>
                    setDraft((current) =>
                      current.kind === "grid" ? { ...current, b: event.target.value } : current,
                    )
                  }
                />
              </label>
            </div>
            <p id={`${hintBase}-grid-hint`} className="obs-inspector__hint">
              a: {gridDraft.a.length}/{GRID_A_CAP} · b: {gridDraft.b.length}/{GRID_B_CAP} · table:{" "}
              {gridDraft.a.length + 1} × {gridDraft.b.length + 1} cells. ε marks the empty prefix.
            </p>
            <p className="obs-inspector__hint">Strategy stays {scenario.strategy}.</p>
          </fieldset>
        )}

        <div className="obs-inspector__diagnostics" role="status" aria-live="polite" aria-atomic="true">
          {diagnostics.length === 0 ? (
            <p className="obs-inspector__ok">{status}</p>
          ) : (
            <>
              <p className="obs-inspector__error-title">{status}</p>
              <ul>
                {diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${diagnostic.path}-${index}`}>
                    <span className="obs-mono">{diagnostic.path}</span> {diagnostic.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="obs-inspector__foot">
          <button type="submit" className="obs-inspector__apply">
            Apply changes
          </button>
          <button type="button" className="obs-inspector__discard" onClick={discard} disabled={!dirty}>
            Discard
          </button>
        </footer>
      </form>
    </aside>
  );
}
