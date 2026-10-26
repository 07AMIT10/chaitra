/**
 * The lens rail: seven circular stops, one per canonical Drishti lens.
 * All stops stay selectable; the current one is marked by shape, a text
 * marker, and color. Vertical rail on desktop, horizontal scroll on mobile
 * (see observatory-shell.css).
 */
import type { LensRailProps } from "./ui-types";
import { LENS_IDS } from "../../observatory/types";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";

export function LensRail({ active, onSelect }: LensRailProps) {
  return (
    <nav className="obs-rail" aria-label="Drishti lenses">
      <ul className="obs-rail-list">
        {LENS_IDS.map((lens) => {
          const copy = LENS_BY_SLUG[lens];
          const isActive = lens === active;
          return (
            <li key={lens}>
              <button
                type="button"
                className="obs-lens-stop"
                aria-pressed={isActive}
                title={copy?.title ?? lens}
                onClick={() => onSelect(lens)}
              >
                <span className="obs-lens-dot" aria-hidden="true">
                  {copy?.glyph ?? "•"}
                </span>
                <span className="obs-lens-name">
                  {(copy?.title ?? lens).replace(/^What /, "")}
                </span>
                <span className="obs-lens-current" aria-hidden="true">
                  ●
                </span>
                <span className="obs-sr">{isActive ? " (current lens)" : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
