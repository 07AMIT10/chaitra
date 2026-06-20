import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DRISHTI_LENSES = require("../src/data/drishti-lenses.json");
const LENS_SLUGS = DRISHTI_LENSES.map((l) => l.slug);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const DRISHTI_ROOT = path.join(repoRoot, "drishti");
const CONTENT_ROOT = path.join(repoRoot, "website/src/content/drishti");

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;

function looksLikeDiagram(content) {
  const lines = content.trim().split("\n");
  return (
    lines.some((line) => /\[/.test(line) && /\]/.test(line)) ||
    lines.some((line) => /→/.test(line))
  );
}

function processFences(body) {
  return body.replace(FENCE_RE, (match, lang, content) => {
    const normalized = lang === "ascii" ? "text" : lang || "text";
    if ((normalized === "text" || lang === "ascii") && looksLikeDiagram(content)) {
      return `<!-- diagram -->\n\`\`\`diagram\n${content}\`\`\``;
    }
    if (lang === "ascii") {
      return `\`\`\`text\n${content}\`\`\``;
    }
    return match;
  });
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: raw };
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const data = {};
  let currentKey = null;
  let listMode = false;

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
      listMode = true;
      data[key] = [];
    } else if (value === "true") {
      data[key] = true;
      listMode = false;
    } else if (value === "false") {
      data[key] = false;
      listMode = false;
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
      listMode = false;
    }
  }
  return { data, body };
}

