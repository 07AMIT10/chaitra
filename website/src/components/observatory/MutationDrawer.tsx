/**
 * The SCAMPER mutation drawer: an accessible dialog proposing one concrete
 * operation. Controls are built from the scenario and the selected node;
 * `proposeMutation(scenario, card, payload)` runs in a memo and the result is
 * shown as a pre-apply preview. Rejections show diagnostics and disable
 * Apply; Apply only hands the validated result to `onApply`.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { MutationDrawerProps } from "./ui-types";
import {
  ARRAY_STRATEGIES,
  GRAPH_STRATEGIES,
  GRID_STRATEGIES,
  type GraphEdge,
  type GraphNode,
  type Scenario,
  type ScenarioParam,
  type Strategy,
} from "../../observatory/types";
import { proposeMutation, SCAMPER_CARDS } from "../../observatory/mutations";
import { ARRAY_FRAMINGS } from "../../observatory/mutations/array";
import { GRAPH_FRAMINGS } from "../../observatory/mutations/graph";
import { GRID_FRAMINGS } from "../../observatory/mutations/grid";
import { useDialogFocus } from "./use-dialog-focus";
import { useOverlayNotice } from "./ObservatoryDialogs";

export function MutationDrawer({
  scenario,
  card,
  selectedId,
  onApply,
  onClose,
}: MutationDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const notice = useOverlayNotice();

  const cardMeta = useMemo(
    () => SCAMPER_CARDS.find((item) => item.id === card),
    [card],
  );

  // The payload starts from a stable default (chosen once from the incoming
  // scenario and selection) and is edited only through the controls.
  const [draft, setDraft] = useState(() =>
    defaultPayload(scenario, card, selectedId),
  );

  const proposal = useMemo(
    () => proposeMutation(scenario, card, draft),
    [scenario, card, draft],
  );

  useDialogFocus(panelRef, onClose);

  const set = (next: Record<string, ScenarioParam>) => setDraft(next);

  const onFactorChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (event.target.value !== "" && Number.isFinite(parsed) && parsed > 0) {
      set({ ...draft, factor: parsed });
    }
  };

  const strategies = strategiesFor(scenario);
  const framings = framingsFor(scenario);
  const hasControls = cardHasControls(scenario, card);

  return (
    <div
      className="obs-drawer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="obs-drawer obs-drawer-panel obs-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="obs-mutation-title"
        tabIndex={-1}
      >
        <header className="obs-drawer-head">
          <span className="obs-drawer-glyph" aria-hidden="true">
            {cardMeta?.glyph ?? "•"}
          </span>
          <div>
            <h2 id="obs-mutation-title" className="obs-drawer-title">
              {cardMeta?.title ?? card}
            </h2>
            <p className="obs-drawer-prompt">{cardMeta?.prompt ?? ""}</p>
          </div>
          <button
            type="button"
            className="obs-button obs-button--ghost"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        {notice}

        {hasControls ? (
          <div className="obs-controls">
            {card === "substitute" && (
              <label className="obs-field">
                <span>Strategy</span>
                <select
                  value={String(draft.strategy ?? scenario.strategy)}
                  onChange={(event) =>
                    set({ ...draft, strategy: event.target.value })
                  }
                >
                  {strategies.map((strategy) => (
                    <option key={strategy} value={strategy}>
                      {strategy}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {card === "combine" && scenario.substrate === "graph" && (
              <>
                <label className="obs-field">
                  <span>Merge into (from)</span>
                  <select
                    value={String(draft.from ?? "")}
                    onChange={(event) =>
                      set({ ...draft, from: event.target.value })
                    }
                  >
                    {scenario.model.nodes.map((node: GraphNode) => (
                      <option key={node.id} value={node.id}>
                        {node.label === node.id
                          ? node.id
                          : `${node.label} (${node.id})`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="obs-field">
                  <span>Merged away (to)</span>
                  <select
                    value={String(draft.to ?? "")}
                    onChange={(event) =>
                      set({ ...draft, to: event.target.value })
                    }
                  >
                    {scenario.model.nodes.map((node: GraphNode) => (
                      <option key={node.id} value={node.id}>
                        {node.label === node.id
                          ? node.id
                          : `${node.label} (${node.id})`}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {card === "eliminate" && scenario.substrate === "graph" && (
              <label className="obs-field">
                <span>Part to eliminate</span>
                <select
                  value={String(draft.entity ?? "")}
                  onChange={(event) =>
                    set({ ...draft, entity: event.target.value })
                  }
                >
                  <optgroup label="Nodes">
                    {scenario.model.nodes.map((node: GraphNode) => (
                      <option key={node.id} value={node.id}>
                        {node.label === node.id
                          ? node.id
                          : `${node.label} (${node.id})`}
                      </option>
                    ))}
                  </optgroup>
                  {scenario.model.edges.length > 0 && (
                    <optgroup label="Edges">
                      {scenario.model.edges.map((edge: GraphEdge) => (
                        <option key={edge.id} value={edge.id}>
                          {edge.from}→{edge.to}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
            )}

            {card === "modify" && scenario.substrate !== "grid" && (
              <label className="obs-field">
                <span>Factor (multiplies every value)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={String(draft.factor ?? "")}
                  onChange={onFactorChange}
                />
              </label>
            )}

            {card === "put-to-another-use" && (
              <label className="obs-field">
                <span>Framing</span>
                <select
                  value={String(draft.framing ?? "")}
                  onChange={(event) =>
                    set({ ...draft, framing: event.target.value })
                  }
                >
                  {framings.map((framing) => (
                    <option key={framing} value={framing}>
                      {framing}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ) : (
          <p className="obs-empty-line">
            No options for this card on the {scenario.substrate} substrate — the
            preview below shows its deterministic edit.
          </p>
        )}

        {proposal.ok ? (
          <div className="obs-proposal">
            <p className="obs-proposal-summary">
              <strong>Proposal:</strong> {proposal.summary}
            </p>
            <p className="obs-proposal-diffsummary">{proposal.diff.summary}</p>
            <h3 className="obs-panel-title">Diff preview</h3>
            {proposal.diff.changes.length === 0 ? (
              <p className="obs-empty-line">
                No structural change would result from this proposal.
              </p>
            ) : (
              <dl className="obs-diff">
                {proposal.diff.changes.map((change, index) => (
                  <div key={`${change.path}-${index}`} className="obs-diff-row">
                    <dt className="obs-diff-path">{change.path}</dt>
                    <dd className="obs-diff-change">
                      <span className="obs-diff-before">{change.before}</span>
                      <span aria-hidden="true"> → </span>
                      <span className="obs-diff-after">{change.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : (
          <div className="obs-rejection" role="alert">
            <p>
              <strong>Rejected.</strong> The scenario stays as it is.
            </p>
            <ul className="obs-diagnostics">
              {proposal.diagnostics.map((diagnostic, index) => (
                <li key={`${diagnostic.code}-${index}`}>
                  <span className="obs-mono">{diagnostic.code}</span>
                  <span className="obs-mono obs-diagnostics-path">
                    {diagnostic.path}
                  </span>
                  <span>{diagnostic.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <footer className="obs-drawer-actions">
          <button
            type="button"
            className="obs-button obs-button--accent"
            disabled={!proposal.ok}
            onClick={() => {
              if (proposal.ok) onApply(proposal);
            }}
          >
            Apply
          </button>
          <button
            type="button"
            className="obs-button obs-button--ghost"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ payload */

