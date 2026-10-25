import { Fragment } from "react";

import "../../styles/algorithms.css";

export type MentalImageKind =
  | "quicksort-ghost"
  | "karatsuba-split"
  | "strassen-valves"
  | "mst-weld"
  | "toposort-shadow";

type Props = {
  kind: MentalImageKind;
  /** Accessible name for the plate; defaults to a description of the picture. */
  title?: string;
  caption?: string;
  /** Taller than the plate's layout height adds breathing room; shorter would clip it. */
  height?: number;
};

const BASE_HEIGHT: Record<MentalImageKind, number> = {
  "quicksort-ghost": 300,
  "karatsuba-split": 300,
  "strassen-valves": 340,
  "mst-weld": 320,
  "toposort-shadow": 340,
};

const DEFAULT_TITLE: Record<MentalImageKind, string> = {
  "quicksort-ghost": "Two quicksort recursion trees: balanced random pivots and a degenerate sorted-input chain",
  "karatsuba-split": "Karatsuba's three products, with the cross terms isolated by subtraction",
  "strassen-valves": "Strassen's seven compound products and the signed contributions to four output blocks",
  "mst-weld": "A minimum spanning tree whose welds are the cheapest edges across their cuts",
  "toposort-shadow": "One six-node DAG and five of its valid linear extensions",
};

/**
 * One path holding many stroked circles. Used where a plate needs every node
 * labelled but a circle element per node would blow the element budget.
 */
function dotPath(points: ReadonlyArray<readonly [number, number]>, r: number): string {
  return points
    .map(
      ([cx, cy]) =>
        `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`,
    )
    .join("");
}

/* ------------------------------------------------------------------ 1 ---- */

const QS_TREE: ReadonlyArray<readonly [number, number, string]> = [
  [165.5, 62, "50"],
  [91.5, 110, "25"],
  [239.5, 110, "75"],
  [54.5, 158, "12"],
  [128.5, 158, "37"],
  [202.5, 158, "62"],
  [276.5, 158, "87"],
  [36, 206, "5"],
  [73, 206, "18"],
  [110, 206, "30"],
  [147, 206, "42"],
  [184, 206, "55"],
  [221, 206, "68"],
  [258, 206, "80"],
  [295, 206, "95"],
];

const QS_CHAIN: ReadonlyArray<readonly [number, number, string]> = [
  [395, 70, "5"],
  [417, 86, "8"],
  [439, 102, "12"],
  [461, 118, "18"],
  [483, 134, "30"],
  [505, 150, "42"],
  [527, 166, "55"],
  [549, 182, "68"],
  [571, 198, "80"],
  [593, 214, "95"],
];

const QS_TREE_EDGES =
  "M165.5,62L91.5,110M165.5,62L239.5,110" +
  "M91.5,110L54.5,158M91.5,110L128.5,158" +
  "M239.5,110L202.5,158M239.5,110L276.5,158" +
  "M54.5,158L36,206M54.5,158L73,206" +
  "M128.5,158L110,206M128.5,158L147,206" +
  "M202.5,158L184,206M202.5,158L221,206" +
  "M276.5,158L258,206M276.5,158L295,206";

const QS_CHAIN_EDGES =
  "M395,70L417,86L439,102L461,118L483,134L505,150L527,166L549,182L571,198L593,214";

