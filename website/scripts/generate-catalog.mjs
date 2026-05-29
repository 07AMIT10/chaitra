import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const topicsJsonPath = path.join(repoRoot, "website/src/data/topics.json");
const skip = new Set([".git", ".research", "website", "docs", "tests"]);
const codedFolders = new Set([
  "BLOOM_FILTERS",
  "COUNT_MIN_SKETCH",
  "CONSISTENT_HASHING",
  "HYPERLOGLOG",
]);

const TITLE_OVERRIDES = {
  "bloom-filters": "Bloom Filters",
  "count-min-sketch": "Count-Min Sketch",
  "consistent-hashing": "Consistent Hashing",
  "hyperloglog": "HyperLogLog",
};

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
  const hasSitePage = fs.existsSync(
    path.join(repoRoot, "website/src/content/topics", slug, "index.mdx")
  );

  const prior = existingByFolder.get(e.name);
  let status;
  if (prior?.status === "golden" || prior?.status === "live") {
    status = prior.status;
  } else if (hasSitePage) {
    status = "live";
  } else if (codedFolders.has(e.name)) {
    status = "coded";
  } else {
    status = "readme-only";
  }

  topics.push({
    slug,
    title: TITLE_OVERRIDES[slug] ?? prior?.title ?? e.name.replace(/_/g, " "),
    folder: e.name,
    ...(prior?.phase != null ? { phase: prior.phase } : {}),
    ...(prior?.prerequisites ? { prerequisites: prior.prerequisites } : {}),
    ...(prior?.labTier ? { labTier: prior.labTier } : {}),
    status,
    hasPython: hasPy,
    hasRust: hasRs,
  });
}

topics.sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(topicsJsonPath, JSON.stringify(topics, null, 2));
console.log(`wrote ${topics.length} topics`);
