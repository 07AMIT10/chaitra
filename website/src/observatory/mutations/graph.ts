/**
 * Graph SCAMPER operations. Every operation clones the scenario, performs a
 * concrete deterministic edit on the clone, and returns a proposal stub for
 * `proposeMutation` to validate, hash, and diff. The graph itself is never
 * mutated through the caller's reference.
 */
import type { GraphEdge, ScamperId, Scenario, ScenarioParam } from "../types";
import { GRAPH_STRATEGIES, type GraphStrategy } from "../types";
import { cloneScenario } from "../scenario";
import { validateScenario } from "../runners";
import type { SubstrateProposal } from "../mutations";

type GraphScenario = Extract<Scenario, { substrate: "graph" }>;

export const GRAPH_FRAMINGS = [
  "traffic",
  "supply",
  "scheduling",
  "shelf",
  "timeline",
  "signal",
  "texts",
  "genomes",
  "versions",
] as const;

type Accepted = {
  op: string;
  label: string;
  diffSummary: string;
  payload: Record<string, ScenarioParam>;
  candidate: Scenario;
};

const accept = (patch: Accepted): SubstrateProposal => ({ ok: true, ...patch });

const reject = (code: string, path: string, message: string): SubstrateProposal => ({
  ok: false,
  diagnostics: [{ code, path, message }],
});

const round2 = (value: number): number => Math.round(value * 100) / 100;

const labelOf = (nodes: GraphScenario["model"]["nodes"], id: string): string =>
  nodes.find((node) => node.id === id)?.label ?? id;

/** First edge id built from `base` that no existing edge in the model claims. */
function uniqueEdgeId(taken: Set<string>, base: string): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let index = 2;
  let candidate = `${base}:${index}`;
  while (taken.has(candidate)) {
    index += 1;
    candidate = `${base}:${index}`;
  }
  taken.add(candidate);
  return candidate;
}

