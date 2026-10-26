import { useMemo } from "react";
import type { GridView } from "../../game/types";
import type { Highlight } from "../../observatory/types";

type GridCanvasProps = {
  view: GridView;
  frameHighlights: readonly Highlight[];
  lensHighlights: readonly string[];
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
};

function fallbackLabels(count: number, axis: "row" | "col"): string[] {
  return Array.from({ length: count }, (_, index) =>
    index === 0 ? "ε" : axis === "row" ? `r${index}` : `c${index}`,
  );
}

export function GridCanvas({
  view,
  frameHighlights,
  lensHighlights,
  selectedId,
  editable,
  onSelect,
}: GridCanvasProps) {
  const roles = useMemo(() => {
    const map = new Map<string, Highlight["role"]>();
    for (const highlight of frameHighlights) map.set(highlight.id, highlight.role);
    return map;
  }, [frameHighlights]);
  const lens = useMemo(() => new Set(lensHighlights), [lensHighlights]);

  const cells = useMemo(
    () => new Map(view.cells.map((cell) => [`${cell.r}:${cell.c}`, cell])),
    [view.cells],
  );
  const rowCount = Math.max(0, Math.trunc(view.rows));
  const colCount = Math.max(0, Math.trunc(view.cols));
  const rowLabels =
    view.rowLabels && view.rowLabels.length === rowCount
      ? view.rowLabels
      : fallbackLabels(rowCount, "row");
  const colLabels =
    view.colLabels && view.colLabels.length === colCount
      ? view.colLabels
      : fallbackLabels(colCount, "col");

  return (
    <section
      className="obs-canvas obs-canvas--grid"
      aria-label="Specimen chamber"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      <header className="obs-canvas__head">
        <p className="obs-canvas__kicker">Specimen · table</p>
        <p className="obs-canvas__meta obs-mono">
          {rowCount} × {colCount} cells
          {editable ? " · edit strings in inspector" : ""}
        </p>
      </header>

      <div
        className="obs-grid__scroll"
        role="region"
        aria-label={view.caption ?? "Table specimen, scrollable"}
        tabIndex={0}
        onClick={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
      >
        <table className="obs-grid__table">
          <caption className="obs-sr-only">{view.caption ?? "Table specimen"}</caption>
          <thead>
            <tr>
              <th scope="col" className="obs-grid__corner">
                <span aria-hidden="true">a \ b</span>
                <span className="obs-sr-only">Row and column</span>
              </th>
              {colLabels.map((label, index) => (
                <th
                  key={`col-${index}`}
                  scope="col"
                  className={`obs-grid__axis${index === 0 ? " obs-grid__axis--epsilon" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, r) => (
              <tr key={`row-${r}`}>
                <th
                  scope="row"
                  className={`obs-grid__axis${r === 0 ? " obs-grid__axis--epsilon" : ""}`}
                >
                  {rowLabels[r] ?? String(r)}
                </th>
                {Array.from({ length: colCount }, (_, c) => {
                  const id = `${r}:${c}`;
                  const cell = cells.get(id);
                  const value = cell?.value ?? "";
                  const state = cell?.state ?? "idle";
                  const role = roles.get(id);
                  const isLens = lens.has(id);
                  const selected = selectedId === id;
                  const classes = [
                    "obs-grid__cell",
                    `is-${state}`,
                    role ? `is-role-${role}` : "",
                    isLens ? "is-lens" : "",
                    selected ? "is-selected" : "",
                    value === "" ? "is-empty" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const aria = [
                    cell?.aria ?? `Row ${r}, column ${c}, ${value === "" ? "empty" : value}`,
                    state !== "idle" ? `State: ${state}.` : "",
                    role ? `Highlight: ${role}.` : "",
                    isLens ? "Lens highlight." : "",
                    selected ? "Selected." : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <td key={id} className="obs-grid__cell-wrap">
                      <button
                        type="button"
                        className={classes}
                        aria-label={aria}
                        aria-pressed={selected}
                        onClick={() => onSelect(id)}
                      >
                        {value !== "" && <span className="obs-grid__value">{value}</span>}
                        {state === "done" && (
                          <span className="obs-grid__mark obs-grid__mark--done" aria-hidden="true">
                            ✓
                          </span>
                        )}
                        {state === "bad" && (
                          <span className="obs-grid__mark obs-grid__mark--bad" aria-hidden="true">
                            ×
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view.caption && <p className="obs-canvas__caption">{view.caption}</p>}
    </section>
  );
}
