/**
 * Grid SCAMPER operations over a `TableModel` (`kind: "table"`, strings
 * `a` x `b`). Every operation clones the scenario, performs a concrete
 * deterministic edit on the clone, and returns a proposal stub for
 * `proposeMutation` to validate, hash, and diff. Length caps are enforced by
 * the grid runner's validator during proposal validation.
 */
import type { ScamperId, Scenario, ScenarioParam } from "../types";
import { GRID_STRATEGIES, type GridStrategy } from "../types";
import { cloneScenario } from "../scenario";
import { validateScenario } from "../runners";
import type { SubstrateProposal } from "../mutations";

type GridScenario = Extract<Scenario, { substrate: "grid" }>;

export const GRID_FRAMINGS = [
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

export function proposeGridMutation(
  scenario: Scenario,
  card: ScamperId,
  payload: Record<string, ScenarioParam>,
): SubstrateProposal {
  const base = scenario as GridScenario;
  const model = base.model;

  switch (card) {
    case "substitute": {
      const requested = payload.strategy;
      if (requested !== undefined) {
        if (typeof requested !== "string" || !(GRID_STRATEGIES as readonly string[]).includes(requested)) {
          return reject(
            "mutation/strategy",
            "payload.strategy",
            `Strategy "${String(requested)}" is not one of ${GRID_STRATEGIES.join(", ")}.`,
          );
        }
        const candidate = cloneScenario(base);
        candidate.strategy = requested as GridStrategy;
        return accept({
          op: "strategy",
          label: `Swap the ${base.strategy} recurrence for ${candidate.strategy} over the same strings.`,
          diffSummary: `Strategy ${base.strategy} → ${candidate.strategy}; the strings are untouched.`,
          payload: { strategy: candidate.strategy },
          candidate,
        });
      }
      const order = GRID_STRATEGIES;
      const index = order.indexOf(base.strategy);
      for (let step = 1; step <= order.length; step += 1) {
        const next = order[(index + step) % order.length] as GridStrategy;
        const candidate = cloneScenario(base);
        candidate.strategy = next;
        if (validateScenario(candidate).length === 0) {
          return accept({
            op: "strategy",
            label: `Swap the ${base.strategy} recurrence for ${next} over the same strings.`,
            diffSummary: `Strategy ${base.strategy} → ${next}; the strings are untouched.`,
            payload: { strategy: next },
            candidate,
          });
        }
      }
      return reject(
        "mutation/strategy",
        "strategy",
        "No grid strategy can run on this scenario as it stands.",
      );
    }

    case "combine": {
      if (model.b.length === 0) {
        return reject(
          "mutation/combine",
          "model.b",
          'The column string "b" is empty; there is no first character to fuse onto "a".',
        );
      }
      const fused = model.b.charAt(0) + model.a;
      const candidate = cloneScenario(base);
      candidate.model.a = fused;
      return accept({
        op: "fuse-char",
        label: `Fuse the first character of "b" onto "a": "${model.a}" → "${fused}".`,
        diffSummary: `Prepended "${model.b.charAt(0)}" to "a"; the table becomes ${
          fused.length + 1
        } rows by ${model.b.length + 1} columns.`,
        payload: {},
        candidate,
      });
    }

    case "adapt": {
      const grownA = `x${model.a}`;
      const grownB = `x${model.b}`;
      const candidate = cloneScenario(base);
      candidate.model.a = grownA;
      candidate.model.b = grownB;
      return accept({
        op: "prepend-x",
        label: `Prepend "x" to both strings: "${model.a}" → "${grownA}", "${model.b}" → "${grownB}".`,
        diffSummary: `"a" and "b" each gain one character: a ${grownA.length + 1} x ${
          grownB.length + 1
        } table.`,
        payload: {},
        candidate,
      });
    }

    case "modify": {
      if (model.a.length === 0 || model.b.length === 0) {
        return reject(
          "mutation/modify",
          model.a.length === 0 ? "model.a" : "model.b",
          `Halving needs a non-empty string; "${model.a.length === 0 ? "a" : "b"}" is empty.`,
        );
      }
      const halve = (text: string): string =>
        text.slice(0, Math.max(1, Math.floor(text.length / 2)));
      const shortA = halve(model.a);
      const shortB = halve(model.b);
      const candidate = cloneScenario(base);
      candidate.model.a = shortA;
      candidate.model.b = shortB;
      return accept({
        op: "halve-strings",
        label: `Halve both strings: "${model.a}" → "${shortA}", "${model.b}" → "${shortB}".`,
        diffSummary: `Halved "a" (${model.a.length} → ${shortA.length}) and "b" (${model.b.length} → ${shortB.length}).`,
        payload: {},
        candidate,
      });
    }

    case "put-to-another-use": {
      const framing = payload.framing !== undefined ? payload.framing : "texts";
      if (typeof framing !== "string" || !(GRID_FRAMINGS as readonly string[]).includes(framing)) {
        return reject(
          "mutation/framing",
          "payload.framing",
          `Framing "${String(framing)}" is not one of ${GRID_FRAMINGS.join(", ")}.`,
        );
      }
      const candidate = cloneScenario(base);
      candidate.params = { ...candidate.params, framing };
      return accept({
        op: "reframe",
        label: `Read the same text under the "${framing}" question.`,
        diffSummary: `The question changed, not the data: params.framing is now "${framing}".`,
        payload: { framing },
        candidate,
      });
    }

    case "eliminate": {
      if (model.a.length === 0 && model.b.length === 0) {
        return reject(
          "mutation/eliminate",
          "model",
          'Both strings are empty; there is no last character left to remove.',
        );
      }
      const candidate = cloneScenario(base);
      candidate.model.a = model.a.slice(0, -1);
      candidate.model.b = model.b.slice(0, -1);
      return accept({
        op: "trim-strings",
        label: `Trim the last character of each string: "${model.a}" → "${candidate.model.a}", "${model.b}" → "${candidate.model.b}".`,
        diffSummary: 'Trimmed "a" and "b" by one character each (where non-empty).',
        payload: {},
        candidate,
      });
    }

    case "reverse": {
      const candidate = cloneScenario(base);
      candidate.model.a = model.b;
      candidate.model.b = model.a;
      return accept({
        op: "swap-strings",
        label: 'Swap "a" and "b": rows become columns.',
        diffSummary: `Swapped "a"/"b"; the table turns from ${model.a.length + 1} x ${
          model.b.length + 1
        } to ${model.b.length + 1} x ${model.a.length + 1}.`,
        payload: {},
        candidate,
      });
    }

    default:
      return reject("mutation/card", "card", `The card "${String(card)}" has no grid operation.`);
  }
}
