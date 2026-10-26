/**
 * The SCAMPER mutation deck: seven concrete scenario operations proposed as
 * previewable, validated, diffed candidates. `proposeMutation` is pure — it
 * clones its input, never reads the clock, and either returns a candidate the
 * runner accepts plus a structural diff, or diagnostics with no candidate.
 */
import type {
  Diagnostic,
  Mutation,
  MutationDiff,
  MutationResult,
  ScamperId,
  Scenario,
  ScenarioParam,
} from "./types";
import { canonicalJson, hash32 } from "./hash";
import { cloneScenario } from "./scenario";
import { validateScenario } from "./runners";
import { proposeArrayMutation } from "./mutations/array";
import { proposeGraphMutation } from "./mutations/graph";
import { proposeGridMutation } from "./mutations/grid";

export type ScamperCard = { id: ScamperId; title: string; prompt: string; glyph: string };

export const SCAMPER_CARDS: readonly ScamperCard[] = [
  { id: "substitute", title: "Substitute", prompt: "Swap one part or rule.", glyph: "⇄" },
  { id: "combine", title: "Combine", prompt: "Fuse two parts.", glyph: "⊕" },
  { id: "adapt", title: "Adapt", prompt: "Borrow a mechanism.", glyph: "⌁" },
  { id: "modify", title: "Modify", prompt: "Scale one parameter.", glyph: "±" },
  {
    id: "put-to-another-use",
    title: "Put to Another Use",
    prompt: "Change the question.",
    glyph: "❖",
  },
  { id: "eliminate", title: "Eliminate", prompt: "Remove a part or rule.", glyph: "∅" },
  { id: "reverse", title: "Reverse", prompt: "Invert order or role.", glyph: "↺" },
];

export type SubstrateProposal =
  | {
      ok: true;
      op: string;
      label: string;
      diffSummary: string;
      payload: Record<string, ScenarioParam>;
      candidate: Scenario;
    }
  | { ok: false; diagnostics: Diagnostic[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type Changes = MutationDiff["changes"];

function collectChanges(path: string, before: unknown, after: unknown, out: Changes): void {
  if (before === after) return;
  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeItems = Array.isArray(before) ? before : [];
    const afterItems = Array.isArray(after) ? after : [];
    if (beforeItems.length !== afterItems.length) {
      out.push({
        path: `${path}.length`,
        before: String(beforeItems.length),
        after: String(afterItems.length),
      });
    }
    const count = Math.max(beforeItems.length, afterItems.length);
    for (let index = 0; index < count; index += 1) {
      collectChanges(`${path}[${index}]`, beforeItems[index], afterItems[index], out);
    }
    return;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) collectChanges(`${path}.${key}`, before[key], after[key], out);
    return;
  }
  out.push({
    path,
    before: before === undefined ? "(none)" : canonicalJson(before),
    after: after === undefined ? "(removed)" : canonicalJson(after),
  });
}

/** Structural diff between two scenarios; paths read like model fields. */
function diffScenario(before: Scenario, after: Scenario): Changes {
  const changes: Changes = [];
  const left = before as unknown as Record<string, unknown>;
  const right = after as unknown as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const key of keys) collectChanges(key, left[key], right[key], changes);
  return changes;
}

/**
 * Build a validated, deterministic proposal for one SCAMPER card. The input is
 * never mutated; rejections carry diagnostics and no candidate.
 */
export function proposeMutation(
  scenario: Scenario,
  card: ScamperId,
  payload?: Record<string, ScenarioParam>,
): MutationResult {
  const input = cloneScenario(scenario);
  const request = payload ?? {};
  let proposal: SubstrateProposal;

  switch (input.substrate) {
    case "graph":
      proposal = proposeGraphMutation(input, card, request);
      break;
    case "array":
      proposal = proposeArrayMutation(input, card, request);
      break;
    case "grid":
      proposal = proposeGridMutation(input, card, request);
      break;
    default:
      proposal = {
        ok: false,
        diagnostics: [
          {
            code: "scenario/invalid",
            path: "$",
            message: "The scenario has no recognisable substrate.",
          },
        ],
      };
  }

  if (!proposal.ok) return { ok: false, diagnostics: proposal.diagnostics };

  const diagnostics = validateScenario(proposal.candidate);
  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const mutation: Mutation = {
    id: `${card}:${hash32(canonicalJson(proposal.candidate))}`,
    card,
    op: proposal.op,
    label: proposal.label,
    payload: proposal.payload,
  };
  const diff: MutationDiff = {
    summary: proposal.diffSummary,
    changes: diffScenario(input, proposal.candidate),
  };
  return {
    ok: true,
    mutation,
    scenario: proposal.candidate,
    diff,
    summary: proposal.label,
  };
}
