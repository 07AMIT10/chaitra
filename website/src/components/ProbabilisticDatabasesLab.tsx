import { useMemo, useState } from "react";
import {
  formatConfidence,
  formatWorldsCount,
  possibleWorldsCount,
  probIndependentOr,
} from "../lib/prob-db-math";
import {
  deterministicCompare,
  evaluateQuery,
  KITCHEN_EXISTS_PRESET,
  QUERIES,
  SENSORS_TABLE,
  THRESHOLD_MISTAKE_PRESET,
  rowMatchProbability,
  USERS_AGE_PRESET,
  USERS_TABLE,
  type QuerySpec,
  type UncertainTuple,
} from "../lib/prob-db-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./ProbabilisticDatabasesLab.css";

type TableId = "sensors" | "users";

function tableFor(id: TableId): UncertainTuple[] {
  return id === "sensors" ? SENSORS_TABLE : USERS_TABLE;
}

function formatAttrs(t: UncertainTuple): string {
  if (t.attrs.location !== undefined) {
    return `${t.attrs.location}, temp_high=${String(t.attrs.tempHigh)}`;
  }
  const ageP =
    typeof t.attrs.ageGt30 === "number"
      ? `P(age>30)=${formatConfidence(t.attrs.ageGt30)}`
      : "";
  return `${t.attrs.name}${ageP ? ` · ${ageP}` : ""}`;
}

function orFormula(confs: number[]): string {
  if (confs.length === 0) return "no matching tuples";
  if (confs.length === 1) return `P = ${formatConfidence(confs[0])}`;
  const failProd = confs.map((p) => (1 - p).toFixed(2)).join(" × ");
  return `1 − (${failProd}) = ${formatConfidence(probIndependentOr(confs))}`;
}

