/**
 * The branch shelf: chronological, equally weighted cards — no ranking and
 * no FIFO clobbering. Each card opens, forks, compares, and deletes; the
 * shelf shares, exports, imports (hidden file input reading file text), and
 * closes. The 30-branch cap gets an explicit message; deletion stays named
 * and confirmed by the caller.
 */
import { useRef, type ChangeEvent } from "react";
import type { BranchShelfProps } from "./ui-types";
import { LIMITS } from "../../observatory/storage";
import { plural } from "../../observatory/format";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";

/** UTC timestamp, or null when the value is not a plausible epoch time. */
function savedTime(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0 || ms > 8_640_000_000_000_000) return null;
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

function excerpt(note: string): string {
  if (note === "") return "";
  return note.length > 140 ? `${note.slice(0, 140).trimEnd()}…` : note;
}

export function BranchShelf({
  branches,
  activeId,
  atCap,
  canShare,
  canExport,
  onOpen,
  onFork,
  onCompare,
  onDelete,
  onShare,
  onExport,
  onImport,
  onClose,
}: BranchShelfProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onImport(reader.result);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <section className="obs-panel obs-branches" aria-label="Branch shelf">
      <header className="obs-panel-head">
        <h2 className="obs-panel-title">
          Branches{" "}
          <span className="obs-tag">
            {branches.length} / {LIMITS.branches}
          </span>
        </h2>
        <button
          type="button"
          className="obs-button obs-button--ghost"
          aria-label="Close branches"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      {atCap && (
        <p className="obs-cap" role="alert">
          The shelf is at its {LIMITS.branches}-branch limit. Delete a branch to
          keep another — nothing is removed for you.
        </p>
      )}

      {branches.length === 0 ? (
        <p className="obs-empty-line">
          No branches yet. Run a specimen and choose Keep to store one in this
          browser. Nothing is uploaded.
        </p>
      ) : (
        <ul className="obs-branch-list">
          {branches.map((branch) => {
            const isActive = branch.id === activeId;
            const time = savedTime(branch.updatedAt);
            return (
              <li
                key={branch.id}
                className={
                  isActive ? "obs-branch-card obs-branch-card--active" : "obs-branch-card"
                }
              >
                <div className="obs-branch-meta">
                  <h3 className="obs-branch-title">{branch.title}</h3>
                  {isActive && (
                    <span className="obs-tag obs-tag--active">
                      Open<span className="obs-sr"> branch</span>
                    </span>
                  )}
                </div>
                {branch.scenario.title !== branch.title && (
                  <p className="obs-branch-framing">{branch.scenario.title}</p>
                )}
                <p className="obs-branch-line obs-mono">
                  {LENS_BY_SLUG[branch.lens]?.title ?? branch.lens} ·{" "}
                  {plural(branch.mutations.length, "mutation")} · Frame{" "}
                  {branch.frameIndex + 1}
                </p>
                {time !== null && (
                  <p className="obs-branch-saved">saved {time} UTC</p>
                )}
                {branch.note !== "" && (
                  <p className="obs-branch-note">{excerpt(branch.note)}</p>
                )}
                <div className="obs-branch-actions">
                  <button
                    type="button"
                    className="obs-button obs-button--ghost"
                    onClick={() => onOpen(branch)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="obs-button obs-button--ghost"
                    onClick={() => onFork(branch)}
                  >
                    Fork
                  </button>
                  <button
                    type="button"
                    className="obs-button obs-button--ghost"
                    onClick={() => onCompare(branch)}
                  >
                    Compare
                  </button>
                  <button
                    type="button"
                    className="obs-button obs-button--ghost obs-button--danger"
                    onClick={() => onDelete(branch)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="obs-branch-share" role="group" aria-label="Current bench actions">
        <p className="obs-kicker obs-branch-share-label">Current bench</p>
        <button
          type="button"
          className="obs-button"
          disabled={!canShare}
          aria-describedby={!canShare || !canExport ? "obs-branch-share-note" : undefined}
          onClick={onShare}
        >
          Share link
        </button>
        <button
          type="button"
          className="obs-button"
          disabled={!canExport}
          aria-describedby={!canShare || !canExport ? "obs-branch-share-note" : undefined}
          onClick={onExport}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="obs-button"
          onClick={() => fileRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={readFile}
        />
        {(!canShare || !canExport) && (
          <p className="obs-branch-share-note" id="obs-branch-share-note">
            Open a bench to share or export its run. Import replaces the current
            bench after a preview.
          </p>
        )}
      </div>
    </section>
  );
}
