import type {
  EdgeState,
  GameEvent,
  LevelModule,
  Move,
  NodeState,
  TreeView,
} from "../../types";
import { huffmanCodingMeta } from "../meta/huffman-coding";

type HNode = {
  id: string;
  label: string;
  weight: number;
  left: string | null;
  right: string | null;
  parent: string | null;
};

type HuffmanState = {
  nodes: Record<string, HNode>;
  roots: string[];
  selected: string | null;
  /** Sum of internal-node weights, in hundredths of a bit per symbol. */
  cost: number;
  merges: number;
  next: number;
  last: string | null;
};

const SYMBOLS: { id: string; weight: number }[] = [
  { id: "A", weight: 40 },
  { id: "B", weight: 25 },
  { id: "C", weight: 15 },
  { id: "D", weight: 10 },
  { id: "E", weight: 5 },
  { id: "F", weight: 5 },
];

const TARGET = 225;
const H = "2.2037";

function initialState(): HuffmanState {
  const nodes: Record<string, HNode> = Object.fromEntries(
    SYMBOLS.map(({ id, weight }) => [
      id,
      { id, label: id, weight, left: null, right: null, parent: null },
    ]),
  );
  return {
    nodes,
    roots: SYMBOLS.map((symbol) => symbol.id),
    selected: null,
    cost: 0,
    merges: 0,
    next: 1,
    last: null,
  };
}

function bits(state: HuffmanState): string {
  return (state.cost / 100).toFixed(2);
}

function rootOf(state: HuffmanState, id: string): string {
  let current = id;
  for (;;) {
    const node = state.nodes[current];
    if (!node || node.parent == null) return current;
    current = node.parent;
  }
}

function isRoot(state: HuffmanState, id: string): boolean {
  const node = state.nodes[id];
  return node != null && node.parent == null;
}

function weightOf(state: HuffmanState, id: string): number {
  return state.nodes[id]?.weight ?? 0;
}

function labelOf(state: HuffmanState, id: string): string {
  return state.nodes[id]?.label ?? id;
}

function statusOf(state: HuffmanState): "playing" | "won" | "lost" {
  if (state.roots.length > 1) return "playing";
  return state.cost === TARGET ? "won" : "lost";
}

function layout(state: HuffmanState): { pos: Record<string, [number, number]>; height: number } {
  const pos: Record<string, [number, number]> = {};
  const leafCounts: Record<string, number> = {};

  function countLeaves(id: string): number {
    const node = state.nodes[id];
    if (!node || node.left == null || node.right == null) return 1;
    const count = countLeaves(node.left) + countLeaves(node.right);
    leafCounts[id] = count;
    return count;
  }

  const counts = state.roots.map((root) => Math.max(1, countLeaves(root)));
  const slotWidths = counts.map((count) => count * 92);
  const gap = 12;
  const total =
    slotWidths.reduce((sum, width) => sum + width, 0) +
    gap * Math.max(0, state.roots.length - 1);
  const scale = total > 612 ? 612 / total : 1;
  let cursor = (640 - total * scale) / 2;
  let maxDepth = 0;

  function place(id: string, left: number, width: number, depth: number): number {
    const node = state.nodes[id];
    maxDepth = Math.max(maxDepth, depth);
    const y = 62 + depth * 76;
    let x: number;

    if (!node || node.left == null || node.right == null) {
      x = left + width / 2;
    } else {
      const leftLeaves = Math.max(1, leafCounts[node.left] ?? 1);
      const rightLeaves = Math.max(1, leafCounts[node.right] ?? 1);
      const split = leftLeaves / (leftLeaves + rightLeaves);
      const leftX = place(node.left, left, width * split, depth + 1);
      const rightX = place(node.right, left + width * split, width * (1 - split), depth + 1);
      x = (leftX + rightX) / 2;
    }

    pos[id] = [x, y];
    return x;
  }

  state.roots.forEach((root, index) => {
    const width = slotWidths[index] * scale;
    place(root, cursor, width, 0);
    cursor += width + gap * scale;
  });

  return {
    pos,
    height: Math.max(240, 62 + maxDepth * 76 + 62),
  };
}

