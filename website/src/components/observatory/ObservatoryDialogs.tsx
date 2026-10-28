import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { Branch, RunOutcome } from "../../observatory/types";
import type {
  CompareDialogProps,
  ConfirmDialogProps,
  ImportDialogProps,
} from "./ui-types";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";
import { canonicalJson } from "../../observatory/hash";
import { runScenario } from "../../observatory/runners";
import { useDialogFocus } from "./use-dialog-focus";

type OverlayProps = {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

const OverlayNoticeContext = createContext<ReactNode>(null);

/** Notices move inside the active dialog so they stay readable and reachable. */
export function OverlayNoticeProvider({
  value,
  children,
}: {
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <OverlayNoticeContext.Provider value={value}>
      {children}
    </OverlayNoticeContext.Provider>
  );
}

export function useOverlayNotice(): ReactNode {
  return useContext(OverlayNoticeContext);
}

/** Shared modal frame: Escape closes, focus moves in, backdrop click closes. */
export function Overlay({ label, onClose, children, className }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const notice = useContext(OverlayNoticeContext);
  useDialogFocus(panelRef, onClose);

  return (
    <div
      className="obs-drawer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={className ? `obs-drawer obs-drawer-panel ${className}` : "obs-drawer obs-drawer-panel"}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {notice}
        {children}
      </div>
    </div>
  );
}

export function ShareDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("The clipboard is not available here. Select the link and copy it.");
      inputRef.current?.select();
    }
  };

  return (
    <Overlay label="Share this branch" onClose={onClose}>
      <header className="obs-drawer-head">
        <div>
          <p className="obs-kicker">A link to this exact run</p>
          <h2 className="obs-drawer-title">Share the branch</h2>
        </div>
        <button
          type="button"
          className="obs-button obs-button--ghost"
          aria-label="Close share dialog"
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <p className="obs-muted">
        The link carries the scenario, mutations, lens, and frame. Field notes and the
        branch title stay local.
      </p>
      <label className="obs-field">
        <span>Read-only link</span>
        <input
          ref={inputRef}
          className="obs-mono"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <div className="obs-drawer-actions">
        <button type="button" className="obs-button obs-button--accent" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
        <button type="button" className="obs-button obs-button--ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {error !== null && (
        <p className="obs-rejection" role="alert">
          {error}
        </p>
      )}
    </Overlay>
  );
}

const OUTCOME_LABEL: Record<RunOutcome, string> = {
  done: "Complete",
  "max-steps": "Stopped at the frame cap",
  cycle: "Cycle detected",
  invalid: "Invalid scenario",
};

function BranchSummary({ branch }: { branch: Branch }) {
  const lens = LENS_BY_SLUG[branch.lens];
  const run = runScenario(branch.scenario);
  const last = run.frames[run.frames.length - 1];
  return (
    <article className="obs-compare-card">
      <p className="obs-kicker">
        {branch.scenario.substrate} · {branch.scenario.strategy}
      </p>
      <h3 className="obs-compare-title">{branch.title}</h3>
      <p className="obs-muted">{branch.scenario.title}</p>
      <dl className="obs-metrics">
        <div className="obs-metric">
          <dt>Lens</dt>
          <dd>{lens?.title ?? branch.lens}</dd>
        </div>
        <div className="obs-metric">
          <dt>Mutations</dt>
          <dd>{branch.mutations.length}</dd>
        </div>
        <div className="obs-metric">
          <dt>Frame</dt>
          <dd>Step {branch.frameIndex + 1}</dd>
        </div>
      </dl>
      <p className="obs-compare-run">
        <span className="obs-kicker">Run outcome</span>
        {OUTCOME_LABEL[run.outcome]} · {run.frames.length} frame
        {run.frames.length === 1 ? "" : "s"}
      </p>
      {last !== undefined && last.metrics.length > 0 && (
        <ul className="obs-compare-metrics">
          {last.metrics.slice(0, 3).map((metric) => (
            <li key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </li>
          ))}
        </ul>
      )}
      {branch.mutations.length > 0 && (
        <ol className="obs-compare-mutations">
          {branch.mutations.map((mutation, index) => (
            <li key={`${mutation.id}-${index}`}>{mutation.label}</li>
          ))}
        </ol>
      )}
      {branch.note.trim() !== "" && <p className="obs-compare-note">{branch.note}</p>}
    </article>
  );
}

