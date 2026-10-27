/**
 * The field-card drawer: an accessible dialog for a field specimen.
 * It carries the specimen's framing, the seven canonical Drishti lens
 * questions as links to `/drishti/lenses/<slug>`, the deep link to the
 * specimen's published page, and an explicit statement that there is no
 * runnable simulation for field cards.
 */
import { useRef } from "react";
import type { FieldCardDrawerProps } from "./ui-types";
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import { useDialogFocus } from "./use-dialog-focus";
import { useOverlayNotice } from "./ObservatoryDialogs";

export function FieldCardDrawer({ specimen, onClose }: FieldCardDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const notice = useOverlayNotice();
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
        className="obs-drawer obs-drawer-panel obs-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="obs-field-card-title"
        tabIndex={-1}
      >
        <header className="obs-drawer-head">
          <span className="obs-tag">{specimen.kind}</span>
          <div>
            <h2 id="obs-field-card-title" className="obs-drawer-title">
              {specimen.title}
            </h2>
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

        <p className="obs-field-card-summary">{specimen.summary}</p>

        <p className="obs-absence" role="note">
          <strong>No runnable simulation.</strong> Field cards have no specimen
          chamber here — open the published page instead.
        </p>

        <h3 className="obs-panel-title">The seven lenses</h3>
        <ul className="obs-lens-links">
          {DRISHTI_LENSES.map((lens) => (
            <li key={lens.slug}>
              <span className="obs-mono obs-lens-links-glyph" aria-hidden="true">
                {lens.glyph}
              </span>
              <span className="obs-lens-links-name">{lens.title} — </span>
              <a href={`/drishti/lenses/${lens.slug}`}>{lens.question}</a>
            </li>
          ))}
        </ul>

        <footer className="obs-drawer-actions">
          <a
            className="obs-button obs-button--accent"
            href={specimen.href}
            onClick={onClose}
          >
            Open the specimen page
          </a>
          <button
            type="button"
            className="obs-button obs-button--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