const level: LevelModule<HuffmanState> = {
  meta: huffmanCodingMeta,
  initial: initialState(),

  moves(state) {
    if (state.roots.length === 1) return [];

    if (state.selected === null) {
      return state.roots.map<Move>((id) => ({
        id: `select:${id}`,
        label:
          labelOf(state, id) === "+"
            ? `Select the ${weightOf(state, id)}-unit stem`
            : `Select ${labelOf(state, id)} (${weightOf(state, id)})`,
        placement: "board",
      }));
    }

    const selected = state.selected;
    return [
      ...state.roots
        .filter((id) => id !== selected)
        .map<Move>((id) => ({
          id: `graft:${selected}:${id}`,
          label: `Graft ${weightOf(state, selected)} with ${weightOf(state, id)} → ${weightOf(state, selected) + weightOf(state, id)}`,
          placement: "board",
        })),
      { id: "clear", label: "Clear selection", placement: "board" },
    ];
  },

  apply(state, moveId) {
    if (moveId === "clear") {
      return { state: { ...state, selected: null }, events: [] };
    }

    if (moveId.startsWith("select:")) {
      const id = moveId.slice("select:".length);
      if (!state.nodes[id]) {
        return { state, events: [], error: "Unknown root." };
      }
      if (!isRoot(state, id)) {
        const root = rootOf(state, id);
        return {
          state,
          events: [],
          error: `${id} is inside the ${weightOf(state, root)}-unit tree rooted at ${root}; only a root can be grafted.`,
        };
      }
      return { state: { ...state, selected: id }, events: [] };
    }

    const [kind, a, b] = moveId.split(":");
    if (kind !== "graft" || !a || !b) {
      return { state, events: [], error: "Unknown move." };
    }
    if (!isRoot(state, a) || !isRoot(state, b)) {
      return {
        state,
        events: [],
        error: "Both ends of a graft must be roots of the current forest.",
      };
    }
    if (a === b) {
      return { state, events: [], error: "A root cannot be grafted onto itself." };
    }
    if (state.selected !== a) {
      return {
        state,
        events: [],
        error: `Select ${a} first; a graft joins the selected root to another root.`,
      };
    }

    const weightA = weightOf(state, a);
    const weightB = weightOf(state, b);
    const sum = weightA + weightB;
    const newId = `n${state.next}`;
    const newNode: HNode = {
      id: newId,
      label: "+",
      weight: sum,
      left: a,
      right: b,
      parent: null,
    };

    const nodes: Record<string, HNode> = {
      ...state.nodes,
      [a]: { ...state.nodes[a], parent: newId },
      [b]: { ...state.nodes[b], parent: newId },
      [newId]: newNode,
    };

    const insertAt = Math.min(state.roots.indexOf(a), state.roots.indexOf(b));
    const roots = state.roots.filter((id) => id !== a && id !== b);
    roots.splice(Math.min(Math.max(0, insertAt), roots.length), 0, newId);

    const cost = state.cost + sum;
    const next: HuffmanState = {
      nodes,
      roots,
      selected: null,
      cost,
      merges: state.merges + 1,
      next: state.next + 1,
      last: newId,
    };

    const events: GameEvent[] = [
      {
        text: `Grafted ${weightA} and ${weightB} onto a ${sum}-unit stem. L = ${(cost / 100).toFixed(2)} bits/symbol.`,
        kind: "info",
      },
    ];

    if ((a === "A" || b === "A") && state.roots.length > 2) {
      events.push({
        text: `A is grafted with ${state.roots.length - 2} other root${state.roots.length - 2 === 1 ? "" : "s"} still standing; the optimal tree keeps the 40-gram symbol at depth 1 until the last stem.`,
        kind: "info",
      });
    }

    const weights = state.roots.map((id) => weightOf(state, id)).sort((x, y) => x - y);
    if (sum > weights[0] + weights[1]) {
      events.push({
        text: `The two lightest roots were ${weights[0]} and ${weights[1]}; this stem costs ${sum}.`,
        kind: "info",
      });
    }

    if (next.roots.length === 1) {
      if (cost === TARGET) {
        events.push({
          text: `One tree. L = 2.25 bits/symbol, the Huffman minimum; H = ${H} and H + 1 = 3.2037.`,
          kind: "good",
        });
      } else {
        events.push({
          text: `One tree. L = ${(cost / 100).toFixed(2)} bits/symbol, above the 2.25 minimum. At least one stem did not take the two lightest roots.`,
          kind: "bad",
        });
      }
    }

    return { state: next, events };
  },

  view(state): TreeView {
    const { pos, height } = layout(state);
    const rootSet = new Set(state.roots);
    const won = statusOf(state) === "won";
    const lost = statusOf(state) === "lost";

    const nodes: TreeView["nodes"] = Object.values(state.nodes).map((node) => {
      const isRoot = rootSet.has(node.id);
      const selected = state.selected === node.id;
      const nodeState: NodeState = selected
        ? "target"
        : isRoot
          ? won
            ? "done"
            : lost
              ? "bad"
              : "active"
          : "done";

      let moveId: string | undefined;
      let aria = `Weight ${node.weight} inside the tree.`;

      if (isRoot && state.roots.length > 1) {
        if (selected) {
          moveId = "clear";
          aria = `Selected root of weight ${node.weight}. Clear the selection.`;
        } else if (state.selected === null) {
          moveId = `select:${node.id}`;
          aria = `Root of weight ${node.weight}. Select it for grafting.`;
        } else {
          moveId = `graft:${state.selected}:${node.id}`;
          aria = `Graft the selected ${weightOf(state, state.selected)}-unit root with this ${node.weight}-unit root onto a ${weightOf(state, state.selected) + node.weight}-unit stem.`;
        }
      }

      return {
        id: node.id,
        x: pos[node.id]?.[0] ?? 320,
        y: pos[node.id]?.[1] ?? 62,
        label: node.label,
        weight: node.weight,
        state: nodeState,
        moveId,
        aria,
      };
    });

    const edges: TreeView["edges"] = [];
    for (const node of Object.values(state.nodes)) {
      if (node.parent == null) continue;
      const edgeState: EdgeState = node.parent === state.last ? "active" : "done";
      edges.push({ from: node.parent, to: node.id, state: edgeState });
    }

    return {
      kind: "tree",
      height,
      caption: `Roots: ${state.roots.length} · L = ${bits(state)} bits/symbol · target 2.25 · H = ${H}`,
      nodes,
      edges,
    };
  },

  status: statusOf,

  score(state) {
    if (statusOf(state) !== "won") {
      return {
        stars: 1,
        detail: `L = ${bits(state)} bits/symbol; the minimum is 2.25 with H = ${H}.`,
      };
    }
    return {
      stars: 3,
      detail: `L = 2.25 bits/symbol, the Huffman minimum; H = ${H}.`,
    };
  },

  solution: [
    "select:E",
    "graft:E:F",
    "select:D",
    "graft:D:n1",
    "select:C",
    "graft:C:n2",
    "select:B",
    "graft:B:n3",
    "select:A",
    "graft:A:n4",
  ],
};

export default level;
