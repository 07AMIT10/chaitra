/**
 * Array SCAMPER operations. Every operation clones the scenario, performs a
 * concrete deterministic edit on the clone, and returns a proposal stub for
 * `proposeMutation` to validate, hash, and diff. The `sorted` flag is
 * recomputed honestly after every edit instead of being trusted.
 */
import type { ScamperId, Scenario, ScenarioParam } from "../types";
import { ARRAY_STRATEGIES, type ArrayStrategy } from "../types";
import { cloneScenario } from "../scenario";
import { validateScenario } from "../runners";
import type { SubstrateProposal } from "../mutations";

type ArrayScenario = Extract<Scenario, { substrate: "array" }>;

const MAX_VALUES = 32;

export const ARRAY_FRAMINGS = [
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

const ascending = (values: readonly number[]): boolean => {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] > values[index]) return false;
  }
  return true;
};

export function proposeArrayMutation(
  scenario: Scenario,
  card: ScamperId,
  payload: Record<string, ScenarioParam>,
): SubstrateProposal {
  const base = scenario as ArrayScenario;
  const model = base.model;

  switch (card) {
    case "substitute": {
      const requested = payload.strategy;
      if (requested !== undefined) {
        if (
          typeof requested !== "string" ||
          !(ARRAY_STRATEGIES as readonly string[]).includes(requested)
        ) {
          return reject(
            "mutation/strategy",
            "payload.strategy",
            `Strategy "${String(requested)}" is not one of ${ARRAY_STRATEGIES.join(", ")}.`,
          );
        }
        const candidate = cloneScenario(base);
        candidate.strategy = requested as ArrayStrategy;
        return accept({
          op: "strategy",
          label: `Swap the ${base.strategy} rule for ${candidate.strategy} on the same values.`,
          diffSummary: `Strategy ${base.strategy} → ${candidate.strategy}; the values are untouched.`,
          payload: { strategy: candidate.strategy },
          candidate,
        });
      }
      const order = ARRAY_STRATEGIES;
      const index = order.indexOf(base.strategy);
      for (let step = 1; step <= order.length; step += 1) {
        const next = order[(index + step) % order.length] as ArrayStrategy;
        const candidate = cloneScenario(base);
        candidate.strategy = next;
        if (validateScenario(candidate).length === 0) {
          return accept({
            op: "strategy",
            label: `Swap the ${base.strategy} rule for ${next} on the same values.`,
            diffSummary: `Strategy ${base.strategy} → ${next}; the values are untouched.`,
            payload: { strategy: next },
            candidate,
          });
        }
      }
      return reject(
        "mutation/strategy",
        "strategy",
        "No array strategy can run on this scenario as it stands; sort the values or add a target first.",
      );
    }

    case "combine": {
      const beforeCount = model.values.length;
      const after = model.values.concat(model.values.slice().reverse());
      if (after.length > MAX_VALUES) {
        return reject(
          "mutation/cap",
          "model.values",
          `Appending a reversed copy would make ${after.length} values; the observatory cap is ${MAX_VALUES}.`,
        );
      }
      const candidate = cloneScenario(base);
      candidate.model.values = after;
      candidate.model.sorted = ascending(after);
      return accept({
        op: "append-reversed",
        label: `Append a reversed copy of the values (${beforeCount} → ${after.length}).`,
        diffSummary: `Doubled the row: ${beforeCount} → ${after.length} values; sorted ${model.sorted} → ${candidate.model.sorted}.`,
        payload: {},
        candidate,
      });
    }

    case "adapt": {
      if (model.values.length >= MAX_VALUES) {
        return reject(
          "mutation/cap",
          "model.values",
          `The array already holds ${model.values.length} values; the observatory cap is ${MAX_VALUES}.`,
        );
      }
      const beforeCount = model.values.length;
      const sentinel = Math.max(...model.values) + 1;
      const candidate = cloneScenario(base);
      candidate.model.values = model.values.concat(sentinel);
      candidate.model.sorted = ascending(candidate.model.values);
      return accept({
        op: "append-sentinel",
        label: `Append the sentinel ${sentinel} (max + 1) at the end.`,
        diffSummary: `${beforeCount} → ${candidate.model.values.length} value(s); sentinel max+1 ${sentinel}; sorted ${model.sorted} → ${candidate.model.sorted}.`,
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
      candidate.model.values = model.values.map((value) => value * factor);
      if (candidate.model.target !== undefined) candidate.model.target *= factor;
      const hasTarget = model.target !== undefined;
      return accept({
        op: "scale-values",
        label: hasTarget
          ? `Scale every value and the target by ${factor}.`
          : `Scale every value by ${factor}.`,
        diffSummary: hasTarget
          ? `Scaled ${model.values.length} value(s) and the target by ${factor}.`
          : `Scaled ${model.values.length} value(s) by ${factor}.`,
        payload: { factor },
        candidate,
      });
    }

    case "put-to-another-use": {
      const framing = payload.framing !== undefined ? payload.framing : "shelf";
      if (typeof framing !== "string" || !(ARRAY_FRAMINGS as readonly string[]).includes(framing)) {
        return reject(
          "mutation/framing",
          "payload.framing",
          `Framing "${String(framing)}" is not one of ${ARRAY_FRAMINGS.join(", ")}.`,
        );
      }
      const candidate = cloneScenario(base);
      candidate.params = { ...candidate.params, framing };
      return accept({
        op: "reframe",
        label: `Read the same shelf under the "${framing}" question.`,
        diffSummary: `The question changed, not the data: params.framing is now "${framing}".`,
        payload: { framing },
        candidate,
      });
    }

    case "eliminate": {
      if (model.values.length <= 1) {
        return reject(
          "mutation/eliminate",
          "model.values",
          "The array holds a single value; removing it would leave nothing.",
        );
      }
      const beforeCount = model.values.length;
      const candidate = cloneScenario(base);
      candidate.model.values = model.values.slice(0, -1);
      candidate.model.sorted = ascending(candidate.model.values);
      return accept({
        op: "remove-last",
        label: `Scrape off the last value (${beforeCount} → ${candidate.model.values.length}).`,
        diffSummary: `${beforeCount} → ${candidate.model.values.length} value(s); sorted ${model.sorted} → ${candidate.model.sorted}.`,
        payload: {},
        candidate,
      });
    }

    case "reverse": {
      const candidate = cloneScenario(base);
      candidate.model.values = model.values.slice().reverse();
      candidate.model.sorted = ascending(candidate.model.values);
      return accept({
        op: "reverse-values",
        label: "Read the shelf from the other end: reverse the value order.",
        diffSummary: `Reversed ${model.values.length} value(s); sorted ${model.sorted} → ${candidate.model.sorted}.`,
        payload: {},
        candidate,
      });
    }

    default:
      return reject("mutation/card", "card", `The card "${String(card)}" has no array operation.`);
  }
}
