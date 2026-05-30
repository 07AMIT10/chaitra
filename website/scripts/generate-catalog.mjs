import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const topicsJsonPath = path.join(repoRoot, "website/src/data/topics.json");
const contentRoot = path.join(repoRoot, "website/src/content/topics");
const skip = new Set([".git", ".research", "website", "docs", "tests"]);
const codedFolders = new Set([
  "BLOOM_FILTERS",
  "COUNT_MIN_SKETCH",
  "CONSISTENT_HASHING",
  "HYPERLOGLOG",
]);

const TITLE_OVERRIDES = {
  "adaptive-cloud-orchestration": "Adaptive Cloud Orchestration",
  "ai-probabilistic-infrastructure": "AI Probabilistic Infrastructure",
  "approximate-computing": "Approximate Computing",
  "approximate-memory-cache-systems": "Approximate Memory Cache Systems",
  "autonomous-infrastructure": "Autonomous Infrastructure",
  "bayesian-distributed-systems": "Bayesian Distributed Systems",
  "bayesian-inference-systems": "Bayesian Inference Systems",
  "bloom-filters": "Bloom Filters",
  "consensus-systems": "Consensus Systems",
  "consistent-hashing": "Consistent Hashing",
  "count-min-sketch": "Count-Min Sketch",
  "crdts-plus-probability": "CRDTs + Probability",
  "distributed-queues": "Distributed Queues",
  "distributed-systems": "Distributed Systems",
  "event-prediction-systems": "Event Prediction Systems",
  "eventual-consistency": "Eventual Consistency",
  "go-backend-systems": "Go Backend Systems",
  "gossip-protocols": "Gossip Protocols",
  "hyperloglog": "HyperLogLog",
  "information-theory": "Information Theory",
  "intelligent-realtime-platforms": "Intelligent Realtime Platforms",
  "large-language-models": "Large Language Models",
  "large-scale-ml-infrastructure": "Large Scale ML Infrastructure",
  "large-scale-multi-agent-systems": "Large Scale Multi Agent Systems",
  "llm-infrastructure": "LLM Infrastructure",
  "mapreduce": "MapReduce",
  "mixture-of-experts": "Mixture of Experts",
  "monte-carlo-systems": "Monte Carlo Systems",
  "monte-carlo-tree-search": "Monte Carlo Tree Search",
  "next-gen-ai-agents": "Next Gen AI Agents",
  "pagerank": "PageRank",
  "power-of-two-choices": "Power of Two Choices",
  "proactive-ai-systems": "Proactive AI Systems",
  "probabilistic-consensus": "Probabilistic Consensus",
  "probabilistic-databases": "Probabilistic Databases",
  "probabilistic-scheduling": "Probabilistic Scheduling",
  "probability-theory": "Probability Theory",
  "queueing-theory": "Queueing Theory",
  "raft-vs-gossip": "Raft vs Gossip",
  "random-early-detection": "Random Early Detection",
  "randomized-algorithms": "Randomized Algorithms",
  "rate-limiting": "Rate Limiting",
  "reinforcement-learning-orchestration": "RL Orchestration",
  "scalable-architectures": "Scalable Architectures",
  "spam-detection": "Spam Detection",
  "statistical-learning": "Statistical Learning",
  "streaming-algorithms": "Streaming Algorithms",
  "streaming-analytics": "Streaming Analytics",
  "tinylfu": "TinyLFU",
  "token-routing": "Token Routing",
  "transformer-attention": "Transformer Attention",
};

