import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  isMoveInteractive,
  shouldShowOverflowHint,
  supportsFitView,
} from "../../game/board-access";
import type {
  ArrayView,
  BoardView,
  FormulaView,
  GraphView,
  GridView,
  NumberView,
  PairingView,
  TreeView,
} from "../../game/types";

type BoardProps = {
  view: BoardView;
  onMove: (moveId: string) => void;
  /** The last rejected move; boards mark its element as a fault. */
  faultMoveId?: string;
  /** First-move handover: highlight the recommended opening move. */
  handoverMoveId?: string;
  /** Currently legal move IDs; non-legal bound moves are rendered inert. */
  legalMoveIds?: ReadonlySet<string>;
};

function activate(
  moveId: string | undefined,
  onMove: (moveId: string) => void,
  event: ReactKeyboardEvent,
) {
  if (!moveId) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onMove(moveId);
  }
}

function isFaultMove(moveId: string | undefined, faultMoveId: string | undefined): boolean {
  return Boolean(moveId && faultMoveId && moveId === faultMoveId);
}

function isHandoverMove(
  moveId: string | undefined,
  handoverMoveId: string | undefined,
): boolean {
  return Boolean(moveId && handoverMoveId && moveId === handoverMoveId);
}

function stateClass(
  base: string,
  state: string | undefined,
  moveId: string | undefined,
  faultMoveId: string | undefined,
  handoverMoveId?: string | undefined,
  interactive?: boolean,
): string {
  const classes = [base];
  if (state && state !== "idle") classes.push(`is-${state}`);
  if (isFaultMove(moveId, faultMoveId)) classes.push("is-note");
  if (isHandoverMove(moveId, handoverMoveId)) classes.push("is-handover");
  if (moveId != null && interactive === false) classes.push("is-inert is-blocked");
  return classes.join(" ");
}

/** Chip width for an SVG label; labels are short technical strings. */
function labelWidth(label: string): number {
  return Math.max(24, label.length * 6.4 + 12);
}

function tickLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.01 || abs >= 10000)) return value.toExponential(1);
  if (abs < 1) return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (abs < 10) return value.toFixed(2);
  return value.toFixed(0);
}

function readoutValue(value: number): string {
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.001 || abs >= 100000)) return value.toExponential(2);
  return value.toFixed(abs < 1 ? 5 : 4).replace(/0+$/, "").replace(/\.$/, "");
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Track the rendered board width so the six-node schematic can reflow to 2×3. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/** Measure horizontal overflow using ResizeObserver so cues appear only when content is wider than container. */
function useBoardOverflow(...deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      setHasOverflow(shouldShowOverflowHint(el.scrollWidth, el.clientWidth));
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(el);
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { scrollRef, hasOverflow };
}

function isSubAbove(sub: string | undefined): boolean {
  return sub != null && sub.startsWith("size ");
}

/**
 * Centre the schematic inside its declared panel without touching level
 * coordinates. The union-find plate reserves a tall viewBox for merged trees;
 * singleton blocks would otherwise float near the top edge.
 */
function graphViewBox(view: GraphView): string {
  const height = view.height ?? 340;
  if (view.nodes.length === 0) return `0 0 640 ${height}`;

  const top = Math.min(...view.nodes.map((node) => node.y - (isSubAbove(node.sub) ? 46 : 36)));
  const bottom = Math.max(
    ...view.nodes.map((node) => node.y + (node.sub != null && !isSubAbove(node.sub) ? 46 : 36)),
  );
  const content = bottom - top;
  const boxHeight = Math.max(height, content + 48);
  const offsetY = Math.round((top + bottom) / 2 - boxHeight / 2);
  return `0 ${offsetY} 640 ${Math.round(boxHeight)}`;
}

const UNION_SIGNATURE = /^[A-F]$/;
const COMPACT_WIDTH = 360;
const COMPACT_COLUMNS = 3;
const COMPACT_X = 60;
const COMPACT_DX = 120;
const COMPACT_Y = 54;
const COMPACT_DY = 96;

/** The union board is the only six-node, A–F graph with size/pointer sub-labels. */
function isUnionBoard(view: GraphView): boolean {
  return (
    view.nodes.length === 6 &&
    view.nodes.every(
      (node) =>
        UNION_SIGNATURE.test(node.label) &&
        (node.sub?.startsWith("size ") === true || node.sub?.startsWith("→ ") === true),
    ) &&
    view.edges.every((edge) => edge.label == null)
  );
}

/**
 * A genuine 2×3 reflow for the six-compartment union board. Components are
 * packed three columns wide; widowed children wrap under their root. The
 * resulting 360-unit viewBox keeps 14 px labels and 64 px hit circles above
 * their 44 px floor at 380 px without a sideways scroll.
 */
