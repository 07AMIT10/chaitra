import { useMemo } from "react";
import type { ArrayView } from "../../game/types";
import type { Highlight } from "../../observatory/types";

type ArrayCanvasProps = {
  view: ArrayView;
  frameHighlights: readonly Highlight[];
  lensHighlights: readonly string[];
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
};

export function ArrayCanvas({
  view,
  frameHighlights,
  lensHighlights,
  selectedId,
  editable,
  onSelect,
}: ArrayCanvasProps) {
  const roles = useMemo(() => {
    const map = new Map<string, Highlight["role"]>();
    for (const highlight of frameHighlights) map.set(highlight.id, highlight.role);
    return map;
  }, [frameHighlights]);
  const lens = useMemo(() => new Set(lensHighlights), [lensHighlights]);

  const pointersByIndex = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const pointer of view.pointers ?? []) {
      if (!Number.isInteger(pointer.index) || pointer.index < 0) continue;
      const labels = map.get(pointer.index) ?? [];
      labels.push(pointer.label);
      map.set(pointer.index, labels);
    }
    return map;
  }, [view.pointers]);

  const segments = view.segments ?? [];

  return (
    <section
      className="obs-canvas obs-canvas--array"
      aria-label="Specimen chamber"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      <header className="obs-canvas__head">
        <p className="obs-canvas__kicker">Specimen · array</p>
        <p className="obs-canvas__meta obs-mono">
          {view.items.length} items
          {editable ? " · editable via inspector" : ""}
        </p>
      </header>

      <div
        className="obs-array__scroll"
        onClick={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
      >
        <ol
          className="obs-array__cells"
          aria-label={view.caption ?? "Array specimen"}
          onClick={(event) => {
            if (event.target === event.currentTarget) onSelect(null);
          }}
        >
          {view.items.map((item, index) => {
            const labels = pointersByIndex.get(index) ?? [];
            const covering = segments.filter(
              (segment) => index >= segment.from && index <= segment.to,
            );
            const segmentState = covering.some((segment) => segment.state === "active")
              ? "active"
              : covering.some((segment) => segment.state === "done")
                ? "done"
                : covering.length > 0
                  ? "idle"
                  : null;
            const state = item.state ?? "idle";
            const role = roles.get(item.id);
            const isLens = lens.has(item.id);
            const selected = selectedId === item.id;
            const classes = [
              "obs-array__chip",
              `is-${state}`,
              role ? `is-role-${role}` : "",
              isLens ? "is-lens" : "",
              selected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const aria = [
              item.aria ?? `Value ${item.value}`,
              item.label != null && item.label !== String(item.value) ? item.label : "",
              labels.length > 0 ? `Pointers: ${labels.join(", ")}.` : "",
              covering.length > 0
                ? `Segment ${covering.map((segment) => `${segment.from} to ${segment.to}`).join(", ")}.`
                : "",
              state !== "idle" ? `State: ${state}.` : "",
              role ? `Highlight: ${role}.` : "",
              isLens ? "Lens highlight." : "",
              selected ? "Selected." : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li
                key={item.id}
                className={`obs-array__cell${segmentState ? ` is-in-segment is-segment-${segmentState}` : ""}`}
              >
                <span className="obs-array__pointers" aria-hidden="true">
                  {labels.map((label, pointerIndex) => (
                    <span
                      key={`${label}-${pointerIndex}`}
                      className="obs-array__pointer"
                      data-pointer={label.toLowerCase()}
                    >
                      {label}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  className={classes}
                  aria-label={aria}
                  aria-pressed={selected}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="obs-array__value">{item.value}</span>
                  {item.label != null && item.label !== String(item.value) && (
                    <span className="obs-array__sublabel">{item.label}</span>
                  )}
                </button>
                <span className="obs-array__index" aria-hidden="true">
                  {index}
                </span>
                <span className="obs-array__rail" aria-hidden="true" />
              </li>
            );
          })}
        </ol>
      </div>

      {segments.length > 0 && (
        <ul className="obs-array__segments" aria-label="Segments">
          {segments.map((segment, index) => (
            <li
              key={`${segment.from}:${segment.to}:${segment.label ?? "segment"}:${index}`}
              className={`obs-array__segment is-${segment.state ?? "idle"}`}
            >
              <span className="obs-array__segment-label">{segment.label ?? "segment"}</span>
              <span className="obs-array__segment-range obs-mono">
                [{segment.from}..{segment.to}]
              </span>
            </li>
          ))}
        </ul>
      )}

      {view.caption && <p className="obs-canvas__caption">{view.caption}</p>}
    </section>
  );
}
