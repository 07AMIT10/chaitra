import { arrayRunner } from "./array";
import { graphRunner } from "./graph";
import { gridRunner } from "./grid";
import { canonicalJson, hash32, scenarioHash } from "../hash";
import { isScenario } from "../scenario";
import type { Diagnostic, RunResult, Runner, Scenario } from "../types";

const RUNNERS: Runner[] = [graphRunner, arrayRunner, gridRunner];

export function runnerFor(scenario: Scenario): Runner {
  switch (scenario.substrate) {
    case "graph":
      return graphRunner;
    case "array":
      return arrayRunner;
    case "grid":
      return gridRunner;
  }
}

export function validateScenario(scenario: Scenario): Diagnostic[] {
  if (!isScenario(scenario)) {
    return [
      {
        code: "scenario/invalid",
        path: "$",
        message: "The scenario does not match the observatory contract.",
      },
    ];
  }
  return runnerFor(scenario).validate(scenario);
}

export function runScenario(scenario: Scenario): RunResult {
  if (!isScenario(scenario)) {
    return {
      frames: [],
      outcome: "invalid",
      diagnostics: [
        {
          code: "scenario/invalid",
          path: "$",
          message: "The scenario does not match the observatory contract.",
        },
      ],
      hash: hash32(canonicalJson(scenario)),
    };
  }
  return runnerFor(scenario).run(scenario);
}

export { arrayRunner, graphRunner, gridRunner };
export { RUNNERS };
export type { Diagnostic, RunResult, Runner, Scenario };

// Keep a stable scenario hash export for callers that only need the identity.
export { scenarioHash };
