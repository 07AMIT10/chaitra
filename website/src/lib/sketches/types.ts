/** Shared types for sketch / stream labs (Task 28). */

export type StreamEvent = {
  key: string;
  count?: number;
};

export type FrequencyTruth = Map<string, number>;

export type SketchDimensions = {
  width: number;
  depth: number;
};

export type HashRingNode = {
  name: string;
  positions: number[];
};

export type RingAssignment = {
  key: string;
  node: string | null;
  hash: number;
};

export type GossipNode = {
  id: number;
  informed: boolean;
};

export type GossipRound = {
  round: number;
  informedCount: number;
  messagesSent: number;
};

export type TokenBucketState = {
  tokens: number;
  capacity: number;
  refillRate: number;
  lastRefillMs: number;
};

export type QueueEvent = {
  type: "arrival" | "departure";
  time: number;
  queueLength: number;
};

export type MiniSimControl = {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  valueText: string;
};

export type MiniSimMetric = {
  id: string;
  label: string;
  value: string;
  tone?: "default" | "warn" | "aha";
};
