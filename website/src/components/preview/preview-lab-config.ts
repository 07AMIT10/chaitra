export type PreviewPredictOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type PreviewLabConfig = {
  sliderLabel: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  defaultValue: number;
  metricLabel: string;
  formatMetric: (value: number) => string;
  question: string;
  options: PreviewPredictOption[];
  storageKey: string;
};

export const PREVIEW_LAB_CONFIG: Record<string, PreviewLabConfig> = {
  "adaptive-cloud-orchestration": {
    sliderLabel: "Load spike factor",
    sliderMin: 1,
    sliderMax: 5,
    sliderStep: 0.5,
    defaultValue: 2,
    metricLabel: "Suggested replica scale",
    formatMetric: (v) => `${Math.ceil(v * 2)} pods`,
    question: "If load doubles, should you scale replicas before the queue backs up?",
    options: [
      { id: "yes", label: "Yes — proactive scale-out", isCorrect: true },
      { id: "no", label: "No — wait for SLA breach", isCorrect: false },
    ],
    storageKey: "preview-adaptive-cloud",
  },
  "ai-probabilistic-infrastructure": {
    sliderLabel: "Sketch error budget ε",
    sliderMin: 0.01,
    sliderMax: 0.1,
    sliderStep: 0.01,
    defaultValue: 0.05,
    metricLabel: "Approx. memory savings",
    formatMetric: (v) => `~${Math.round((1 - v * 10) * 90)}% vs exact`,
    question: "Can approximate sketches replace exact counts when ε is small?",
    options: [
      { id: "often", label: "Often — trade exactness for cost", isCorrect: true },
      { id: "never", label: "Never — always exact", isCorrect: false },
    ],
    storageKey: "preview-ai-prob-infra",
  },
  "approximate-computing": {
    sliderLabel: "Acceptable error %",
    sliderMin: 1,
    sliderMax: 20,
    sliderStep: 1,
    defaultValue: 5,
    metricLabel: "Energy savings (heuristic)",
    formatMetric: (v) => `~${v * 3}%`,
    question: "Does relaxing precision usually reduce energy per operation?",
    options: [
      { id: "yes", label: "Yes — lower precision → less work", isCorrect: true },
      { id: "no", label: "No effect", isCorrect: false },
    ],
    storageKey: "preview-approx-computing",
  },
  "autonomous-infrastructure": {
    sliderLabel: "Control loop interval (s)",
    sliderMin: 1,
    sliderMax: 60,
    sliderStep: 1,
    defaultValue: 10,
    metricLabel: "Reactions per hour",
    formatMetric: (v) => `${Math.floor(3600 / v)}`,
    question: "Shorter control loops react faster but cost more API calls?",
    options: [
      { id: "yes", label: "Yes — frequency vs cost tradeoff", isCorrect: true },
      { id: "no", label: "Interval does not matter", isCorrect: false },
    ],
    storageKey: "preview-autonomous-infra",
  },
  "distributed-systems": {
    sliderLabel: "Partition tolerance stress",
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 5,
    defaultValue: 50,
    metricLabel: "CAP emphasis",
    formatMetric: (v) => (v > 50 ? "Favor availability" : "Favor consistency"),
    question: "During a network partition, must you choose between C and A?",
    options: [
      { id: "yes", label: "Yes — CAP forces a tradeoff", isCorrect: true },
      { id: "no", label: "You can have both fully", isCorrect: false },
    ],
    storageKey: "preview-distributed-systems",
  },
  "event-prediction-systems": {
    sliderLabel: "Forecast horizon (steps)",
    sliderMin: 1,
    sliderMax: 24,
    sliderStep: 1,
    defaultValue: 6,
    metricLabel: "Uncertainty growth",
    formatMetric: (v) => `±${(v * 2).toFixed(0)}%`,
    question: "Does forecast error typically grow with horizon?",
    options: [
      { id: "yes", label: "Yes — error accumulates", isCorrect: true },
      { id: "flat", label: "Stays constant", isCorrect: false },
    ],
    storageKey: "preview-event-prediction",
  },
  "go-backend-systems": {
    sliderLabel: "Goroutine pool size",
    sliderMin: 1,
    sliderMax: 1000,
    sliderStep: 1,
    defaultValue: 64,
    metricLabel: "Theoretical parallelism",
    formatMetric: (v) => `${v} workers`,
    question: "Should unbounded goroutines be used for all I/O?",
    options: [
      { id: "no", label: "No — bound concurrency", isCorrect: true },
      { id: "yes", label: "Yes — always spawn freely", isCorrect: false },
    ],
    storageKey: "preview-go-backend",
  },
  "intelligent-realtime-platforms": {
    sliderLabel: "Event lag (ms)",
    sliderMin: 10,
    sliderMax: 500,
    sliderStep: 10,
    defaultValue: 100,
    metricLabel: "User-visible delay",
    formatMetric: (v) => `${v} ms`,
    question: "Is sub-100ms end-to-end latency a common realtime goal?",
    options: [
      { id: "yes", label: "Yes for interactive UX", isCorrect: true },
      { id: "no", label: "Seconds are fine", isCorrect: false },
    ],
    storageKey: "preview-intelligent-realtime",
  },
  "large-scale-ml-infrastructure": {
    sliderLabel: "GPU utilization target %",
    sliderMin: 50,
    sliderMax: 95,
    sliderStep: 5,
    defaultValue: 80,
    metricLabel: "Idle cost risk",
    formatMetric: (v) => (v < 70 ? "High waste" : "Healthy"),
    question: "Is low GPU utilization a sign of scheduling inefficiency?",
    options: [
      { id: "yes", label: "Yes — aim for high util", isCorrect: true },
      { id: "no", label: "Utilization irrelevant", isCorrect: false },
    ],
    storageKey: "preview-ls-ml-infra",
  },
  "large-scale-multi-agent-systems": {
    sliderLabel: "Agent count",
    sliderMin: 2,
    sliderMax: 100,
    sliderStep: 1,
    defaultValue: 10,
    metricLabel: "Coordination complexity",
    formatMetric: (v) => `O(${v}²) message pairs`,
    question: "Does naive all-to-all coordination scale poorly?",
    options: [
      { id: "yes", label: "Yes — need structure", isCorrect: true },
      { id: "no", label: "Linear always", isCorrect: false },
    ],
    storageKey: "preview-ls-mas",
  },
  "llm-infrastructure": {
    sliderLabel: "KV cache size (GB)",
    sliderMin: 1,
    sliderMax: 80,
    sliderStep: 1,
    defaultValue: 24,
    metricLabel: "Max batch hint",
    formatMetric: (v) => `~${Math.floor(v / 2)} concurrent seqs`,
    question: "Does KV cache memory bound how many sequences you batch?",
    options: [
      { id: "yes", label: "Yes — memory is the cap", isCorrect: true },
      { id: "no", label: "Only FLOPs matter", isCorrect: false },
    ],
    storageKey: "preview-llm-infra",
  },
  "next-gen-ai-agents": {
    sliderLabel: "Tool calls per task",
    sliderMin: 1,
    sliderMax: 20,
    sliderStep: 1,
    defaultValue: 5,
    metricLabel: "Failure compounding",
    formatMetric: (v) => `${(100 - 95 ** v).toFixed(0)}% risk @5% fail/step`,
    question: "Do more tool steps increase end-to-end failure risk?",
    options: [
      { id: "yes", label: "Yes — errors compound", isCorrect: true },
      { id: "no", label: "Independent — no compounding", isCorrect: false },
    ],
    storageKey: "preview-next-gen-agents",
  },
  "proactive-ai-systems": {
    sliderLabel: "Prediction lead time (min)",
    sliderMin: 1,
    sliderMax: 120,
    sliderStep: 1,
    defaultValue: 15,
    metricLabel: "Action window",
    formatMetric: (v) => `${v} min to act`,
    question: "Must proactive systems act before the predicted event?",
    options: [
      { id: "yes", label: "Yes — lead time enables prevention", isCorrect: true },
      { id: "after", label: "Act after event", isCorrect: false },
    ],
    storageKey: "preview-proactive-ai",
  },
  "reinforcement-learning-orchestration": {
    sliderLabel: "Exploration ε",
    sliderMin: 0,
    sliderMax: 1,
    sliderStep: 0.05,
    defaultValue: 0.1,
    metricLabel: "Random action rate",
    formatMetric: (v) => `${(v * 100).toFixed(0)}%`,
    question: "Does ε-greedy balance explore vs exploit?",
    options: [
      { id: "yes", label: "Yes — ε controls exploration", isCorrect: true },
      { id: "no", label: "Always greedy is best", isCorrect: false },
    ],
    storageKey: "preview-rl-orchestration",
  },
  "scalable-architectures": {
    sliderLabel: "Shard count",
    sliderMin: 1,
    sliderMax: 64,
    sliderStep: 1,
    defaultValue: 8,
    metricLabel: "Per-shard load",
    formatMetric: (v) => `${(100 / v).toFixed(1)}% of total`,
    question: "Does sharding reduce per-node load as shard count grows?",
    options: [
      { id: "yes", label: "Yes — horizontal scale", isCorrect: true },
      { id: "no", label: "No — load unchanged", isCorrect: false },
    ],
    storageKey: "preview-scalable-arch",
  },
};
