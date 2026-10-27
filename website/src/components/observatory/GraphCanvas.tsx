import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GraphView } from "../../game/types";
import type { Highlight } from "../../observatory/types";

type GraphCanvasProps = {
  view: GraphView;
  frameHighlights: readonly Highlight[];
  lensHighlights: readonly string[];
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
};

const VIEW_WIDTH = 640;
const MIN_NODE_X = 20;
const MAX_NODE_X = 620;
const MIN_NODE_Y = 20;
const MAX_NODE_Y = 320;
const NODE_RADIUS = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isActivationKey(event: ReactKeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " " || event.key === "Spacebar";
}

export function GraphCanvas({
  view,
  frameHighlights,
  lensHighlights,
  selectedId,
  editable,
  onSelect,
  onMoveNode,
}: GraphCanvasProps) {
  const height =
    typeof view.height === "number" && Number.isFinite(view.height) && view.height > 0
      ? view.height
      : 340;
  const maxNodeY = Math.max(MIN_NODE_Y, Math.min(MAX_NODE_Y, height - 20));
  const markerId = `obs-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [dragId, setDragId] = useState<string | null>(null);

  const nodes = useMemo(() => new Map(view.nodes.map((node) => [node.id, node])), [view.nodes]);
  const roles = useMemo(() => {
    const map = new Map<string, Highlight["role"]>();
    for (const highlight of frameHighlights) map.set(highlight.id, highlight.role);
    return map;
  }, [frameHighlights]);
  const lens = useMemo(() => new Set(lensHighlights), [lensHighlights]);

  const toViewBox = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM();
    if (matrix) {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const local = point.matrixTransform(matrix.inverse());
      return { x: local.x, y: local.y };
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  };

  const beginDrag = (event: ReactPointerEvent<SVGGElement>, nodeId: string) => {
    onSelect(nodeId);
    if (!editable || event.button !== 0) return;
    const node = nodes.get(nodeId);
    const local = toViewBox(event.clientX, event.clientY);
    if (!node || !local) return;
    dragOffset.current = { dx: node.x - local.x, dy: node.y - local.y };
    setDragId(nodeId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<SVGGElement>) => {
    if (!dragId) return;
    const local = toViewBox(event.clientX, event.clientY);
    if (!local) return;
    const x = clamp(Math.round(local.x + dragOffset.current.dx), MIN_NODE_X, MAX_NODE_X);
    const y = clamp(Math.round(local.y + dragOffset.current.dy), MIN_NODE_Y, maxNodeY);
    onMoveNode(dragId, x, y);
  };

  const endDrag = (event: ReactPointerEvent<SVGGElement>) => {
    if (!dragId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragId(null);
  };

  return (
    <section
      className={`obs-canvas obs-canvas--graph${editable ? " is-editable" : ""}`}
      aria-label="Specimen chamber"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      <header className="obs-canvas__head">
        <p className="obs-canvas__kicker">Specimen · graph</p>
        <p className="obs-canvas__meta obs-mono">
          {view.nodes.length} nodes · {view.edges.length} edges
          {editable ? " · drag to move" : ""}
        </p>
      </header>

      <div
        className="obs-graph__scroll"
        onClick={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
      >
        <svg
          ref={svgRef}
          className="obs-graph"
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          role="group"
          aria-label={view.caption ?? "Graph specimen"}
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="9"
              markerHeight="9"
              refX="8"
              refY="4.5"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path className="obs-edge__arrowhead" d="M0,0 L9,4.5 L0,9 Z" />
            </marker>
          </defs>

          <rect
            className="obs-graph__bg"
            x="0"
            y="0"
            width={VIEW_WIDTH}
            height={height}
            fill="transparent"
            aria-hidden="true"
            onClick={() => onSelect(null)}
          />

          {view.edges.map((edge) => {
            const from = nodes.get(edge.from);
            const to = nodes.get(edge.to);
            if (!from || !to) return null;

            const role = roles.get(edge.id);
            const isLens = lens.has(edge.id);
            const selected = selectedId === edge.id;
            const classes = [
              "obs-edge",
              `is-${edge.state ?? "idle"}`,
              role ? `is-role-${role}` : "",
              isLens ? "is-lens" : "",
              selected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const label = edge.label != null ? String(edge.label) : null;
            const aria =
              edge.aria ??
              `${from.label} to ${to.label}${label ? `, weight ${label}` : ""}`;
            const activateEdge = (event: ReactKeyboardEvent<SVGPathElement>) => {
              if (!isActivationKey(event)) return;
              event.preventDefault();
              onSelect(edge.id);
            };

            if (from.id === edge.to) {
              const loop = `M ${from.x - 12} ${from.y - 14} C ${from.x - 54} ${
                from.y - 66
              }, ${from.x + 54} ${from.y - 66}, ${from.x + 12} ${from.y - 14}`;
              const chipWidth = label ? Math.max(20, label.length * 6.2 + 10) : 0;
              const chipY = Math.max(12, from.y - 78);
              return (
                <g key={edge.id} className={classes}>
                  <path className="obs-edge__halo" d={loop} />
                  <path
                    className="obs-edge__line"
                    d={loop}
                    markerEnd={edge.directed ? `url(#${markerId})` : undefined}
                  />
                  <path
                    className="obs-edge__hit"
                    d={loop}
                    role="button"
                    tabIndex={-1}
                    aria-label={`${aria}${selected ? ". Selected." : ""}`}
                    aria-pressed={selected}
                    onClick={() => onSelect(edge.id)}
                    onKeyDown={activateEdge}
                  />
                  {label && (
                    <g className="obs-edge__chip" aria-hidden="true">
                      <rect
                        x={from.x - chipWidth / 2}
                        y={chipY}
                        width={chipWidth}
                        height={16}
                        rx="3"
                      />
                      <text
                        className="obs-edge__label"
                        x={from.x}
                        y={chipY + 11.5}
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.hypot(dx, dy) || 1;
            const ux = dx / length;
            const uy = dy / length;
            const x1 = from.x + ux * (NODE_RADIUS + 2);
            const y1 = from.y + uy * (NODE_RADIUS + 2);
            const x2 = to.x - ux * (NODE_RADIUS + 9);
            const y2 = to.y - uy * (NODE_RADIUS + 9);
            const midX = (x1 + x2) / 2 - uy * 10;
            const midY = (y1 + y2) / 2 + ux * 10;
            const chipWidth = label ? Math.max(20, label.length * 6.2 + 10) : 0;

            return (
              <g key={edge.id} className={classes}>
                <line className="obs-edge__halo" x1={x1} y1={y1} x2={x2} y2={y2} />
                <line
                  className="obs-edge__line"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  markerEnd={edge.directed ? `url(#${markerId})` : undefined}
                />
                <line
                  className="obs-edge__hit"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${aria}${selected ? ". Selected." : ""}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(edge.id)}
                  onKeyDown={activateEdge}
                />
                {label && (
                  <g className="obs-edge__chip" aria-hidden="true">
                    <rect
                      x={midX - chipWidth / 2}
                      y={midY - 8}
                      width={chipWidth}
                      height={16}
                      rx="3"
                    />
                    <text
                      className="obs-edge__label"
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {view.nodes.map((node) => {
            const state = node.state ?? "idle";
            const role = roles.get(node.id);
            const isLens = lens.has(node.id);
            const selected = selectedId === node.id;
            const subBelow = node.y + 46 <= height;
            const classes = [
              "obs-node",
              `is-${state}`,
              role ? `is-role-${role}` : "",
              isLens ? "is-lens" : "",
              selected ? "is-selected" : "",
              editable ? "is-editable" : "",
              dragId === node.id ? "is-dragging" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const aria = [
              node.aria ?? `${node.label}${node.sub ? `. ${node.sub}` : ""}`,
              state !== "idle" ? `State: ${state}.` : "",
              role ? `Highlight: ${role}.` : "",
              isLens ? "Lens highlight." : "",
              selected ? "Selected." : "",
              editable ? "Draggable when editable." : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <g
                key={node.id}
                className={classes}
                transform={`translate(${node.x} ${node.y})`}
                role="button"
                tabIndex={0}
                aria-label={aria}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(node.id);
                }}
                onKeyDown={(event) => {
                  if (!isActivationKey(event)) return;
                  event.preventDefault();
                  onSelect(node.id);
                }}
                onPointerDown={(event) => beginDrag(event, node.id)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <circle className="obs-node__hit" r="28" />
                <circle className="obs-node__halo" r="26" />
                {isLens && <circle className="obs-node__lens" r="30" />}
                {role && <circle className={`obs-node__role obs-node__role--${role}`} r="23" />}
                {selected && (
                  <rect className="obs-node__select" x="-28" y="-28" width="56" height="56" rx="5" />
                )}
                {state === "active" && <circle className="obs-node__active-ring" r="20" />}
                {state === "target" && (
                  <rect
                    className="obs-node__target"
                    x="-21"
                    y="-21"
                    width="42"
                    height="42"
                    rx="4"
                    transform="rotate(45)"
                  />
                )}
                <circle className="obs-node__dot" r={NODE_RADIUS} />
                <text className="obs-node__label" textAnchor="middle" y="4">
                  {node.label}
                </text>
                {state === "done" && (
                  <g className="obs-node__badge obs-node__badge--done">
                    <circle cx="14" cy="-14" r="6.5" />
                    <path className="obs-node__glyph" d="M 11 -14 L 13.4 -11.4 L 17 -16.4" />
                  </g>
                )}
                {state === "bad" && (
                  <g className="obs-node__badge obs-node__badge--bad">
                    <circle cx="14" cy="-14" r="6.5" />
                    <path className="obs-node__glyph" d="M 11.5 -16.5 L 16.5 -11.5 M 16.5 -16.5 L 11.5 -11.5" />
                  </g>
                )}
                {role === "warn" && (
                  <path className="obs-node__warnglyph" d="M 0 -34 L 5.5 -24 L -5.5 -24 Z" />
                )}
                {node.sub && (
                  <text
                    className="obs-node__sub"
                    textAnchor="middle"
                    y={subBelow ? 34 : -28}
                  >
                    {node.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {view.caption && <p className="obs-canvas__caption">{view.caption}</p>}
    </section>
  );
}