function compactUnionLayout(view: GraphView): {
  pos: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
} {
  const ids = new Set(view.nodes.map((node) => node.id));
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of view.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    hasParent.add(edge.from);
    const siblings = children.get(edge.to) ?? [];
    siblings.push(edge.from);
    children.set(edge.to, siblings);
  }
  for (const siblings of children.values()) siblings.sort();

  const roots = view.nodes.filter((node) => !hasParent.has(node.id)).map((node) => node.id);
  const components = roots.map((root) => {
    const levels: string[][] = [];
    let frontier = [root];
    while (frontier.length > 0) {
      levels.push(frontier);
      const next: string[] = [];
      for (const id of frontier) next.push(...(children.get(id) ?? []));
      frontier = next;
    }
    const span = Math.min(
      COMPACT_COLUMNS,
      Math.max(1, ...levels.map((level) => level.length)),
    );
    const rows = levels.reduce((sum, level) => sum + Math.ceil(level.length / span), 0);
    return { levels, span, rows };
  });

  const pos = new Map<string, { x: number; y: number }>();
  type PackedRow = { components: typeof components; used: number; height: number };
  const packed: PackedRow[] = [];
  let currentRow: PackedRow = { components: [], used: 0, height: 0 };

  for (const component of components) {
    if (currentRow.used + component.span > COMPACT_COLUMNS) {
      packed.push(currentRow);
      currentRow = { components: [], used: 0, height: 0 };
    }
    currentRow.components.push(component);
    currentRow.used += component.span;
    currentRow.height = Math.max(currentRow.height, component.rows);
  }
  if (currentRow.components.length > 0) packed.push(currentRow);

  let rowStart = 0;
  for (const packedRow of packed) {
    let column = (COMPACT_COLUMNS - packedRow.used) / 2;

    for (const component of packedRow.components) {
      let cursor = rowStart;
      for (const level of component.levels) {
        for (let start = 0; start < level.length; start += component.span) {
          const chunk = level.slice(start, start + component.span);
          const center = column + (component.span - 1) / 2;
          const step = component.span === COMPACT_COLUMNS ? 1.333 : 1;

          chunk.forEach((id, index) => {
            const columnPosition =
              chunk.length === component.span
                ? column + index
                : center + (index - (chunk.length - 1) / 2) * step;
            pos.set(id, {
              x: COMPACT_X + columnPosition * COMPACT_DX,
              y: COMPACT_Y + cursor * COMPACT_DY,
            });
          });
          cursor += 1;
        }
      }
      column += component.span;
    }

    rowStart += packedRow.height;
  }

  const totalRows = Math.max(1, rowStart);
  return {
    pos,
    width: COMPACT_WIDTH,
    height: COMPACT_Y + (totalRows - 1) * COMPACT_DY + 72,
  };
}

/* ------------------------------------------------------------------ graph -- */

