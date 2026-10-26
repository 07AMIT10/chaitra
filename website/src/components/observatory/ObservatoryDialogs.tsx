import { useRef, useState, type ReactNode } from "react";
import type { Branch } from "../../observatory/types";
import type {
  CompareDialogProps,
  ConfirmDialogProps,
} from "./ui-types";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";
import { useDialogFocus } from "./use-dialog-focus";

type OverlayProps = {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

/** Shared modal frame: Escape closes, focus moves in, backdrop click closes. */
export function Overlay({ label, onClose, children, className }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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

function BranchSummary({ branch }: { branch: Branch }) {
  const lens = LENS_BY_SLUG[branch.lens];
  return (
    <article className="obs-compare-card">
      <p className="obs-kicker">{branch.scenario.substrate}</p>
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
      {branch.mutations.length > 0 && (
        <ol className="obs-compare-mutations">
          {branch.mutations.map((mutation) => (
            <li key={mutation.id}>{mutation.label}</li>
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
  onClose,
  onOpenLeft,
  onOpenRight,
}: CompareDialogProps) {
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
      <div className="obs-compare-grid">
        <div>
          <BranchSummary branch={left} />
          <button type="button" className="obs-button obs-button--ghost" onClick={onOpenLeft}>
            Open left branch
          </button>
        </div>
        <div>
          <BranchSummary branch={right} />
          <button type="button" className="obs-button obs-button--ghost" onClick={onOpenRight}>
            Open right branch
          </button>
        </div>
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
        <button type="button" className="obs-button obs-button--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="obs-button obs-button--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Overlay>
  );
}