function parseMetaYaml(raw) {
  const data = {};
  let section = null;
  for (const line of raw.split("\n")) {
    if (/^\s+\w+:/.test(line) && section) {
      const m = line.match(/^\s+(\w+):\s*["']?(.*?)["']?\s*$/);
      if (m) {
        if (!data[section]) data[section] = {};
        data[section][m[1]] = m[2];
      }
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === "") {
      section = key;
      data[key] = {};
      continue;
    }
    section = null;
    if (value === "") {
      data[key] = [];
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  const result = { ...data };
  if (data.tldr === undefined) {
    const tldr = [];
    let inTldr = false;
    for (const line of raw.split("\n")) {
      if (line.startsWith("tldr:")) {
        inTldr = true;
        continue;
      }
      if (inTldr && /^\s+-\s+/.test(line)) {
        tldr.push(line.replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, ""));
      } else if (inTldr && line.match(/^\w+:/)) {
        inTldr = false;
      }
    }
    if (tldr.length) result.tldr = tldr;
  }

  const related = [];
  let inRelated = false;
  for (const line of raw.split("\n")) {
    if (line.startsWith("relatedTopics:")) {
      inRelated = true;
      continue;
    }
    if (inRelated && /^\s+-\s+/.test(line)) {
      related.push(line.replace(/^\s+-\s+/, "").trim());
    } else if (inRelated && line.match(/^\w+:/)) {
      inRelated = false;
    }
  }
  if (related.length) result.relatedTopics = related;

  return result;
}

function yamlList(key, items) {
  if (!items?.length) return "";
  return `${key}:\n${items.map((i) => `  - "${i}"`).join("\n")}\n`;
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

function defaultTldr(lens, data) {
  if (data.tldr?.length) return data.tldr;
  return [
    lens.hook,
    `Core question: ${data.question ?? lens.question}`,
    "Apply this lens before reaching for formal tools.",
  ];
}

function syncLens(lens) {
  const src = path.join(DRISHTI_ROOT, "lenses", lens.folder, "README.md");
  if (!fs.existsSync(src)) {
    console.warn(`skip lens ${lens.slug}: no README`);
    return;
  }
  const raw = fs.readFileSync(src, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const destDir = path.join(CONTENT_ROOT, "lenses", lens.slug);
  fs.mkdirSync(destDir, { recursive: true });

  const processed = processFences(body.trim());
  fs.writeFileSync(path.join(destDir, "readme-body.md"), processed, "utf8");

  const tldr = defaultTldr(lens, data);
  const relatedTopics =
    data.relatedTopics?.length ? data.relatedTopics : LENS_RELATED_TOPICS[lens.slug] ?? [];
  const isDeep = data.deep === true || lens.slug === "what-will-happen";

  const frontmatter = [
    "---",
    `title: "${data.title ?? lens.title}"`,
    `slug: ${data.slug ?? lens.slug}`,
    `question: "${data.question ?? lens.question}"`,
    yamlList("tldr", tldr),
    yamlList("relatedTopics", relatedTopics),
    isDeep ? "deep: true" : "",
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const index = `${frontmatter}

import ReadmeBody from "./readme-body.md";

<ReadmeBody />
`;
  fs.writeFileSync(path.join(destDir, "index.mdx"), index, "utf8");
  console.log(`synced lens ${lens.slug}`);
}

function syncFramework() {
  const src = path.join(DRISHTI_ROOT, "framework", "README.md");
  if (!fs.existsSync(src)) return;
  const raw = fs.readFileSync(src, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const destDir = path.join(CONTENT_ROOT, "framework");
  fs.mkdirSync(destDir, { recursive: true });
  const processed = processFences(body.trim());
  fs.writeFileSync(path.join(destDir, "readme-body.md"), processed, "utf8");

  const frontmatter = [
    "---",
    `title: "${data.title ?? "The Drishti Framework"}"`,
    `slug: framework`,
    yamlList(
      "tldr",
      data.tldr?.length
        ? data.tldr
        : [
            "Seven questions apply to any phenomenon.",
            "Case studies use the same template every time.",
            "Drishti points to Chaitra topics for formal mechanisms.",
          ]
    ),
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const index = `${frontmatter}

import ReadmeBody from "./readme-body.md";

<ReadmeBody />
`;
  fs.writeFileSync(path.join(destDir, "index.mdx"), index, "utf8");
  console.log("synced framework");
}

const catalogPath = path.join(repoRoot, "website/src/data/drishti.json");

function loadCatalogStudies() {
  if (!fs.existsSync(catalogPath)) return [];
  return JSON.parse(fs.readFileSync(catalogPath, "utf8")).studies ?? [];
}
function syncStudy(folder, catalogStudies) {
  const studyDir = path.join(DRISHTI_ROOT, "studies", folder);
  const metaPath = path.join(studyDir, "meta.yaml");
  if (!fs.existsSync(metaPath)) {
    console.warn(`skip study ${folder}: no meta.yaml`);
    return;
  }
  const meta =
    catalogStudies.find((s) => s.folder === folder) ??
    parseMetaYaml(fs.readFileSync(metaPath, "utf8"));
  const slug = meta.slug ?? folder.toLowerCase().replace(/_/g, "-");
  const destDir = path.join(CONTENT_ROOT, "studies", slug);
  fs.mkdirSync(destDir, { recursive: true });

  for (const lensSlug of LENS_SLUGS) {
    const src = path.join(studyDir, `${lensSlug}.md`);
    if (!fs.existsSync(src)) {
      console.warn(`skip ${slug}/${lensSlug}: missing file`);
      continue;
    }
    let body = fs.readFileSync(src, "utf8");
    body = processFences(body.trim());
    fs.writeFileSync(path.join(destDir, `${lensSlug}.md`), body, "utf8");
  }

  const atAGlance = meta.atAGlance ?? {};
  const frontmatter = [
    "---",
    `title: "${meta.title}"`,
    `slug: ${slug}`,
    `tagline: "${meta.tagline ?? ""}"`,
    yamlList("tldr", meta.tldr),
    yamlList("relatedTopics", meta.relatedTopics),
    "atAGlance:",
    `  flows: "${atAGlance.flows ?? ""}"`,
    `  optimizes: "${atAGlance.optimizes ?? ""}"`,
    `  persists: "${atAGlance.persists ?? ""}"`,
    `  likelyFuture: "${atAGlance.likelyFuture ?? ""}"`,
    "---",
  ].join("\n");

  fs.writeFileSync(path.join(destDir, "index.mdx"), `${frontmatter}\n`, "utf8");
  console.log(`synced study ${slug}`);
}

for (const lens of DRISHTI_LENSES) {
  syncLens(lens);
}
syncFramework();

const studyFolders = fs
  .readdirSync(path.join(DRISHTI_ROOT, "studies"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const folder of studyFolders) {
  syncStudy(folder, loadCatalogStudies());
}

console.log("drishti sync complete");