function QuicksortGhost() {
  return (
    <g>
      <text className="alg-mi__label" x="165.5" y="34" textAnchor="middle">
        random pivots
      </text>
      <text className="alg-mi__label" x="495" y="34" textAnchor="middle">
        sorted input, first pivot
      </text>

      <line className="alg-mi__rule" x1="320" y1="50" x2="320" y2="250" />

      <path className="alg-mi__edge" d={QS_TREE_EDGES} />
      <path className="alg-mi__edge" d={QS_CHAIN_EDGES} />
      <path
        className="alg-mi__node"
        d={dotPath(
          [...QS_TREE, ...QS_CHAIN].map(([x, y]) => [x, y] as const),
          10.5,
        )}
      />
      {QS_TREE.map(([x, y, label]) => (
        <text key={`tree-${label}`} className="alg-mi__node-text" x={x} y={y} dy="0.35em" textAnchor="middle">
          {label}
        </text>
      ))}
      {QS_CHAIN.map(([x, y, label]) => (
        <text key={`chain-${label}`} className="alg-mi__node-text" x={x} y={y} dy="0.35em" textAnchor="middle">
          {label}
        </text>
      ))}

      <text className="alg-mi__sub" x="165.5" y="242" textAnchor="middle">
        depth ≈ 1.39 log₂ n
      </text>
      <text className="alg-mi__sub" x="495" y="242" textAnchor="middle">
        depth = n
      </text>

      <text className="alg-mi__mono" x="36" y="270">
        2,018,053 comparisons
      </text>
      <text className="alg-mi__mono" x="352" y="270">
        4,999,950,000 comparisons
      </text>
      <text className="alg-mi__tiny" x="310" y="270" textAnchor="middle">
        vs
      </text>
      <text className="alg-mi__tiny" x="30" y="292">
        shapes schematic; counts for n = 100,000
      </text>
      <text className="alg-mi__mono alg-mi__mono--accent" x="480" y="292" textAnchor="middle">
        2,478× worse
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ 2 ---- */

const KARATSUBA_LEFT: ReadonlyArray<readonly [number, number, string]> = [
  [112, 96, "a₁b₁"],
  [228, 96, "a₁b₀"],
  [112, 176, "a₀b₁"],
  [228, 176, "a₀b₀"],
];

const KARATSUBA_RIGHT: ReadonlyArray<readonly [number, number, string]> = [
  [412, 96, "a₁b₁"],
  [528, 96, "a₁b₀"],
  [412, 176, "a₀b₁"],
  [528, 176, "a₀b₀"],
];

function KaratsubaSplit() {
  return (
    <g>
      <text className="alg-mi__label" x="170" y="32" textAnchor="middle">
        schoolbook: 4 products
      </text>
      <text className="alg-mi__label" x="470" y="32" textAnchor="middle">
        Karatsuba: 3 products
      </text>

      <path className="alg-mi__block" d="M54,56H286V216H54ZM170,56V216M54,136H286" />
      <path className="alg-mi__block" d="M354,56H586V216H354ZM470,56V216M354,136H586" />

      <rect className="alg-mi__block alg-mi__block--cross" x="470" y="56" width="116" height="80" />
      <rect className="alg-mi__block alg-mi__block--cross" x="354" y="136" width="116" height="80" />

      {KARATSUBA_LEFT.map(([x, y, label]) => (
        <text key={`l-${label}`} className="alg-mi__mono alg-mi__mono--quad" x={x} y={y} dy="0.35em" textAnchor="middle">
          {label}
        </text>
      ))}
      {KARATSUBA_RIGHT.map(([x, y, label]) => (
        <text key={`r-${label}`} className="alg-mi__mono alg-mi__mono--quad" x={x} y={y} dy="0.35em" textAnchor="middle">
          {label}
        </text>
      ))}

      <path className="alg-mi__bracket" d="M354,228V234H586V228" />
      <text className="alg-mi__mono" x="470" y="252" textAnchor="middle">
        (a₁+a₀)(b₁+b₀)
      </text>
      <text className="alg-mi__sub" x="470" y="274" textAnchor="middle">
        − a₁b₁ − a₀b₀ leaves a₁b₀ + a₀b₁
      </text>
      <text className="alg-mi__mono alg-mi__mono--accent" x="320" y="293" textAnchor="middle">
        z₁ = (a₁+a₀)(b₁+b₀) − z₂ − z₀
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ 3 ---- */

const STRASSEN_COLS = [300, 385, 470, 555];

/** "+", "−" or "" (no contribution) for C11, C12, C21, C22. */
const STRASSEN_ROWS: ReadonlyArray<readonly [string, ReadonlyArray<"+" | "−" | "">]> = [
  ["M1 = (A11+A22)(B11+B22)", ["+", "", "", "+"]],
  ["M2 = (A21+A22)B11", ["", "", "+", "−"]],
  ["M3 = A11(B12−B22)", ["", "+", "", "+"]],
  ["M4 = A22(B21−B11)", ["+", "", "+", ""]],
  ["M5 = (A11+A12)B22", ["−", "+", "", ""]],
  ["M6 = (A21−A11)(B11+B12)", ["", "", "", "+"]],
  ["M7 = (A12−A22)(B21+B22)", ["+", "", "", ""]],
];

function StrassenValves() {
  return (
    <g>
      <text className="alg-mi__title" x="320" y="28" textAnchor="middle">
        seven measurements, four outputs
      </text>

      <path className="alg-mi__rule" d="M240,50V272M258,74H612" />

      {["C11", "C12", "C21", "C22"].map((label, i) => (
        <text key={label} className="alg-mi__mono alg-mi__mono--head" x={STRASSEN_COLS[i]} y="64" textAnchor="middle">
          {label}
        </text>
      ))}

      {STRASSEN_ROWS.map(([formula, cells], row) => {
        const y = 86 + row * 28;
        return (
          <Fragment key={formula}>
            <text className="alg-mi__mono alg-mi__mono--formula" x="20" y={y} dy="0.35em">
              {formula}
            </text>
            {cells.map((cell, col) =>
              cell === "" ? (
                <circle key={col} className="alg-mi__dot" cx={STRASSEN_COLS[col]} cy={y} r="2.4" />
              ) : (
                <text
                  key={col}
                  className={cell === "+" ? "alg-mi__plus" : "alg-mi__minus"}
                  x={STRASSEN_COLS[col]}
                  y={y}
                  dy="0.35em"
                  textAnchor="middle"
                >
                  {cell}
                </text>
              ),
            )}
          </Fragment>
        );
      })}

      <text className="alg-mi__tiny" x="320" y="298" textAnchor="middle">
        each M is one compound product; the signs are where it is added or removed
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ 4 ---- */

const MST_NODES: ReadonlyArray<readonly [number, number, string]> = [
  [90, 225, "A"],
  [314, 225, "B"],
  [90, 86, "D"],
  [314, 86, "E"],
  [537, 86, "F"],
  [537, 225, "C"],
];

const MST_WEIGHTS: ReadonlyArray<readonly [number, number, string]> = [
  [72, 156, "1"],
  [202, 245, "2"],
  [196, 172, "3"],
  [330, 156, "1"],
  [202, 76, "2"],
  [390, 76, "1"],
  [551, 120, "1"],
  [428, 180, "2"],
];

function MstWeld() {
  return (
    <g>
      <text className="alg-mi__title" x="320" y="28" textAnchor="middle">
        each weld is the cheapest bridge across its cut
      </text>

      <path className="alg-mi__edge" d="M314,225L90,86M90,86L314,86M314,86L537,225" />
      <path
        className="alg-mi__edge alg-mi__edge--weld"
        d="M90,225L90,86M90,225L314,225M314,225L314,86M314,86L537,86M537,86L537,225"
      />

      {MST_NODES.map(([x, y, label]) => (
        <g key={label}>
          <circle className="alg-mi__node" cx={x} cy={y} r="14" />
          <text className="alg-mi__node-text" x={x} y={y} dy="0.35em" textAnchor="middle">
            {label}
          </text>
        </g>
      ))}

      {MST_WEIGHTS.map(([x, y, w], i) => (
        <text
          key={`${x}-${y}-${i}`}
          className="alg-mi__mono alg-mi__mono--weight"
          x={x}
          y={y}
          dy="0.35em"
          textAnchor={x === 72 ? "end" : x === 330 || x === 551 ? "start" : "middle"}
        >
          {w}
        </text>
      ))}

      <path className="alg-mi__cut" d="M622,150H470V286" />
      <text className="alg-mi__tiny" x="610" y="142" textAnchor="end">
        cut
      </text>

      <line className="alg-mi__leader" x1="552" y1="177" x2="541" y2="177" />
      <rect className="alg-mi__tag" x="552" y="168" width="54" height="19" rx="4" />
      <text className="alg-mi__tagtext" x="579" y="181" textAnchor="middle">
        safe
      </text>

      <line className="alg-mi__legend alg-mi__legend--weld" x1="40" y1="288" x2="64" y2="288" />
      <text className="alg-mi__tiny" x="72" y="292">
        weld · MST, 5 edges, total 6
      </text>
      <line className="alg-mi__legend" x1="330" y1="288" x2="354" y2="288" />
      <text className="alg-mi__tiny" x="362" y="292">
        other bridges
      </text>
      <text className="alg-mi__tiny" x="320" y="312" textAnchor="middle">
        cut at the last Prim weld C–F · weights from the page
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ 5 ---- */

const DAG_NODES: ReadonlyArray<readonly [number, number, string]> = [
  [170, 90, "A"],
  [95, 150, "B"],
  [245, 150, "C"],
  [95, 210, "D"],
  [245, 210, "E"],
  [170, 270, "F"],
];

const DAG_EDGES = [
  "M157.5,100L107.5,140", // A→B
  "M182.5,100L232.5,140", // A→C
  "M95,166L95,194", // B→D
  "M230.1,155.9L109.9,204.1", // C→D
  "M245,166L245,194", // C→E
  "M107.5,220L157.5,260", // D→F
  "M232.5,220L182.5,260", // E→F
];

/** The five linear extensions of A→B, A→C, B→D, C→D, C→E, D→F, E→F. */
const DAG_SHADOWS = [
  "A → B → C → D → E → F",
  "A → B → C → E → D → F",
  "A → C → B → D → E → F",
  "A → C → B → E → D → F",
  "A → C → E → B → D → F",
];

function ToposortShadow() {
  return (
    <g>
      <text className="alg-mi__sub" x="170" y="56" textAnchor="middle">
        the DAG
      </text>
      <text className="alg-mi__sub" x="470" y="56" textAnchor="middle">
        five linear extensions
      </text>

      <defs>
        <marker
          id="alg-mi-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path className="alg-mi__arrowhead" d="M0,0L8,4L0,8Z" />
        </marker>
      </defs>

      {DAG_EDGES.map((d) => (
        <path
          key={d}
          className="alg-mi__edge alg-mi__edge--arc"
          d={d}
          markerEnd="url(#alg-mi-arrow)"
        />
      ))}

      {DAG_NODES.map(([x, y, label]) => (
        <Fragment key={label}>
          <circle className="alg-mi__node" cx={x} cy={y} r="14" />
          <text className="alg-mi__node-text" x={x} y={y} dy="0.35em" textAnchor="middle">
            {label}
          </text>
        </Fragment>
      ))}

      <text className="alg-mi__tiny" x="170" y="304" textAnchor="middle">
        layered by longest path from the source
      </text>

      <path className="alg-mi__rule" d="M348,118H620M348,152H620M348,186H620M348,220H620M348,254H620" />
      {DAG_SHADOWS.map((track, i) => {
        const y = 112 + i * 34;
        return (
          <Fragment key={track}>
            <text className="alg-mi__tiny" x="340" y={y} textAnchor="middle">
              {i + 1}
            </text>
            <text className="alg-mi__mono alg-mi__mono--track" x="354" y={y}>
              {track}
            </text>
          </Fragment>
        );
      })}

      <path className="alg-mi__bracket" d="M332,104H322V256H332" />
      <text className="alg-mi__sub" x="470" y="286" textAnchor="middle">
        5 valid schedules out of 6! = 720
      </text>
    </g>
  );
}

/* ------------------------------------------------------------- component -- */

export default function MentalImage({ kind, title, caption, height }: Props) {
  const base = BASE_HEIGHT[kind];
  const H = height != null && height > base ? height : base;
  const titleId = `alg-mi-title-${kind}`;
  const accessibleName = title ?? DEFAULT_TITLE[kind];
  const scrollable = kind === "strassen-valves";

  const svg = (
    <svg
      className="alg-mi__svg"
      viewBox={`0 0 640 ${H}`}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{accessibleName}</title>
      {kind === "quicksort-ghost" && <QuicksortGhost />}
      {kind === "karatsuba-split" && <KaratsubaSplit />}
      {kind === "strassen-valves" && <StrassenValves />}
      {kind === "mst-weld" && <MstWeld />}
      {kind === "toposort-shadow" && <ToposortShadow />}
    </svg>
  );

  return (
    <figure className="alg-mi">
      {scrollable ? (
        <div
          className="alg-mi__scroll"
          tabIndex={0}
          role="region"
          aria-label={`${accessibleName} (scroll horizontally to see all columns)`}
        >
          {svg}
        </div>
      ) : (
        svg
      )}
      {caption != null && <figcaption className="alg-mi__caption">{caption}</figcaption>}
    </figure>
  );
}
