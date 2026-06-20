import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DRISHTI_LENSES = require("../src/data/drishti-lenses.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const DRISHTI_ROOT = path.join(repoRoot, "drishti");
const contentRoot = path.join(repoRoot, "website/src/content/drishti");
const outPath = path.join(repoRoot, "website/src/data/drishti.json");
const topicsPath = path.join(repoRoot, "website/src/data/topics.json");

function parseMetaYaml(raw) {
  const result = {};
  const tldr = [];
  const relatedTopics = [];
  let inTldr = false;
  let inRelated = false;
  let inAtAGlance = false;

  for (const line of raw.split("\n")) {
    if (line.startsWith("tldr:")) {
      inTldr = true;
      inRelated = false;
      inAtAGlance = false;
      continue;
    }
    if (line.startsWith("relatedTopics:")) {
      inRelated = true;
      inTldr = false;
      inAtAGlance = false;
      continue;
    }
    if (line.startsWith("atAGlance:")) {
      inAtAGlance = true;
      inTldr = false;
      inRelated = false;
      result.atAGlance = {};
      continue;
    }
    if (inTldr && /^\s+-\s+/.test(line)) {
      tldr.push(line.replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, ""));
      continue;
    }
    if (inRelated && /^\s+-\s+/.test(line)) {
      relatedTopics.push(line.replace(/^\s+-\s+/, "").trim());
      continue;
    }
    if (inAtAGlance && /^\s+(\w+):\s*["']?(.*?)["']?\s*$/.test(line)) {
      const m = line.match(/^\s+(\w+):\s*["']?(.*?)["']?\s*$/);
      result.atAGlance[m[1]] = m[2];
      continue;
    }
    const kv = line.match(/^(\w+):\s*["']?(.*?)["']?\s*$/);
    if (kv && !inTldr && !inRelated && !inAtAGlance) {
      result[kv[1]] = kv[2];
    }
    if (line.match(/^\w+:/) && !line.startsWith("  ")) {
      inTldr = false;
      inRelated = false;
      if (!line.startsWith("atAGlance")) inAtAGlance = false;
    }
  }
  if (tldr.length) result.tldr = tldr;
  if (relatedTopics.length) result.relatedTopics = relatedTopics;
  return result;
}

function parseLensFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return {};
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return {};
  const yaml = raw.slice(4, end);
  const data = {};
  let currentKey = null;
  for (const line of yaml.split("\n")) {
    if (/^\s+-\s+/.test(line) && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(line.replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, ""));
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    currentKey = key;
    if (value === "") {
      data[key] = [];
    } else if (value === "true") {
      data[key] = true;
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return data;
}

const LENS_RELATED_TOPICS = {
  "what-exists": ["information-theory", "probability-theory"],
  "what-changes": ["eventual-consistency", "streaming-analytics"],
  "what-flows": ["queueing-theory", "streaming-algorithms"],
  "what-learns": ["statistical-learning", "reinforcement-learning-orchestration"],
  "what-persists": ["crdts-plus-probability", "consensus-systems"],
  "what-emerges": ["large-scale-multi-agent-systems", "gossip-protocols"],
  "what-will-happen": [
    "event-prediction-systems",
    "bayesian-inference-systems",
    "monte-carlo-systems",
  ],
};

const lenses = DRISHTI_LENSES.map((l, index) => {
  const readme = path.join(DRISHTI_ROOT, "lenses", l.folder, "README.md");
  const meta = fs.existsSync(readme)
    ? parseLensFrontmatter(fs.readFileSync(readme, "utf8"))
    : {};
  return {
    slug: l.slug,
    folder: l.folder,
    order: index + 1,
    title: meta.title ?? l.title,
    question: meta.question ?? l.question,
    hook: l.hook,
    glyph: l.glyph,
    deep: meta.deep === true || l.slug === "what-will-happen",
    relatedTopics:
      meta.relatedTopics?.length ? meta.relatedTopics : LENS_RELATED_TOPICS[l.slug] ?? [],
    hasPage: fs.existsSync(path.join(contentRoot, "lenses", l.slug, "index.mdx")),
  };
});

const studies = [];
const topicIndex = {};

const studyDirs = fs
  .readdirSync(path.join(DRISHTI_ROOT, "studies"), { withFileTypes: true })
  .filter((e) => e.isDirectory());

for (const e of studyDirs) {
  const metaPath = path.join(DRISHTI_ROOT, "studies", e.name, "meta.yaml");
  if (!fs.existsSync(metaPath)) continue;
  const meta = parseMetaYaml(fs.readFileSync(metaPath, "utf8"));
  const slug = meta.slug ?? e.name.toLowerCase().replace(/_/g, "-");
  studies.push({
    slug,
    folder: e.name,
    title: meta.title,
    tagline: meta.tagline ?? "",
    tldr: meta.tldr ?? [],
    relatedTopics: meta.relatedTopics ?? [],
    atAGlance: meta.atAGlance ?? {},
    hasPage: fs.existsSync(path.join(contentRoot, "studies", slug, "index.mdx")),
  });
  for (const topicSlug of meta.relatedTopics ?? []) {
    if (!topicIndex[topicSlug]) topicIndex[topicSlug] = [];
    topicIndex[topicSlug].push({ slug, title: meta.title });
  }
}

studies.sort((a, b) => a.title.localeCompare(b.title));

const topicTitles = new Map();
if (fs.existsSync(topicsPath)) {
  for (const t of JSON.parse(fs.readFileSync(topicsPath, "utf8"))) {
    topicTitles.set(t.slug, t.title);
  }
}

for (const lens of lenses) {
  for (const topicSlug of lens.relatedTopics) {
    if (!topicIndex[topicSlug]) topicIndex[topicSlug] = [];
    if (!topicIndex[topicSlug].some((s) => s.slug === `lens:${lens.slug}`)) {
      topicIndex[topicSlug].push({ slug: `lens:${lens.slug}`, title: `Drishti: ${lens.title}` });
    }
  }
}

const catalog = {
  lenses,
  studies,
  topicIndex,
  topicToStudies: Object.fromEntries(
    Object.entries(topicIndex).map(([topicSlug, entries]) => [
      topicSlug,
      entries.filter((e) => !String(e.slug).startsWith("lens:")).map((e) => e.slug),
    ])
  ),
  topicTitles: Object.fromEntries(topicTitles),
};

fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2));
console.log(`wrote drishti.json — ${lenses.length} lenses, ${studies.length} studies`);
