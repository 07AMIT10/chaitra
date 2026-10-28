import type { CanvasProps } from "./ui-types";
import { ArrayCanvas } from "./ArrayCanvas";
import { GraphCanvas } from "./GraphCanvas";
import { GridCanvas } from "./GridCanvas";

function EmptyMount({
  kind,
  onSelect,
}: {
  kind: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section
      className="obs-canvas obs-canvas--empty"
      aria-label="Specimen chamber"
      onClick={() => onSelect(null)}
    >
      <p className="obs-canvas__kicker">Specimen chamber</p>
      <p className="obs-canvas__empty-title">
        {kind === null ? "No specimen mounted." : `No renderer for a “${kind}” view.`}
      </p>
      <p className="obs-canvas__empty-body">
        The observatory can mount graphs, arrays, and tables. This view stays an honest empty
        mount rather than an invented diagram.
      </p>
    </section>
  );
}

/**
 * Pure render of the current `BoardView`. The canvases never run the model:
 * they report selection and (when editable) node moves upward.
 */
export function ObservatoryCanvas(props: CanvasProps) {
  const {
    view,
    frameHighlights,
    lensHighlights,
    selectedId,
    editable,
    onSelect,
    onMoveNode,
  } = props;

  if (!view) {
    return <EmptyMount kind={null} onSelect={onSelect} />;
  }

  const kind: string = view.kind;

  switch (view.kind) {
    case "graph":
      return (
        <GraphCanvas
          view={view}
          frameHighlights={frameHighlights}
          lensHighlights={lensHighlights}
          selectedId={selectedId}
          editable={editable}
          onSelect={onSelect}
          onMoveNode={onMoveNode}
        />
      );
    case "array":
      return (
        <ArrayCanvas
          view={view}
          frameHighlights={frameHighlights}
          lensHighlights={lensHighlights}
          selectedId={selectedId}
          editable={editable}
          onSelect={onSelect}
          onMoveNode={onMoveNode}
        />
      );
    case "grid":
      return (
        <GridCanvas
          view={view}
          frameHighlights={frameHighlights}
          lensHighlights={lensHighlights}
          selectedId={selectedId}
          editable={editable}
          onSelect={onSelect}
          onMoveNode={onMoveNode}
        />
      );
    default:
      return <EmptyMount kind={kind} onSelect={onSelect} />;
  }
}