function strategiesFor(scenario: Scenario): readonly Strategy[] {
  switch (scenario.substrate) {
    case "graph":
      return GRAPH_STRATEGIES;
    case "array":
      return ARRAY_STRATEGIES;
    case "grid":
      return GRID_STRATEGIES;
    default:
      return [];
  }
}

function framingsFor(scenario: Scenario): readonly string[] {
  switch (scenario.substrate) {
    case "graph":
      return GRAPH_FRAMINGS;
    case "array":
      return ARRAY_FRAMINGS;
    case "grid":
      return GRID_FRAMINGS;
    default:
      return [];
  }
}

function cardHasControls(scenario: Scenario, card: MutationDrawerProps["card"]): boolean {
  switch (card) {
    case "substitute":
    case "put-to-another-use":
      return true;
    case "combine":
    case "eliminate":
      return scenario.substrate === "graph";
    case "modify":
      return scenario.substrate !== "grid";
    default:
      return false;
  }
}

/** One stable starting payload, derived from the scenario and selection. */
function defaultPayload(
  scenario: Scenario,
  card: MutationDrawerProps["card"],
  selectedId: string | null,
): Record<string, ScenarioParam> {
  switch (card) {
    case "substitute": {
      const list = strategiesFor(scenario);
      const index = list.indexOf(scenario.strategy);
      const next = index >= 0 ? list[(index + 1) % list.length] : scenario.strategy;
      return { strategy: next };
    }
    case "combine": {
      if (scenario.substrate !== "graph") return {};
      const ids = scenario.model.nodes.map((node) => node.id);
      const from =
        selectedId !== null && ids.includes(selectedId) ? selectedId : ids[0];
      const to = ids.find((id) => id !== from);
      return from !== undefined && to !== undefined ? { from, to } : {};
    }
    case "eliminate": {
      if (scenario.substrate !== "graph") return {};
      const model = scenario.model;
      const knownNode =
        selectedId !== null && model.nodes.some((node) => node.id === selectedId);
      const knownEdge =
        selectedId !== null && model.edges.some((edge) => edge.id === selectedId);
      const fallback = [...model.nodes]
        .reverse()
        .find((node) => node.id !== model.start)?.id;
      const entity =
        knownNode || knownEdge ? selectedId : fallback;
      return entity !== undefined && entity !== null ? { entity } : {};
    }
    case "modify":
      return scenario.substrate === "grid" ? {} : { factor: 2 };
    case "put-to-another-use": {
      const list = framingsFor(scenario);
      const current = scenario.params.framing;
      const index =
        typeof current === "string" ? list.indexOf(current) : -1;
      // Default to a different framing so the preview is an actual change, not
      // a no-op that asks the reader to infer a difference where none exists.
      const framing = index >= 0 ? list[(index + 1) % list.length] : list[0];
      return framing !== undefined ? { framing } : {};
    }
    default:
      return {};
  }
}