function GraphBoard({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: {
  view: GraphView;
  onMove: (moveId: string) => void;
  faultMoveId?: string;
  handoverMoveId?: string;
  legalMoveIds?: ReadonlySet<string>;
}) {
  const [fit, setFit] = useState(false);
  const markerId = `game-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const handoverDescId = `game-handover-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const { ref: boardRef, width: boardWidth } = useElementWidth<HTMLElement>();
  const compact = boardWidth > 0 && boardWidth <= 540 && isUnionBoard(view);
  const compactLayout = compact ? compactUnionLayout(view) : null;
  const pointOf = (id: string) => {
    const point = compactLayout?.pos.get(id);
    if (point) return point;
    const node = nodes.get(id);
    return node ? { x: node.x, y: node.y } : null;
  };
  const viewBox = compactLayout
    ? `0 0 ${compactLayout.width} ${compactLayout.height}`
    : graphViewBox(view);
  const { scrollRef, hasOverflow } = useBoardOverflow(fit, view, compact);

  return (
    <figure
      ref={boardRef}
      className={`game-board game-board--graph${compact ? " game-board--compact" : ""}${fit ? " is-fit" : ""}`}
    >
      <span id={handoverDescId} className="visually-hidden">Recommended opening move</span>
      <header className="game-board__head">
        <span className="game-board__head-label">STRUCTURE</span>
        <div className="game-board__head-actions">
          {supportsFitView("graph") && (
            <button
              type="button"
              className="game-board__fit-toggle"
              onClick={() => setFit(!fit)}
              aria-pressed={fit}
            >
              {fit ? "ACTUAL SIZE" : "FIT VIEW"}
            </button>
          )}
          <span className="game-board__head-meta">
            {pad2(view.nodes.length)} NODES · {pad2(view.edges.length)} EDGES
          </span>
        </div>
      </header>
      {hasOverflow && (
        <div className="game-board__overflow-cue" aria-hidden="true">
          Pan for more →
        </div>
      )}
      <div
        ref={scrollRef}
        className="game-board__scroll"
        tabIndex={0}
        role="group"
        aria-label="Scrollable board (use arrow keys to scroll horizontally)"
      >
        <svg
          className={fit ? "is-fit" : undefined}
          viewBox={viewBox}
          role="group"
          aria-label={view.caption ?? "Puzzle graph"}
        >
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0L8,4L0,8Z" className="game-arrowhead" />
            </marker>
          </defs>

          {view.edges.map((edge) => {
            const from = pointOf(edge.from);
            const to = pointOf(edge.to);
            if (!from || !to) return null;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const x1 = from.x + ux * 22;
            const y1 = from.y + uy * 22;
            const x2 = to.x - ux * 26;
            const y2 = to.y - uy * 26;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const active = Boolean(edge.moveId);
            const interactive = isMoveInteractive(edge.moveId, legalMoveIds);
            const handover = isHandoverMove(edge.moveId, handoverMoveId);
            const chip = edge.label != null ? labelWidth(String(edge.label)) : 0;

            return (
              <g
                key={edge.id}
                className={stateClass("game-edge", edge.state, edge.moveId, faultMoveId, handoverMoveId, edge.moveId ? interactive : undefined)}
              >
                <line className="game-edge__halo" x1={x1} y1={y1} x2={x2} y2={y2} />
                <line
                  className="game-edge__line"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  markerEnd={edge.directed ? `url(#${markerId})` : undefined}
                />
                {edge.label != null && (
                  <g className="game-edge__chip" aria-hidden="true">
                    <rect x={mx - chip / 2} y={my - 17} width={chip} height={17} rx="3" />
                    <text className="game-edge__label" x={mx} y={my - 5} textAnchor="middle">
                      {edge.label}
                    </text>
                  </g>
                )}
                {active && (
                  <line
                    className={`game-edge__hit${isFaultMove(edge.moveId, faultMoveId) ? " is-note" : ""}${handover ? " is-handover" : ""}${!interactive ? " is-inert is-blocked" : ""}`}
                    strokeWidth="28"
                    data-move-id={edge.moveId}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    aria-disabled={!interactive ? "true" : undefined}
                    aria-label={edge.aria ?? edge.id}
                    aria-describedby={handover ? handoverDescId : undefined}
                    onClick={interactive && edge.moveId ? () => onMove(edge.moveId as string) : undefined}
                    onKeyDown={interactive ? (event) => activate(edge.moveId, onMove, event) : undefined}
                  />
                )}
              </g>
            );
          })}

          {view.nodes.map((node) => {
            const fault = isFaultMove(node.moveId, faultMoveId);
            const handover = isHandoverMove(node.moveId, handoverMoveId);
            const interactive = isMoveInteractive(node.moveId, legalMoveIds);
            const tone = fault ? "note" : (node.state ?? "idle");
            const point = pointOf(node.id) ?? { x: node.x, y: node.y };
            const x = point.x;
            const y = point.y;
            const subAbove = isSubAbove(node.sub);
            const subSize = compact ? 14 : 11;
            const subY = subAbove ? y - 34 : y + 34;
            const plateWidth =
              node.sub != null ? Math.max(28, node.sub.length * subSize * 0.63 + 10) : 0;

            return (
              <g
                key={node.id}
                className={stateClass("game-node", node.state, node.moveId, faultMoveId, handoverMoveId, node.moveId ? interactive : undefined)}
                data-move-id={node.moveId}
                role={node.moveId && interactive ? "button" : undefined}
                tabIndex={node.moveId && interactive ? 0 : undefined}
                aria-disabled={node.moveId && !interactive ? "true" : undefined}
                aria-label={node.moveId ? (node.aria ?? node.label) : undefined}
                aria-describedby={handover ? handoverDescId : undefined}
                onClick={node.moveId && interactive ? () => onMove(node.moveId as string) : undefined}
                onKeyDown={interactive ? (event) => activate(node.moveId, onMove, event) : undefined}
              >
                <circle className="game-node__hit" cx={x} cy={y} r="36" />
                <circle className="game-node__halo" cx={x} cy={y} r="28" aria-hidden="true" />
                <circle className="game-node__bevel" cx={x} cy={y} r="23" aria-hidden="true" />
                <circle className="game-node__dot" cx={x} cy={y} r="19" aria-hidden="true" />
                {tone === "active" && (
                  <circle className="game-node__led" cx={x - 14} cy={y - 14} r="2.4" aria-hidden="true" />
                )}
                {tone === "target" && (
                  <circle className="game-node__focus" cx={x} cy={y} r="27" aria-hidden="true" />
                )}
                {tone === "done" && (
                  <path
                    className="game-node__seal"
                    d={`M${x + 8} ${y - 12} l3 3 l6 -7`}
                    aria-hidden="true"
                  />
                )}
                {(tone === "bad") && (
                  <g className="game-node__flag" aria-hidden="true">
                    <circle cx={x + 15} cy={y - 15} r="7" />
                    <text x={x + 15} y={y - 11.5} textAnchor="middle">
                      !
                    </text>
                  </g>
                )}
                <text className="game-node__label" x={x} y={y + 4} textAnchor="middle">
                  {node.label}
                </text>
                {node.sub != null && (
                  <g className="game-node__subplate">
                    <rect
                      x={x - plateWidth / 2}
                      y={subY - subSize * 0.95}
                      width={plateWidth}
                      height={subSize * 1.25}
                      rx="3"
                    />
                    <text className="game-node__sub" x={x} y={subY} textAnchor="middle">
                      {node.sub}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------ array -- */

function ArrayBoard({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: {
  view: ArrayView;
  onMove: (moveId: string) => void;
  faultMoveId?: string;
  handoverMoveId?: string;
  legalMoveIds?: ReadonlySet<string>;
}) {
  const handoverDescId = `game-handover-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <figure className="game-board game-board--array">
      <span id={handoverDescId} className="visually-hidden">Recommended opening move</span>
      <div className="game-array" role="group" aria-label={view.caption ?? "Sequence puzzle"}>
        {view.items.map((item) => {
          const handover = isHandoverMove(item.moveId, handoverMoveId);
          const interactive = isMoveInteractive(item.moveId, legalMoveIds);
          const className = stateClass(
            "game-cell",
            item.state,
            item.moveId,
            faultMoveId,
            handoverMoveId,
            item.moveId ? interactive : undefined,
          );
          const content = (
            <>
              <span className="game-cell__value">{item.value}</span>
              {item.label != null && <span className="game-cell__label">{item.label}</span>}
            </>
          );

          return item.moveId && interactive ? (
            <button
              key={item.id}
              type="button"
              className={className}
              data-move-id={item.moveId}
              aria-label={item.aria ?? `${item.label ?? item.value}`}
              aria-describedby={handover ? handoverDescId : undefined}
              onClick={() => onMove(item.moveId as string)}
            >
              {content}
            </button>
          ) : item.moveId ? (
            <span
              key={item.id}
              className={className}
              data-move-id={item.moveId}
              aria-label={item.aria ?? `${item.label ?? item.value}`}
              aria-disabled="true"
            >
              {content}
            </span>
          ) : (
            <span key={item.id} className={className} aria-label={item.aria}>
              {content}
            </span>
          );
        })}
      </div>

      {view.pointers != null && view.pointers.length > 0 && (
        <div className="game-pointer-row">
          {view.pointers.map((pointer) => (
            <span key={pointer.label} className="game-chip game-chip--pointer">
              {pointer.label} <b>{pointer.index}</b>
            </span>
          ))}
        </div>
      )}

      {view.segments != null && view.segments.length > 0 && (
        <div className="game-pointer-row">
          {view.segments.map((segment, i) => (
            <span key={i} className={`game-chip game-chip--${segment.state ?? "idle"}`}>
              {segment.label ?? "range"} <b>{segment.from}–{segment.to}</b>
            </span>
          ))}
        </div>
      )}

      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------- grid -- */

function GridBoard({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: {
  view: GridView;
  onMove: (moveId: string) => void;
  faultMoveId?: string;
  handoverMoveId?: string;
  legalMoveIds?: ReadonlySet<string>;
}) {
  const handoverDescId = `game-handover-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cells = new Map(view.cells.map((cell) => [`${cell.r}:${cell.c}`, cell]));
  const rows = Array.from({ length: view.rows }, (_, r) => r);
  const cols = Array.from({ length: view.cols }, (_, c) => c);
  const { scrollRef, hasOverflow } = useBoardOverflow(view);

  return (
    <figure className="game-board game-board--grid">
      <span id={handoverDescId} className="visually-hidden">Recommended opening move</span>
      {hasOverflow && (
        <div className="game-board__overflow-cue" aria-hidden="true">
          Pan for more →
        </div>
      )}
      <div
        ref={scrollRef}
        className="game-board__scroll"
        tabIndex={0}
        role="group"
        aria-label="Scrollable board (use arrow keys to scroll horizontally)"
      >
        <table className="game-grid" role="grid" aria-label={view.caption ?? "Table puzzle"}>
          {view.colLabels != null && (
            <thead>
              <tr>
                <th />
                {view.colLabels.map((label, c) => (
                  <th key={c} scope="col">{label}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                {view.rowLabels != null && <th scope="row">{view.rowLabels[r]}</th>}
                {cols.map((c) => {
                  const cell = cells.get(`${r}:${c}`);
                  if (!cell) {
                    return <td key={c} className="game-grid__empty" />;
                  }
                  const handover = isHandoverMove(cell.moveId, handoverMoveId);
                  const interactive = isMoveInteractive(cell.moveId, legalMoveIds);
                  const className = stateClass(
                    "game-cell game-cell--grid",
                    cell.state,
                    cell.moveId,
                    faultMoveId,
                    handoverMoveId,
                    cell.moveId ? interactive : undefined,
                  );
                  return (
                    <td key={c}>
                      {cell.moveId && interactive ? (
                        <button
                          type="button"
                          className={className}
                          data-move-id={cell.moveId}
                          aria-label={cell.aria ?? `Row ${r}, column ${c}: ${cell.value}`}
                          aria-describedby={handover ? handoverDescId : undefined}
                          onClick={() => onMove(cell.moveId as string)}
                        >
                          {cell.value}
                        </button>
                      ) : cell.moveId ? (
                        <span
                          className={className}
                          data-move-id={cell.moveId}
                          aria-label={cell.aria ?? `Row ${r}, column ${c}: ${cell.value}`}
                          aria-disabled="true"
                        >
                          {cell.value}
                        </span>
                      ) : (
                        <span className={className} aria-label={cell.aria}>
                          {cell.value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------- tree -- */

function TreeBoard({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: {
  view: TreeView;
  onMove: (moveId: string) => void;
  faultMoveId?: string;
  handoverMoveId?: string;
  legalMoveIds?: ReadonlySet<string>;
}) {
  const [fit, setFit] = useState(false);
  const handoverDescId = `game-handover-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const { scrollRef, hasOverflow } = useBoardOverflow(fit, view);

  return (
    <figure className={`game-board game-board--tree${fit ? " is-fit" : ""}`}>
      <span id={handoverDescId} className="visually-hidden">Recommended opening move</span>
      <header className="game-board__head">
        <span className="game-board__head-label">STRUCTURE</span>
        <div className="game-board__head-actions">
          {supportsFitView("tree") && (
            <button
              type="button"
              className="game-board__fit-toggle"
              onClick={() => setFit(!fit)}
              aria-pressed={fit}
            >
              {fit ? "ACTUAL SIZE" : "FIT VIEW"}
            </button>
          )}
          <span className="game-board__head-meta">
            {pad2(view.nodes.length)} NODES · {pad2(view.edges.length)} EDGES
          </span>
        </div>
      </header>
      {hasOverflow && (
        <div className="game-board__overflow-cue" aria-hidden="true">
          Pan for more →
        </div>
      )}
      <div
        ref={scrollRef}
        className="game-board__scroll"
        tabIndex={0}
        role="group"
        aria-label="Scrollable board (use arrow keys to scroll horizontally)"
      >
        <svg
          className={fit ? "is-fit" : undefined}
          viewBox={`0 0 640 ${view.height ?? 340}`}
          role="group"
          aria-label={view.caption ?? "Tree puzzle"}
        >
          {view.edges.map((edge, i) => {
            const from = nodes.get(edge.from);
            const to = nodes.get(edge.to);
            if (!from || !to) return null;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const x1 = from.x + ux * 22;
            const y1 = from.y + uy * 22;
            const x2 = to.x - ux * 26;
            const y2 = to.y - uy * 26;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const chip = edge.label != null ? labelWidth(String(edge.label)) : 0;

            return (
              <g key={i} className={stateClass("game-edge", edge.state, undefined, undefined)}>
                <line className="game-edge__halo" x1={x1} y1={y1} x2={x2} y2={y2} />
                <line className="game-edge__line" x1={x1} y1={y1} x2={x2} y2={y2} />
                {edge.label != null && (
                  <g className="game-edge__chip" aria-hidden="true">
                    <rect x={mx - chip / 2} y={my - 17} width={chip} height={17} rx="3" />
                    <text className="game-edge__label" x={mx} y={my - 5} textAnchor="middle">
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {view.nodes.map((node) => {
            const fault = isFaultMove(node.moveId, faultMoveId);
            const handover = isHandoverMove(node.moveId, handoverMoveId);
            const interactive = isMoveInteractive(node.moveId, legalMoveIds);
            const tone = fault ? "note" : (node.state ?? "idle");

            return (
              <g
                key={node.id}
                className={stateClass("game-node", node.state, node.moveId, faultMoveId, handoverMoveId, node.moveId ? interactive : undefined)}
                data-move-id={node.moveId}
                role={node.moveId && interactive ? "button" : undefined}
                tabIndex={node.moveId && interactive ? 0 : undefined}
                aria-disabled={node.moveId && !interactive ? "true" : undefined}
                aria-label={node.moveId ? (node.aria ?? node.label) : undefined}
                aria-describedby={handover ? handoverDescId : undefined}
                onClick={node.moveId && interactive ? () => onMove(node.moveId as string) : undefined}
                onKeyDown={interactive ? (event) => activate(node.moveId, onMove, event) : undefined}
              >
                <circle className="game-node__hit" cx={node.x} cy={node.y} r="34" />
                <circle className="game-node__halo" cx={node.x} cy={node.y} r="28" aria-hidden="true" />
                <circle className="game-node__bevel" cx={node.x} cy={node.y} r="23" aria-hidden="true" />
                <circle className="game-node__dot" cx={node.x} cy={node.y} r="19" aria-hidden="true" />
                {tone === "active" && (
                  <circle
                    className="game-node__led"
                    cx={node.x - 14}
                    cy={node.y - 14}
                    r="2.4"
                    aria-hidden="true"
                  />
                )}
                {tone === "target" && (
                  <circle
                    className="game-node__focus"
                    cx={node.x}
                    cy={node.y}
                    r="27"
                    aria-hidden="true"
                  />
                )}
                {tone === "done" && (
                  <path
                    className="game-node__seal"
                    d={`M${node.x + 8} ${node.y - 12} l3 3 l6 -7`}
                    aria-hidden="true"
                  />
                )}
                {(tone === "bad") && (
                  <g className="game-node__flag" aria-hidden="true">
                    <circle cx={node.x + 15} cy={node.y - 15} r="7" />
                    <text x={node.x + 15} y={node.y - 11.5} textAnchor="middle">
                      !
                    </text>
                  </g>
                )}
                <text className="game-node__label" x={node.x} y={node.y + 4} textAnchor="middle">
                  {node.label}
                </text>
                {node.weight != null && (
                  <g className="game-node__weight-badge" aria-hidden="true">
                    <circle cx={node.x + 18} cy={node.y - 15} r="11.5" />
                    <text
                      className="game-node__weight"
                      x={node.x + 18}
                      y={node.y - 10.8}
                      textAnchor="middle"
                    >
                      {node.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ---------------------------------------------------------------- pairing -- */

function PairingBoard({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: {
  view: PairingView;
  onMove: (moveId: string) => void;
  faultMoveId?: string;
  handoverMoveId?: string;
  legalMoveIds?: ReadonlySet<string>;
}) {
  const handoverDescId = `game-handover-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const item = (
    entry: PairingView["left"][number],
    side: "left" | "right",
  ) => {
    const handover = isHandoverMove(entry.moveId, handoverMoveId);
    const interactive = isMoveInteractive(entry.moveId, legalMoveIds);
    const className = stateClass(
      "game-pair",
      entry.state,
      entry.moveId,
      faultMoveId,
      handoverMoveId,
      entry.moveId ? interactive : undefined,
    );
    return entry.moveId && interactive ? (
      <button
        key={entry.id}
        type="button"
        className={className}
        data-move-id={entry.moveId}
        aria-label={`${side} ${entry.label}`}
        aria-describedby={handover ? handoverDescId : undefined}
        onClick={() => onMove(entry.moveId as string)}
      >
        {entry.label}
      </button>
    ) : entry.moveId ? (
      <span
        key={entry.id}
        className={className}
        data-move-id={entry.moveId}
        aria-label={`${side} ${entry.label}`}
        aria-disabled="true"
      >
        {entry.label}
      </span>
    ) : (
      <span key={entry.id} className={className}>{entry.label}</span>
    );
  };

  return (
    <figure className="game-board game-board--pairing">
      <span id={handoverDescId} className="visually-hidden">Recommended opening move</span>
      <div className="game-pairing">
        <div className="game-pairing__col game-pairing__col--left" role="group" aria-label="Left side">
          {view.left.map((e) => item(e, "left"))}
        </div>
        <div className="game-pairing__links" role="group" aria-label="Matches">
          {view.links.map((link, i) => (
            <span key={i} className={stateClass("game-link", link.state, undefined, undefined)}>
              {link.left} ↔ {link.right}
            </span>
          ))}
        </div>
        <div className="game-pairing__col game-pairing__col--right" role="group" aria-label="Right side">
          {view.right.map((e) => item(e, "right"))}
        </div>
      </div>
      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ----------------------------------------------------------------- number -- */

function NumberBoard({
  view,
  handoverMoveId,
}: {
  view: NumberView;
  handoverMoveId?: string;
}) {
  const [fit, setFit] = useState(false);
  const { scrollRef, hasOverflow } = useBoardOverflow(fit, view);
  const points = view.history.length > 0 ? view.history : [{ x: 0, y: view.value }];
  const values = [...points.map((p) => p.y), view.target, view.value];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 1e-9);
  const lo = min - pad;
  const hi = max + pad;
  const width = 640;
  const height = 260;
  const inset = 36;
  const x = (i: number) => inset + (i / Math.max(points.length - 1, 1)) * (width - inset * 2);
  const y = (value: number) => height - inset - ((value - lo) / (hi - lo)) * (height - inset * 2);
  const plotBottom = height - inset;
  const plotRight = width - inset;
  const targetY = y(view.target);
  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.y);
  const valueText = readoutValue(last.y);
  const readoutWidth = Math.max(36, valueText.length * 6 + 10);
  const readoutX = Math.min(Math.max(lastX - readoutWidth / 2, inset), plotRight - readoutWidth);
  const readoutBelow = lastY < plotBottom - 34;
  const readoutY = readoutBelow ? lastY + 9 : lastY - 27;
  const targetText = `target ${view.target}`;
  const targetWidth = Math.max(44, targetText.length * 6 + 12);
  const targetChipY = Math.max(inset - 2, targetY - 21);
  const areaPath =
    points.length > 1
      ? `M ${x(0)} ${plotBottom} ${points
          .map((p, i) => `L ${x(i)} ${y(p.y)}`)
          .join(" ")} L ${lastX} ${plotBottom} Z`
      : null;

  return (
    <figure className={`game-board game-board--number${fit ? " is-fit" : ""}`}>
      <header className="game-board__head">
        <span className="game-board__head-label">TRACE</span>
        <div className="game-board__head-actions">
          {supportsFitView("number") && (
            <button
              type="button"
              className="game-board__fit-toggle"
              onClick={() => setFit(!fit)}
              aria-pressed={fit}
            >
              {fit ? "ACTUAL SIZE" : "FIT VIEW"}
            </button>
          )}
        </div>
      </header>
      {hasOverflow && (
        <div className="game-board__overflow-cue" aria-hidden="true">
          Pan for more →
        </div>
      )}
      <div
        ref={scrollRef}
        className="game-board__scroll"
        tabIndex={0}
        role="group"
        aria-label="Scrollable board (use arrow keys to scroll horizontally)"
      >
        <svg
          className={fit ? "is-fit" : undefined}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={view.caption ?? "Iteration plot"}
        >
          <g className="game-plot-grid" aria-hidden="true">
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={`h-${t}`}
                className={t === 0.5 ? "game-gridline game-gridline--major" : "game-gridline"}
                x1={inset}
                y1={inset + t * (plotBottom - inset)}
                x2={plotRight}
                y2={inset + t * (plotBottom - inset)}
              />
            ))}
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line
                key={`v-${i}`}
                className={i === 4 ? "game-gridline game-gridline--major" : "game-gridline"}
                x1={inset + (i / 8) * (plotRight - inset)}
                y1={inset}
                x2={inset + (i / 8) * (plotRight - inset)}
                y2={plotBottom}
              />
            ))}
          </g>

          <line className="game-axis" x1={inset} y1={plotBottom} x2={plotRight} y2={plotBottom} />
          <line className="game-axis" x1={inset} y1={inset} x2={inset} y2={plotBottom} />

          {[0, 0.5, 1].map((t) => (
            <text
              key={`t-${t}`}
              className="game-axis__tick"
              x={inset - 6}
              y={inset + t * (plotBottom - inset) + 3}
              textAnchor="end"
              aria-hidden="true"
            >
              {tickLabel(t === 0 ? hi : t === 1 ? lo : (lo + hi) / 2)}
            </text>
          ))}

          <line className="game-target" x1={inset} y1={targetY} x2={plotRight} y2={targetY} />
          <g className="game-target__chip" aria-hidden="true">
            <rect x={plotRight - targetWidth} y={targetChipY} width={targetWidth} height="17" rx="3" />
            <text className="game-axis__label" x={plotRight - 6} y={targetChipY + 12} textAnchor="end">
              target {view.target}
            </text>
          </g>

          <line className="game-cursor" x1={inset} y1={lastY} x2={lastX} y2={lastY} aria-hidden="true" />
          <line className="game-cursor" x1={lastX} y1={plotBottom} x2={lastX} y2={lastY} aria-hidden="true" />

          {areaPath != null && <path className="game-series__area" d={areaPath} aria-hidden="true" />}
          <polyline
            className="game-series"
            points={points.map((p, i) => `${x(i)},${y(p.y)}`).join(" ")}
          />
          {points.map((p, i) => (
            <circle
              key={i}
              className={
                i === points.length - 1
                  ? "game-series__dot game-series__dot--current"
                  : "game-series__dot"
              }
              cx={x(i)}
              cy={y(p.y)}
              r={i === points.length - 1 ? 5 : 4}
            />
          ))}

          <g className="game-series__readout" aria-hidden="true">
            <rect x={readoutX} y={readoutY} width={readoutWidth} height="18" rx="3" />
            <text x={readoutX + readoutWidth / 2} y={readoutY + 12.5} textAnchor="middle">
              {valueText}
            </text>
          </g>

          <text className="game-axis__label" x={plotRight} y={height - 10} textAnchor="end">
            {view.xLabel ?? "step"}
          </text>
          <text className="game-axis__label" x={12} y={inset - 12} textAnchor="start">
            {view.yLabel ?? "value"}
          </text>
        </svg>
      </div>
      {view.note != null && <p className="game-note">{view.note}</p>}
      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ---------------------------------------------------------------- formula -- */

function FormulaBoard({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: {
  view: FormulaView;
  onMove: (moveId: string) => void;
  faultMoveId?: string;
  handoverMoveId?: string;
  legalMoveIds?: ReadonlySet<string>;
}) {
  const handoverDescId = `game-handover-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <figure className="game-board game-board--formula">
      <span id={handoverDescId} className="visually-hidden">Recommended opening move</span>
      <div className="game-formula">
        <div className="game-formula__rows" role="group" aria-label="Measurements">
          {view.rows.map((row) => {
            const handover = isHandoverMove(row.moveId, handoverMoveId);
            const interactive = isMoveInteractive(row.moveId, legalMoveIds);
            const className = stateClass(
              "game-formula__row",
              row.state,
              row.moveId,
              faultMoveId,
              handoverMoveId,
              row.moveId ? interactive : undefined,
            );
            const content = (
              <>
                <span className="game-formula__label">{row.label}</span>
                <code className="game-formula__code">{row.formula}</code>
              </>
            );
            return row.moveId && interactive ? (
              <button
                key={row.id}
                type="button"
                className={className}
                data-move-id={row.moveId}
                aria-label={`${row.label}: ${row.formula}`}
                aria-describedby={handover ? handoverDescId : undefined}
                onClick={() => onMove(row.moveId as string)}
              >
                {content}
              </button>
            ) : row.moveId ? (
              <div
                key={row.id}
                className={className}
                data-move-id={row.moveId}
                aria-label={`${row.label}: ${row.formula}`}
                aria-disabled="true"
              >
                {content}
              </div>
            ) : (
              <div key={row.id} className={className}>{content}</div>
            );
          })}
        </div>
        <div className="game-formula__outputs" role="group" aria-label="Outputs">
          {view.outputs.map((output) => {
            const handover = isHandoverMove(output.moveId, handoverMoveId);
            const interactive = isMoveInteractive(output.moveId, legalMoveIds);
            const className = stateClass(
              "game-formula__output",
              output.state,
              output.moveId,
              faultMoveId,
              handoverMoveId,
              output.moveId ? interactive : undefined,
            );
            const content = (
              <>
                <span className="game-formula__label">{output.label}</span>
                <code className="game-formula__code">{output.formula}</code>
              </>
            );
            return output.moveId && interactive ? (
              <button
                key={output.id}
                type="button"
                className={className}
                data-move-id={output.moveId}
                aria-label={`${output.label}: ${output.formula}`}
                aria-describedby={handover ? handoverDescId : undefined}
                onClick={() => onMove(output.moveId as string)}
              >
                {content}
              </button>
            ) : output.moveId ? (
              <div
                key={output.id}
                className={className}
                data-move-id={output.moveId}
                aria-label={`${output.label}: ${output.formula}`}
                aria-disabled="true"
              >
                {content}
              </div>
            ) : (
              <div key={output.id} className={className}>{content}</div>
            );
          })}
        </div>
      </div>
      {view.caption != null && <figcaption className="game-caption">{view.caption}</figcaption>}
    </figure>
  );
}

/* ----------------------------------------------------------------- switch -- */

export default function Board({
  view,
  onMove,
  faultMoveId,
  handoverMoveId,
  legalMoveIds,
}: BoardProps) {
  switch (view.kind) {
    case "graph":
      return (
        <GraphBoard
          view={view}
          onMove={onMove}
          faultMoveId={faultMoveId}
          handoverMoveId={handoverMoveId}
          legalMoveIds={legalMoveIds}
        />
      );
    case "array":
      return (
        <ArrayBoard
          view={view}
          onMove={onMove}
          faultMoveId={faultMoveId}
          handoverMoveId={handoverMoveId}
          legalMoveIds={legalMoveIds}
        />
      );
    case "grid":
      return (
        <GridBoard
          view={view}
          onMove={onMove}
          faultMoveId={faultMoveId}
          handoverMoveId={handoverMoveId}
          legalMoveIds={legalMoveIds}
        />
      );
    case "tree":
      return (
        <TreeBoard
          view={view}
          onMove={onMove}
          faultMoveId={faultMoveId}
          handoverMoveId={handoverMoveId}
          legalMoveIds={legalMoveIds}
        />
      );
    case "pairing":
      return (
        <PairingBoard
          view={view}
          onMove={onMove}
          faultMoveId={faultMoveId}
          handoverMoveId={handoverMoveId}
          legalMoveIds={legalMoveIds}
        />
      );
    case "number":
      return <NumberBoard view={view} handoverMoveId={handoverMoveId} />;
    case "formula":
      return (
        <FormulaBoard
          view={view}
          onMove={onMove}
          faultMoveId={faultMoveId}
          handoverMoveId={handoverMoveId}
          legalMoveIds={legalMoveIds}
        />
      );
    default:
      return <p className="game-note">This board is not available yet.</p>;
  }
}