export function proposeGraphMutation(
  scenario: Scenario,
  card: ScamperId,
  payload: Record<string, ScenarioParam>,
): SubstrateProposal {
  const base = scenario as GraphScenario;
  const model = base.model;

  switch (card) {
    case "substitute": {
      const requested = payload.strategy;
      if (requested !== undefined) {
        if (typeof requested !== "string" || !(GRAPH_STRATEGIES as readonly string[]).includes(requested)) {
          return reject(
            "mutation/strategy",
            "payload.strategy",
            `Strategy "${String(requested)}" is not one of ${GRAPH_STRATEGIES.join(", ")}.`,
          );
        }
        const candidate = cloneScenario(base);
        candidate.strategy = requested as GraphStrategy;
        return accept({
          op: "strategy",
          label: `Swap the ${base.strategy} walk for ${candidate.strategy} on the same roads.`,
          diffSummary: `Strategy ${base.strategy} → ${candidate.strategy}; the model is untouched.`,
          payload: { strategy: candidate.strategy },
          candidate,
        });
      }
      const order = GRAPH_STRATEGIES;
      const index = order.indexOf(base.strategy);
      for (let step = 1; step <= order.length; step += 1) {
        const next = order[(index + step) % order.length] as GraphStrategy;
        const candidate = cloneScenario(base);
        candidate.strategy = next;
        if (validateScenario(candidate).length === 0) {
          return accept({
            op: "strategy",
            label: `Swap the ${base.strategy} walk for ${next} on the same roads.`,
            diffSummary: `Strategy ${base.strategy} → ${next}; the model is untouched.`,
            payload: { strategy: next },
            candidate,
          });
        }
      }
      return reject(
        "mutation/strategy",
        "strategy",
        "No graph strategy can run on this scenario as it stands; edit the model first.",
      );
    }

    case "combine": {
      if (model.nodes.length < 2) {
        return reject(
          "mutation/combine",
          "model.nodes",
          "A merge needs two nodes; the graph holds one.",
        );
      }
      const fromParam = payload.from;
      const toParam = payload.to;
      for (const [key, value] of [
        ["payload.from", fromParam],
        ["payload.to", toParam],
      ] as const) {
        if (value !== undefined && typeof value !== "string") {
          return reject(
            "mutation/combine",
            key,
            `A merge endpoint must be a node id; received ${String(value)}.`,
          );
        }
      }
      const ids = model.nodes.map((node) => node.id);
      const known = new Set(ids);
      const from = (fromParam as string | undefined) ?? ids[0];
      const to = (toParam as string | undefined) ?? ids[1];
      if (!known.has(from)) {
        return reject("mutation/combine", "payload.from", `Node "${from}" does not exist in the graph.`);
      }
      if (!known.has(to)) {
        return reject("mutation/combine", "payload.to", `Node "${to}" does not exist in the graph.`);
      }
      if (from === to) {
        return reject("mutation/combine", "payload.to", "A merge needs two different nodes.");
      }
      const fromLabel = labelOf(model.nodes, from);
      const toLabel = labelOf(model.nodes, to);
      const touched = model.edges.filter((edge) => edge.from === to || edge.to === to).length;
      const candidate = cloneScenario(base);
      const merged = candidate.model;
      merged.nodes = merged.nodes.filter((node) => node.id !== to);
      const kept: GraphEdge[] = [];
      const seen = new Set<string>();
      let folded = 0;
      for (const edge of merged.edges) {
        const nextFrom = edge.from === to ? from : edge.from;
        const nextTo = edge.to === to ? from : edge.to;
        if (nextFrom === nextTo) {
          folded += 1;
          continue;
        }
        const key = merged.directed
          ? `${nextFrom}→${nextTo}`
          : nextFrom < nextTo
            ? `${nextFrom}↔${nextTo}`
            : `${nextTo}↔${nextFrom}`;
        if (seen.has(key)) {
          folded += 1;
          continue;
        }
        seen.add(key);
        kept.push({ id: edge.id, from: nextFrom, to: nextTo, weight: edge.weight });
      }
      merged.edges = kept;
      if (merged.start === to) merged.start = from;
      if (merged.target === to) merged.target = from;
      return accept({
        op: "merge-nodes",
        label: `Merge ${toLabel} into ${fromLabel} and reroute its edges.`,
        diffSummary: `Merged ${to} into ${from}: ${touched} edge(s) touched, ${folded} folded away, ${kept.length} remain.`,
        payload: { from, to },
        candidate,
      });
    }

    case "adapt": {
      if (model.nodes.length >= 30) {
        return reject(
          "mutation/cap",
          "model.nodes",
          `The graph already holds ${model.nodes.length} nodes; the observatory cap is 30.`,
        );
      }
      const candidate = cloneScenario(base);
      const adapted = candidate.model;
      const takenIds = new Set(adapted.nodes.map((node) => node.id));
      let hubId = "H";
      let index = 1;
      while (takenIds.has(hubId)) {
        index += 1;
        hubId = `H${index}`;
      }
      const startNode = adapted.nodes.find((node) => node.id === adapted.start) ?? adapted.nodes[0];
      const targetNode =
        adapted.target !== undefined
          ? adapted.nodes.find((node) => node.id === adapted.target) ?? startNode
          : startNode;
      const between =
        adapted.target !== undefined && adapted.target !== adapted.start ? adapted.target : null;
      const x = between !== null ? round2((startNode.x + targetNode.x) / 2) : round2(startNode.x) + 48;
      const y = between !== null ? round2((startNode.y + targetNode.y) / 2) : round2(startNode.y) + 24;
      adapted.nodes.push({ id: hubId, label: "Hub", x, y });

      const takenEdges = new Set(adapted.edges.map((edge) => edge.id));
      adapted.edges.push({
        id: uniqueEdgeId(takenEdges, `${adapted.start}→${hubId}`),
        from: adapted.start,
        to: hubId,
        weight: 1,
      });
      let links = 1;
      if (between !== null) {
        adapted.edges.push({
          id: uniqueEdgeId(takenEdges, `${hubId}→${between}`),
          from: hubId,
          to: between,
          weight: 1,
        });
        links = 2;
      }
      return accept({
        op: "add-hub",
        label:
          between !== null
            ? `Adapt the map: add hub ${hubId} of weight 1 between start and target.`
            : `Adapt the map: add hub ${hubId} of weight 1 off start.`,
        diffSummary: `Added hub ${hubId} at (${x}, ${y}) with ${links} weight-1 link(s).`,
        payload: {},
        candidate,
      });
    }

    case "modify": {
      const factor = payload.factor !== undefined ? payload.factor : 2;
      if (typeof factor !== "number" || !Number.isFinite(factor) || factor <= 0) {
        return reject(
          "mutation/factor",
          "payload.factor",
          `The factor must be a positive finite number; received ${String(factor)}.`,
        );
      }
      const candidate = cloneScenario(base);
      for (const edge of candidate.model.edges) edge.weight *= factor;
      return accept({
        op: "scale-weights",
        label: `Scale every edge weight by ${factor}.`,
        diffSummary: `Scaled ${candidate.model.edges.length} edge weight(s) by ${factor}.`,
        payload: { factor },
        candidate,
      });
    }

    case "put-to-another-use": {
      const framing = payload.framing !== undefined ? payload.framing : "traffic";
      if (typeof framing !== "string" || !(GRAPH_FRAMINGS as readonly string[]).includes(framing)) {
        return reject(
          "mutation/framing",
          "payload.framing",
          `Framing "${String(framing)}" is not one of ${GRAPH_FRAMINGS.join(", ")}.`,
        );
      }
      const candidate = cloneScenario(base);
      candidate.params = { ...candidate.params, framing };
      return accept({
        op: "reframe",
        label: `Read the same roads under the "${framing}" question.`,
        diffSummary: `The question changed, not the data: params.framing is now "${framing}".`,
        payload: { framing },
        candidate,
      });
    }

    case "eliminate": {
      const request = payload.entity;
      if (request !== undefined && typeof request !== "string") {
        return reject(
          "mutation/eliminate",
          "payload.entity",
          `The entity to eliminate must be a node or edge id; received ${String(request)}.`,
        );
      }
      const nonStart = model.nodes.filter((node) => node.id !== model.start);
      const entity =
        typeof request === "string"
          ? request
          : nonStart.length > 0
            ? nonStart[nonStart.length - 1].id
            : undefined;
      if (entity === undefined) {
        return reject(
          "mutation/eliminate",
          "model.nodes",
          "Every node but the start is gone; eliminating it would leave no nodes.",
        );
      }
      const nodeIndex = model.nodes.findIndex((node) => node.id === entity);
      if (nodeIndex >= 0) {
        if (model.nodes.length - 1 < 1) {
          return reject(
            "mutation/eliminate",
            "model.nodes",
            "Eliminating the last node would leave an empty graph.",
          );
        }
        const candidate = cloneScenario(base);
        const trimmed = candidate.model;
        const incident = trimmed.edges.filter(
          (edge) => edge.from === entity || edge.to === entity,
        ).length;
        trimmed.nodes = trimmed.nodes.filter((node) => node.id !== entity);
        trimmed.edges = trimmed.edges.filter(
          (edge) => edge.from !== entity && edge.to !== entity,
        );
        if (trimmed.start === entity) trimmed.start = trimmed.nodes[0].id;
        if (trimmed.target === entity) delete trimmed.target;
        return accept({
          op: "remove-node",
          label: `Eliminate node ${labelOf(model.nodes, entity)} and its ${incident} incident edge(s).`,
          diffSummary: `Removed node ${entity} and ${incident} incident edge(s); start and target were updated when needed.`,
          payload: { entity },
          candidate,
        });
      }
      const edgeIndex = model.edges.findIndex((edge) => edge.id === entity);
      if (edgeIndex < 0) {
        return reject(
          "mutation/eliminate",
          "payload.entity",
          `No node or edge is named "${entity}".`,
        );
      }
      const edge = model.edges[edgeIndex];
      const candidate = cloneScenario(base);
      candidate.model.edges = candidate.model.edges.filter((item) => item.id !== entity);
      return accept({
        op: "remove-edge",
        label: `Eliminate the edge ${edge.from}→${edge.to}.`,
        diffSummary: `Removed edge ${edge.id} (${edge.from} → ${edge.to}); the nodes stay.`,
        payload: { entity },
        candidate,
      });
    }

    case "reverse": {
      const candidate = cloneScenario(base);
      const flipped = candidate.model;
      if (flipped.directed) {
        for (const edge of flipped.edges) {
          const from = edge.from;
          edge.from = edge.to;
          edge.to = from;
        }
      }
      const oldStart = base.model.start;
      const oldTarget = base.model.target;
      if (typeof oldTarget === "string" && oldTarget !== oldStart) {
        flipped.start = oldTarget;
        flipped.target = oldStart;
        return accept({
          op: "reverse-edges",
          label: flipped.directed
            ? "Reverse every road; start and target trade places."
            : "Swap start and target on the undirected roads.",
          diffSummary: flipped.directed
            ? `Reversed ${flipped.edges.length} edge(s); start ${oldStart} ↔ target ${oldTarget}.`
            : `Start ${oldStart} ↔ target ${oldTarget}; the edges stay.`,
          payload: {},
          candidate,
        });
      }
      flipped.target = oldStart;
      return accept({
        op: "reverse-edges",
        label: `Reverse the journey; ${oldStart} becomes the target.`,
        diffSummary:
          flipped.directed
            ? `Reversed ${flipped.edges.length} edge(s); the old start ${oldStart} is the target.`
            : `The old start ${oldStart} is the target; the edges stay.`,
        payload: {},
        candidate,
      });
    }

    default:
      return reject(
        "mutation/card",
        "card",
        `The card "${String(card)}" has no graph operation.`,
      );
  }
}