/** P1 = Tier A full lab; P2 = Tier B mini-viz; none = prose only */
const LAB_TIER = {
  "bloom-filters": "A",
  "count-min-sketch": "A",
  "consistent-hashing": "A",
  "hyperloglog": "A",
  "rate-limiting": "A",
  "tinylfu": "A",
  "gossip-protocols": "A",
  "crdts-plus-probability": "A",
  "power-of-two-choices": "A",
  "spam-detection": "A",
  "queueing-theory": "A",
  "pagerank": "A",
  "monte-carlo-systems": "A",
  "monte-carlo-tree-search": "A",
  "randomized-algorithms": "A",
  "information-theory": "A",
  "probability-theory": "A",
  "mapreduce": "A",
  "raft-vs-gossip": "A",
  "consensus-systems": "A",
  "probabilistic-consensus": "A",
  "eventual-consistency": "A",
  "random-early-detection": "A",
  "streaming-algorithms": "A",
  "streaming-analytics": "A",
  "bayesian-inference-systems": "A",
  "bayesian-distributed-systems": "A",
  "approximate-memory-cache-systems": "A",
  "mixture-of-experts": "A",
  "token-routing": "A",
  "transformer-attention": "A",
  "distributed-queues": "A",
  "probabilistic-scheduling": "A",
  "probabilistic-databases": "A",
};

export function hasSitePage(slug) {
  return fs.existsSync(path.join(contentRoot, slug, "index.mdx"));
}

export function hasCodePanel(slug) {
  return fs.existsSync(path.join(contentRoot, slug, "code.mdx"));
}

/** True when index.mdx imports a Lab component with client:visible hydration. */
export function hasLabIsland(slug) {
  const mdxPath = path.join(contentRoot, slug, "index.mdx");
  if (!fs.existsSync(mdxPath)) return false;
  const content = fs.readFileSync(mdxPath, "utf8");
  return (
    /import\s+\w+Lab\s+from\s+["'].*Lab\.tsx["']/.test(content) &&
    /client:visible/.test(content)
  );
}

export function resolveStatus({ slug, folder, prior, hasPage, hasLab }) {
  if (prior?.status === "golden") return "golden";
  if (hasLab) return "live";
  if (hasPage) return "preview";
  if (codedFolders.has(folder)) return "coded";
  return "readme-only";
}

const existingByFolder = new Map();
if (fs.existsSync(topicsJsonPath)) {
  for (const t of JSON.parse(fs.readFileSync(topicsJsonPath, "utf8"))) {
    existingByFolder.set(t.folder, t);
  }
}

const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
const topics = [];

for (const e of entries) {
  if (!e.isDirectory() || skip.has(e.name) || e.name.startsWith(".")) continue;
  const readme = path.join(repoRoot, e.name, "README.md");
  if (!fs.existsSync(readme)) continue;

  const slug = e.name.toLowerCase().replace(/_/g, "-");
  const dir = path.join(repoRoot, e.name);
  const files = fs.readdirSync(dir);
  const hasPy =
    fs.existsSync(path.join(dir, `${e.name.toLowerCase()}.py`)) ||
    files.some((f) => f.endsWith(".py"));
  const hasRs = files.some((f) => f.endsWith(".rs"));
  const hasPage = hasSitePage(slug);
  const hasLab = hasLabIsland(slug);
  const hasCode = hasCodePanel(slug);

  const prior = existingByFolder.get(e.name);
  const status = resolveStatus({ slug, folder: e.name, prior, hasPage, hasLab });
  const labTier = prior?.labTier ?? LAB_TIER[slug] ?? undefined;

  topics.push({
    slug,
    title: TITLE_OVERRIDES[slug] ?? prior?.title ?? e.name.replace(/_/g, " "),
    folder: e.name,
    ...(prior?.phase != null ? { phase: prior.phase } : {}),
    ...(prior?.prerequisites ? { prerequisites: prior.prerequisites } : {}),
    ...(labTier ? { labTier } : {}),
    status,
    hasLab,
    hasCode,
    hasPython: hasPy,
    hasRust: hasRs,
  });
}

topics.sort((a, b) => a.title.localeCompare(b.title));

for (const t of topics) {
  if (t.hasLab && t.status !== "golden") {
    console.warn(`warn: ${t.slug} has lab but status is "${t.status}" (not golden)`);
  }
}

fs.writeFileSync(topicsJsonPath, JSON.stringify(topics, null, 2));
console.log(`wrote ${topics.length} topics`);
