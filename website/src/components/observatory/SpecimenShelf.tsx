/**
 * The specimen shelf: five live plates first, then reader benches, a dashed
 * blank plate, the field index, and the branch-shelf entry. Presentational:
 * every bench opens only through a callback.
 */
import type { ShelfProps } from "./ui-types";
import type { Branch, Strategy, Substrate } from "../../observatory/types";
import { LIMITS } from "../../observatory/storage";

const BLANK_PLATES: readonly { substrate: Substrate; label: string }[] = [
  { substrate: "graph", label: "Graph" },
  { substrate: "array", label: "Array" },
  { substrate: "grid", label: "Table" },
];

function classNames(...parts: readonly (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function SpecimenShelf({
  liveBenches,
  fieldSpecimens,
  readerBenches,
  branches,
  branchCount,
  onPickLive,
  onPickReader,
  onPickBlank,
  onOpenField,
  onDeleteReader,
  onOpenBranches,
  onOpenBranch,
}: ShelfProps) {
  return (
    <section className="obs-shelf" aria-label="Specimen shelf">
      <h2 className="obs-panel-title">Specimens</h2>

      <ul className="obs-plates">
        {liveBenches.map((bench) => (
          <li key={bench.id}>
            <button
              type="button"
              className="obs-plate"
              onClick={() => onPickLive(bench)}
            >
              <span className="obs-plate-title">{bench.title}</span>
              <span className="obs-plate-framing">{bench.framing}</span>
              <span className="obs-plate-tags">
                <span className="obs-tag">{bench.substrate}</span>
                {bench.strategies.map((strategy: Strategy) => (
                  <span key={strategy} className="obs-tag">
                    {strategy}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}

        <li className="obs-plate obs-plate--blank">
          <span className="obs-plate-title">Start a blank plate</span>
          <span className="obs-plate-framing">
            An empty mount to invent a specimen on.
          </span>
          <span className="obs-blank-actions">
            {BLANK_PLATES.map((plate) => (
              <button
                key={plate.substrate}
                type="button"
                className="obs-button obs-button--ghost"
                onClick={() => onPickBlank(plate.substrate)}
              >
                {plate.label}
              </button>
            ))}
          </span>
        </li>
      </ul>

      <div className="obs-panel obs-saved-branches">
        <div className="obs-saved-branches-head">
          <h3 className="obs-panel-title">
            Saved branches <span className="obs-tag">{branchCount} / {LIMITS.branches}</span>
          </h3>
          <button type="button" className="obs-button obs-button--ghost" onClick={onOpenBranches}>
            Manage
          </button>
        </div>
        {branches.length === 0 ? (
          <p className="obs-empty-line">
            Branches you keep appear here, newest first.
          </p>
        ) : (
          <ul className="obs-saved-branch-list">
            {branches.slice(0, 3).map((branch) => (
              <li key={branch.id}>
                <button type="button" className="obs-saved-branch" onClick={() => onOpenBranch(branch)}>
                  <span className="obs-saved-branch-title">{branch.title}</span>
                  {branch.scenario.title !== branch.title && (
                    <span className="obs-saved-branch-meta">{branch.scenario.title}</span>
                  )}
                  <span className="obs-saved-branch-meta">
                    {branch.scenario.strategy} · {branch.mutations.length} mutation{branch.mutations.length === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="obs-panel obs-reader-benches">
        <h3 className="obs-panel-title">Reader benches</h3>
        {readerBenches.length === 0 ? (
          <p className="obs-empty-line">
            Benches you save while working appear here.
          </p>
        ) : (
          <ul className="obs-bench-list">
            {readerBenches.map((bench) => (
              <li key={bench.id} className="obs-bench-row">
                <span className="obs-tag">{bench.substrate}</span>
                <span className="obs-bench-name">
                  {bench.title}
                  <span className="obs-bench-meta">
                    {bench.strategy} · {bench.framing} · saved{" "}
                    {new Date(bench.createdAt).toISOString().slice(0, 10)}
                  </span>
                </span>
                <span className="obs-bench-actions">
                  <button
                    type="button"
                    className="obs-button obs-button--ghost"
                    onClick={() => onPickReader(bench)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="obs-button obs-button--ghost obs-button--danger"
                    onClick={() => onDeleteReader(bench)}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="obs-panel obs-field-index">
        <h3 className="obs-panel-title">
          Field index <span className="obs-tag">{fieldSpecimens.length}</span>
        </h3>
        {fieldSpecimens.length === 0 ? (
          <p className="obs-empty-line">No field specimens registered.</p>
        ) : (
          <ul className="obs-field-list">
            {fieldSpecimens.map((field) => (
              <li key={field.id}>
                <button
                  type="button"
                  className="obs-field-row"
                  onClick={() => onOpenField(field)}
                  data-field-id={field.id}
                  title={field.summary}
                >
                  <span className="obs-tag">{field.kind}</span>
                  <span className="obs-field-name">{field.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className={classNames("obs-button", "obs-branches-entry")}
        onClick={onOpenBranches}
      >
        Branches
        <span className="obs-tag">
          {branchCount} / {LIMITS.branches}
        </span>
      </button>
    </section>
  );
}