export default function ProbabilisticDatabasesLab() {
  const [tableId, setTableId] = useState<TableId>("sensors");
  const [queryIdx, setQueryIdx] = useState(0);
  const [thresholdPct, setThresholdPct] = useState(70);

  const table = tableFor(tableId);
  const queries = QUERIES[tableId];
  const query: QuerySpec = queries[queryIdx] ?? queries[0];
  const threshold = thresholdPct / 100;

  const result = useMemo(
    () => evaluateQuery(table, query, threshold),
    [table, query, threshold]
  );
  const ground = useMemo(
    () => deterministicCompare(table, query, threshold),
    [table, query, threshold]
  );

  const worlds = possibleWorldsCount(table.length);
  const isExistsKitchen =
    tableId === "sensors" && query.kind === "exists" && query.label.includes("Kitchen");
  const kitchenConfs = SENSORS_TABLE.filter(
    (t) => t.attrs.location === "Kitchen" && t.attrs.tempHigh === true
  ).map((t) => t.confidence);
  const kitchenExpected = probIndependentOr(kitchenConfs);

  const applyKitchenExists = () => {
    setTableId(KITCHEN_EXISTS_PRESET.table);
    setQueryIdx(KITCHEN_EXISTS_PRESET.queryIdx);
    setThresholdPct(KITCHEN_EXISTS_PRESET.thresholdPct);
  };

  const applyThresholdMistake = () => {
    setTableId(THRESHOLD_MISTAKE_PRESET.table);
    setQueryIdx(THRESHOLD_MISTAKE_PRESET.queryIdx);
    setThresholdPct(THRESHOLD_MISTAKE_PRESET.thresholdPct);
  };

  const applyUsersAge = () => {
    setTableId(USERS_AGE_PRESET.table);
    setQueryIdx(USERS_AGE_PRESET.queryIdx);
    setThresholdPct(USERS_AGE_PRESET.thresholdPct);
  };

  const metrics: LabMetric[] = [
    { id: "table", label: "Relation", value: tableId === "sensors" ? "Sensors" : "Users" },
    { id: "rows", label: "Uncertain tuples", value: String(table.length) },
    {
      id: "worlds",
      label: "Possible worlds (2^n)",
      value: formatWorldsCount(worlds),
      tone: table.length >= 4 ? "warn" : "default",
    },
  ];

  if (query.kind === "exists") {
    metrics.push({
      id: "answer",
      label: "P(query true)",
      value: formatConfidence(result.answerProbability),
      tone: result.answerProbability >= 0.9 ? "aha" : "default",
    });
  } else if (query.kind === "select-threshold") {
    metrics.push({
      id: "pass",
      label: `Tuples with conf ≥ ${thresholdPct}%`,
      value: String(result.passingThreshold.length),
    });
  } else {
    metrics.push({
      id: "match",
      label: "Matching rows (probabilistic)",
      value: String(result.matchingTuples.length),
    });
  }

  if (isExistsKitchen && result.answerProbability >= 0.95) {
    metrics.push({
      id: "aha",
      label: "Aha — OR not MAX",
      value: `Independent EXISTS ≈ ${formatConfidence(kitchenExpected)} even though no single sensor is 98% sure.`,
      tone: "aha",
    });
  } else if (
    query.kind === "select-threshold" &&
    result.passingThreshold.length === 0 &&
    table.some((t) => t.confidence >= 0.8)
  ) {
    metrics.push({
      id: "aha2",
      label: "Aha — threshold too high",
      value: "A deterministic pick of “best” rows hid uncertain tuples the probabilistic engine still weights.",
      tone: "aha",
    });
  }

  const probLeft =
    query.kind === "exists"
      ? `Probabilistic: ${formatConfidence(result.answerProbability)} (${orFormula(result.rowProbabilities.map((r) => r.p))})`
      : query.kind === "select-threshold"
        ? `${result.passingThreshold.length} rows at conf ≥ ${thresholdPct}%`
        : `${result.matchingTuples.length} rows · OR match ${formatConfidence(result.answerProbability)}`;

  const detLeft =
    query.kind === "exists"
      ? `Deterministic (conf ≥ 50%): ${ground.booleanAnswer ? "TRUE" : "FALSE"} · ${ground.rows.length} rows kept`
      : `${ground.rows.length} rows (hard cutoff at 50% existence)`;

  return (
    <LabShell
      intro={
        <>
          <strong>Probabilistic databases</strong> store tuples with <strong>confidence scores</strong>.
          Safe queries push <strong>AND = product</strong> and <strong>OR = 1 − Π(1 − p)</strong> into the
          plan instead of enumerating 2<sup>n</sup> possible worlds. The table below is one uncertain
          relation; the SQL box is the active query.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <div className="lab__row" role="group" aria-label="Uncertain relation">
              <button
                type="button"
                className={`lab__btn ${tableId === "sensors" ? "" : "lab__btn--ghost"}`}
                aria-pressed={tableId === "sensors"}
                onClick={() => {
                  setTableId("sensors");
                  setQueryIdx(0);
                }}
              >
                Sensors
              </button>
              <button
                type="button"
                className={`lab__btn ${tableId === "users" ? "" : "lab__btn--ghost"}`}
                aria-pressed={tableId === "users"}
                onClick={() => {
                  setTableId("users");
                  setQueryIdx(0);
                }}
              >
                Users
              </button>
            </div>

            <div className="lab__control">
              <span id="prob-db-query-label">Query</span>
              <div className="lab__row" role="group" aria-labelledby="prob-db-query-label">
                {queries.map((q, i) => (
                  <button
                    key={q.label}
                    type="button"
                    className={`lab__btn ${queryIdx === i ? "" : "lab__btn--ghost"}`}
                    aria-pressed={queryIdx === i}
                    onClick={() => setQueryIdx(i)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {(query.kind === "select-threshold" ||
              (query.kind === "select-where" && tableId === "sensors")) && (
              <RangeControl
                id="prob-db-threshold"
                label={
                  query.kind === "select-threshold"
                    ? "Confidence threshold τ"
                    : "Result confidence floor"
                }
                min={20}
                max={95}
                value={thresholdPct}
                valueText={`${thresholdPct}%`}
                onChange={setThresholdPct}
              />
            )}

            <ScenarioPresets
              aria-label="Probabilistic database presets"
              presets={[
                { id: "kitchen", label: "Kitchen EXISTS", onSelect: applyKitchenExists },
                { id: "mistake", label: "Threshold mistake", onSelect: applyThresholdMistake },
                { id: "users", label: "Users age > 30", onSelect: applyUsersAge },
              ]}
            />
          </div>

          <pre className="prob-db-lab__sql" aria-label="Active SQL query">
            {query.sql.replace("τ", `${thresholdPct}%`)}
          </pre>

          {query.kind === "exists" && (
            <p className="prob-db-lab__answer" role="status">
              Answer: <strong>{formatConfidence(result.answerProbability)}</strong> confidence
            </p>
          )}

          {query.kind === "exists" && result.rowProbabilities.length > 0 && (
            <p className="prob-db-lab__formula">
              Extensional OR (independent tuples): {orFormula(result.rowProbabilities.map((r) => r.p))}
            </p>
          )}

          <div className="prob-db-lab__table-wrap">
            <table
              className="prob-db-lab__table"
              aria-label="Uncertain tuples with confidence and match probability for the active query"
            >
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Attributes</th>
                  <th scope="col">Existence conf.</th>
                  <th scope="col">P(match query)</th>
                </tr>
              </thead>
              <tbody>
                {table.map((t) => {
                  const pMatch = rowMatchProbability(t, query);
                  const matches = query.matches(t);
                  const passes =
                    query.kind === "select-threshold"
                      ? t.confidence >= threshold
                      : matches && pMatch >= threshold;
                  return (
                    <tr
                      key={t.id}
                      className={
                        passes
                          ? "prob-db-lab__row--pass"
                          : matches
                            ? "prob-db-lab__row--match"
                            : undefined
                      }
                    >
                      <td>{t.id}</td>
                      <td>{formatAttrs(t)}</td>
                      <td>
                        <span
                          className="prob-db-lab__conf-bar"
                          style={{ width: `${t.confidence * 48}px` }}
                          aria-hidden
                        />
                        {formatConfidence(t.confidence)}
                      </td>
                      <td>
                        {matches || query.kind === "select-threshold" ? (
                          <>
                            <span
                              className="prob-db-lab__conf-bar"
                              style={{ width: `${pMatch * 48}px` }}
                              aria-hidden
                            />
                            {formatConfidence(pMatch)}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${tableId}-${queryIdx}-${thresholdPct}`}
        prompt={
          isExistsKitchen ? (
            <>
              Two independent kitchen sensors report <strong>temp_high</strong> at{" "}
              <strong>90%</strong> and <strong>80%</strong> confidence. Without opening the formula,
              is <strong>P(high temp in Kitchen)</strong> above <strong>95%</strong>?
            </>
          ) : (
            <>
              With <strong>{table.length}</strong> uncertain tuples and query{" "}
              <strong>{query.label}</strong>, will the <strong>probabilistic</strong> answer disagree
              with a deterministic database that only keeps rows with existence confidence ≥
              <strong> 50%</strong>?
            </>
          )
        }
        storageKey="probabilistic-databases"
        options={
          isExistsKitchen ? [
            { id: "yes", label: "Yes — P(high temp) > 95% due to extensional OR", isCorrect: kitchenExpected > 0.95 },
            { id: "no", label: "No — P(high temp) is ≤ 95% (e.g. capped at max)", isCorrect: kitchenExpected <= 0.95 },
          ] : [
            { id: "disagree", label: "Yes — they disagree on the result", isCorrect: ground.rows.length !== result.passingThreshold.length },
            { id: "agree", label: "No — they agree on which rows to include", isCorrect: ground.rows.length === result.passingThreshold.length },
          ]
        }
        revealLabel="Reveal probabilistic vs deterministic"
      >
        <ComparePanel
          leftLabel="Probabilistic DB"
          rightLabel="Deterministic (conf ≥ 50%)"
          left={probLeft}
          right={detLeft}
        />
        <p className="lab__status" role="note">
          {isExistsKitchen
            ? `Kitchen EXISTS ≈ ${formatConfidence(kitchenExpected)} — both sensors can be wrong independently, but it is unlikely both miss.`
            : ground.rows.length !== result.passingThreshold.length
              ? "Hard thresholds collapse uncertainty into yes/no rows; probabilistic answers keep graded confidence on the result."
              : "On this preset the answers align — try Threshold mistake or Users age > 30 to see divergence."}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {table.length} tuples · {formatWorldsCount(worlds)} possible worlds ·{" "}
        {query.kind === "exists"
          ? `P(true) = ${formatConfidence(result.answerProbability)}`
          : `${result.passingThreshold.length} rows pass τ = ${thresholdPct}%`}
        . Reveal above for ground-truth comparison.
      </p>
    </LabShell>
  );
}
