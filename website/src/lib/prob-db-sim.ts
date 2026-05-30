import {
  probIndependentAnd,
  probIndependentOr,
  tuplePassesThreshold,
} from "./prob-db-math";

/** Existence-level uncertain row (attributes known, row may not exist). */
export type UncertainTuple = {
  id: string;
  confidence: number;
  attrs: Record<string, string | number | boolean>;
};

export type QueryKind = "exists" | "select-threshold" | "select-where";

export type QuerySpec = {
  kind: QueryKind;
  label: string;
  sql: string;
  /** Predicate on tuple attributes (ignores confidence). */
  matches: (t: UncertainTuple) => boolean;
};

export type QueryResult = {
  matchingTuples: UncertainTuple[];
  /** Per-row P(row exists ∧ matches attrs) for matching rows. */
  rowProbabilities: { id: string; p: number }[];
  /** EXISTS / boolean answer probability. */
  answerProbability: number;
  /** SELECT rows passing confidence threshold. */
  passingThreshold: UncertainTuple[];
};

export type DeterministicCompare = {
  /** Rows a deterministic DB would return (confidence ≥ 0.5). */
  rows: UncertainTuple[];
  booleanAnswer: boolean;
};

/** README sensor network example. */
export const SENSORS_TABLE: UncertainTuple[] = [
  { id: "S1", confidence: 0.9, attrs: { location: "Kitchen", tempHigh: true } },
  { id: "S2", confidence: 0.8, attrs: { location: "Kitchen", tempHigh: true } },
  { id: "S3", confidence: 0.5, attrs: { location: "Bedroom", tempHigh: true } },
  { id: "S4", confidence: 0.35, attrs: { location: "Kitchen", tempHigh: false } },
];

/** Witness / user table (existence + attribute uncertainty simplified). */
export const USERS_TABLE: UncertainTuple[] = [
  { id: "u1", confidence: 1, attrs: { name: "Alice", ageGt30: 0.4 } },
  { id: "u2", confidence: 0.7, attrs: { name: "Bob", ageGt30: 1 } },
  { id: "u3", confidence: 0.55, attrs: { name: "Carol", ageGt30: 0.9 } },
];

export const QUERIES: Record<"sensors" | "users", QuerySpec[]> = {
  sensors: [
    {
      kind: "exists",
      label: "Kitchen high temp?",
      sql: "SELECT EXISTS(1 FROM Sensors WHERE location='Kitchen' AND temp_high)",
      matches: (t) => t.attrs.location === "Kitchen" && t.attrs.tempHigh === true,
    },
    {
      kind: "select-where",
      label: "Kitchen rows",
      sql: "SELECT * FROM Sensors WHERE location='Kitchen'",
      matches: (t) => t.attrs.location === "Kitchen",
    },
    {
      kind: "select-threshold",
      label: "High-confidence sensors",
      sql: "SELECT * FROM Sensors WHERE confidence ≥ τ",
      matches: () => true,
    },
  ],
  users: [
    {
      kind: "select-where",
      label: "Age > 30 (attr uncertainty)",
      sql: "SELECT name, P(age>30) FROM Users WHERE age>30",
      matches: (t) => typeof t.attrs.ageGt30 === "number" && t.attrs.ageGt30 > 0,
    },
    {
      kind: "exists",
      label: "Any user age > 30?",
      sql: "SELECT EXISTS(1 FROM Users WHERE P(age>30) > 0)",
      matches: (t) => typeof t.attrs.ageGt30 === "number" && t.attrs.ageGt30 > 0,
    },
    {
      kind: "select-threshold",
      label: "Likely-existing users",
      sql: "SELECT * FROM Users WHERE existence_conf ≥ τ",
      matches: () => true,
    },
  ],
};

export function rowMatchProbability(t: UncertainTuple, query: QuerySpec): number {
  if (!query.matches(t)) return 0;
  if (typeof t.attrs.ageGt30 === "number" && query.kind !== "select-threshold") {
    return t.confidence * t.attrs.ageGt30;
  }
  return t.confidence;
}

export function evaluateQuery(
  table: UncertainTuple[],
  query: QuerySpec,
  threshold: number
): QueryResult {
  const matchingTuples = table.filter((t) => query.matches(t));
  const rowProbabilities = matchingTuples.map((t) => ({
    id: t.id,
    p: rowMatchProbability(t, query),
  }));

  let answerProbability: number;
  if (query.kind === "exists") {
    const confs = matchingTuples.map((t) => rowMatchProbability(t, query));
    answerProbability = probIndependentOr(confs);
  } else if (query.kind === "select-threshold") {
    answerProbability = probIndependentAnd(
      table.filter((t) => tuplePassesThreshold(t.confidence, threshold)).map((t) => t.confidence)
    );
  } else {
    answerProbability = probIndependentOr(
      matchingTuples.map((t) => rowMatchProbability(t, query))
    );
  }

  const passingThreshold = table.filter((t) => {
    if (query.kind === "select-threshold") {
      return tuplePassesThreshold(t.confidence, threshold);
    }
    return query.matches(t) && tuplePassesThreshold(rowMatchProbability(t, query), threshold);
  });

  return { matchingTuples, rowProbabilities, answerProbability, passingThreshold };
}

/** Ground truth: deterministic DB keeps rows with confidence ≥ 0.5. */
export function deterministicCompare(
  table: UncertainTuple[],
  query: QuerySpec,
  threshold: number
): DeterministicCompare {
  const detThreshold = 0.5;
  const rows =
    query.kind === "select-threshold"
      ? table.filter((t) => t.confidence >= detThreshold)
      : table.filter(
          (t) =>
            query.matches(t) &&
            t.confidence >= detThreshold &&
            (typeof t.attrs.ageGt30 !== "number" || t.attrs.ageGt30 >= 0.5)
        );
  const booleanAnswer =
    query.kind === "exists"
      ? rows.some((t) => query.matches(t))
      : rows.length > 0 && query.kind !== "select-threshold";
  return { rows, booleanAnswer };
}

export const KITCHEN_EXISTS_PRESET = {
  table: "sensors" as const,
  queryIdx: 0,
  thresholdPct: 70,
};

export const THRESHOLD_MISTAKE_PRESET = {
  table: "sensors" as const,
  queryIdx: 2,
  thresholdPct: 92,
};

export const USERS_AGE_PRESET = {
  table: "users" as const,
  queryIdx: 0,
  thresholdPct: 50,
};