export function CompareDialog({
  left,
  right,
  branches,
  onClose,
  onOpen,
}: CompareDialogProps) {
  const [leftId, setLeftId] = useState(left.id);
  const [rightId, setRightId] = useState(right.id);
  const selectedLeft = branches.find((branch) => branch.id === leftId) ?? left;
  const selectedRight = branches.find((branch) => branch.id === rightId) ?? right;
  const structuralDiff = [
    {
      label: "Scenario",
      same: canonicalJson(selectedLeft.scenario) === canonicalJson(selectedRight.scenario),
    },
    {
      label: "Mutation stack",
      same: canonicalJson(selectedLeft.mutations) === canonicalJson(selectedRight.mutations),
    },
    { label: "Lens", same: selectedLeft.lens === selectedRight.lens },
    { label: "Frame", same: selectedLeft.frameIndex === selectedRight.frameIndex },
  ];

  return (
    <Overlay label="Compare branches" onClose={onClose} className="obs-compare-dialog">
      <header className="obs-drawer-head">
        <div>
          <p className="obs-kicker">Two branches, side by side</p>
          <h2 className="obs-drawer-title">Compare</h2>
        </div>
        <button
          type="button"
          className="obs-button obs-button--ghost"
          aria-label="Close comparison"
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="obs-compare-selectors">
        <label className="obs-field">
          <span>Left branch</span>
          <select
            value={selectedLeft.id}
            onChange={(event) => setLeftId(event.currentTarget.value)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id} disabled={branch.id === rightId}>
                {branch.title}
              </option>
            ))}
          </select>
        </label>
        <label className="obs-field">
          <span>Right branch</span>
          <select
            value={selectedRight.id}
            onChange={(event) => setRightId(event.currentTarget.value)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id} disabled={branch.id === leftId}>
                {branch.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="obs-compare-diff" aria-label="Structural differences">
        {structuralDiff.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <span
              className={
                row.same
                  ? "obs-compare-diff-tag obs-compare-diff-tag--same"
                  : "obs-compare-diff-tag obs-compare-diff-tag--differs"
              }
            >
              {row.same ? "same" : "differs"}
            </span>
          </li>
        ))}
      </ul>
      <div className="obs-compare-grid">
        <div>
          <BranchSummary branch={selectedLeft} />
          <button
            type="button"
            className="obs-button obs-button--ghost"
            onClick={() => onOpen(selectedLeft)}
          >
            Open left branch
          </button>
        </div>
        <div>
          <BranchSummary branch={selectedRight} />
          <button
            type="button"
            className="obs-button obs-button--ghost"
            onClick={() => onOpen(selectedRight)}
          >
            Open right branch
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export function ImportDialog({
  branch,
  draftWaiting,
  replacesUnsaved,
  onLoad,
  onCancel,
}: ImportDialogProps) {
  return (
    <Overlay label="Preview imported branch" onClose={onCancel}>
      <header className="obs-drawer-head">
        <div>
          <p className="obs-kicker">Nothing loads until you say so</p>
          <h2 className="obs-drawer-title">Preview imported branch</h2>
        </div>
        <button
          type="button"
          className="obs-button obs-button--ghost"
          aria-label="Close import preview"
          onClick={onCancel}
        >
          ✕
        </button>
      </header>
      <BranchSummary branch={branch} />
      <p className="obs-muted">
        Loading replaces the current bench. The branch stays unsaved until you choose Keep,
        so nothing is added to your shelf by importing.
      </p>
      {replacesUnsaved && (
        <p className="obs-rejection" role="status">
          This bench has unsaved changes. Loading the import will discard them; Keep this
          bench first if you want to keep the run.
        </p>
      )}
      {draftWaiting && (
        <p className="obs-rejection" role="status">
          An older draft is still waiting. Loading this branch will not delete it; autosave
          for this bench stays paused until you resume or discard that draft from the shelf.
        </p>
      )}
      <div className="obs-drawer-actions">
        <button type="button" className="obs-button obs-button--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="obs-button obs-button--accent" onClick={onLoad}>
          Load imported branch
        </button>
      </div>
    </Overlay>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Overlay label={title} onClose={onCancel}>
      <header className="obs-drawer-head">
        <div>
          <p className="obs-kicker">Nothing disappears silently</p>
          <h2 className="obs-drawer-title">{title}</h2>
        </div>
      </header>
      <p>{body}</p>
      <div className="obs-drawer-actions">
        <button type="button" className="obs-button obs-button--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="obs-button obs-button--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  );
}
