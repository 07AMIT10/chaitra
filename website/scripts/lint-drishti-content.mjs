#!/usr/bin/env node
/**
 * Content quality lint for drishti/studies/.
 * Errors fail CI; warnings print but do not fail.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const STUDIES_ROOT = path.join(repoRoot, "drishti/studies");
const TOPICS_PATH = path.join(repoRoot, "website/src/data/topics.json");
const EXCERPTS_PATH = path.join(
  repoRoot,
  "website/src/data/drishti/pass-excerpts.json"
);
const CATALOG_PATH = path.join(repoRoot, "website/src/data/drishti.json");

const LENS_FILES = [
  "what-exists",
  "what-changes",
  "what-flows",
  "what-learns",
  "what-persists",
  "what-emerges",
  "what-will-happen",
];

/** All catalog studies — full strict lint (errors). */
const STRICT_STUDIES = new Set([
  "the-office-as-a-computer",
  "global-supply-chains",
  "photosynthesis",
  "sleep",
  "blood-circulation",
  "internet-routing",
  "the-immune-system",
  "urban-traffic-networks",
  "power-grids",
]);

const BANNED_PATTERNS = [
  { re: /Furthermore,/i, label: "Furthermore," },
  { re: /What also exists are/i, label: "What also exists are" },
  { re: /\*\*Takeaway:\*\*/i, label: "**Takeaway:**" },
  { re: /\bPrior:/i, label: "Prior:" },
  { re: /\bPosterior:/i, label: "Posterior:" },
  { re: /\bfundamentally\b/i, label: "fundamentally" },
  { re: /\bincredibly\b/i, label: "incredibly" },
  {
    re: /\bmassive\b(?![\s\S]{0,40}(queue|ship|port|ton|container|MW|GW|petabyte))/i,
    label: "massive (non-quantity)",
  },
  { re: /planetary-scale distributed system/i, label: "planetary-scale distributed system" },
];

function wordCount(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`\[\]()>-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function hasTableOrMermaid(text) {
  return /\|.+\|/.test(text) || /```mermaid/.test(text);
}

function countSentences(paragraph) {
  const trimmed = paragraph.trim();
  if (!trimmed) return 0;
  return trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0).length;
}

function parseMetaYaml(raw) {
  const data = { tryIt: "", featured: false };
  let inTldr = false;
  let inHooks = false;
  const relatedTopics = [];

  for (const line of raw.split("\n")) {
    if (line.startsWith("tldr:")) {
      inTldr = true;
      inHooks = false;
      continue;
    }
    if (line.startsWith("hooks:")) {
      inHooks = true;
      inTldr = false;
      continue;
    }
    if (line.startsWith("relatedTopics:")) {
      inTldr = false;
      inHooks = false;
      continue;
    }
    if (inTldr && /^\s+-\s+/.test(line)) continue;
    if (inHooks && /^\s+\w+:/.test(line)) continue;
    if (/^\s+-\s+/.test(line) && !inTldr) {
      relatedTopics.push(line.replace(/^\s+-\s+/, "").trim());
      continue;
    }
    const kv = line.match(/^(\w+):\s*["']?(.*?)["']?\s*$/);
    if (kv) {
      const [, key, value] = kv;
      if (key === "tryIt") data.tryIt = value;
      if (key === "featured") data.featured = value === "true";
      if (key === "slug") data.slug = value;
      inTldr = false;
      inHooks = false;
    }
    if (line.match(/^\w+:/) && !line.startsWith("  ")) {
      inTldr = false;
      inHooks = false;
    }
  }
  data.relatedTopics = relatedTopics;
  return data;
}

function report(level, study, file, message) {
  return { level, study, file, message };
}

function lintStudy(folder, topicSlugs, catalogSlugs, excerptSlugs) {
  const studyDir = path.join(STUDIES_ROOT, folder);
  const metaPath = path.join(studyDir, "meta.yaml");
  if (!fs.existsSync(metaPath)) return [];

  const metaRaw = fs.readFileSync(metaPath, "utf8");
  const meta = parseMetaYaml(metaRaw);
  const slug =
    meta.slug ?? folder.toLowerCase().replace(/_/g, "-");
  const strict = STRICT_STUDIES.has(slug);
  const issues = [];

  const fail = (file, message) =>
    issues.push({
      level: strict ? "error" : "warn",
      study: slug,
      file,
      message,
    });
  const warn = (file, message) =>
    issues.push({ level: "warn", study: slug, file, message });

  if (!meta.tryIt?.trim()) {
    fail("meta.yaml", "missing non-empty tryIt");
  }

  for (const topic of meta.relatedTopics ?? []) {
    if (!topicSlugs.has(topic)) {
      fail("meta.yaml", `invalid relatedTopics slug: ${topic}`);
    }
  }

  for (const lens of LENS_FILES) {
    const file = `${lens}.md`;
    const filePath = path.join(studyDir, file);
    if (!fs.existsSync(filePath)) {
      fail(file, "missing lens file");
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");

    if (!hasTableOrMermaid(content) && wordCount(content) > 80) {
      fail(file, `word count ${wordCount(content)} exceeds 80`);
    }

    for (const { re, label } of BANNED_PATTERNS) {
      if (re.test(content)) {
        fail(file, `banned phrase: ${label}`);
      }
    }

    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
    for (const p of paragraphs) {
      if (p.startsWith("```") || p.startsWith("|")) continue;
      const sentences = countSentences(p);
      if (sentences > 3) {
        fail(file, `paragraph has ${sentences} sentences (max 3)`);
      }
    }

    if (lens === "what-flows" && !/```mermaid/.test(content)) {
      warn(file, "no mermaid diagram (recommended)");
    }
  }

  if (catalogSlugs.has(slug) && !excerptSlugs.has(slug)) {
    warn("pass-excerpts.json", "study in catalog but missing pass excerpts");
  }

  return issues;
}

function collectExcerptStudies() {
  const excerpts = JSON.parse(fs.readFileSync(EXCERPTS_PATH, "utf8"));
  const slugs = new Set();
  for (const lensMap of Object.values(excerpts)) {
    for (const slug of Object.keys(lensMap)) {
      slugs.add(slug);
    }
  }
  return slugs;
}

function main() {
  const topics = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf8"));
  const topicSlugs = new Set(topics.map((t) => t.slug));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const catalogSlugs = new Set(catalog.studies.map((s) => s.slug));
  const excerptSlugs = collectExcerptStudies();

  const folders = fs
    .readdirSync(STUDIES_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name);

  const allIssues = [];
  for (const folder of folders) {
    allIssues.push(...lintStudy(folder, topicSlugs, catalogSlugs, excerptSlugs));
  }

  const errors = allIssues.filter((i) => i.level === "error");
  const warnings = allIssues.filter((i) => i.level === "warn");

  for (const w of warnings) {
    console.warn(`WARN [${w.study}] ${w.file}: ${w.message}`);
  }
  for (const e of errors) {
    console.error(`ERROR [${e.study}] ${e.file}: ${e.message}`);
  }

  if (errors.length) {
    console.error(`\nlint-drishti-content: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }
  console.log(`lint-drishti-content: OK (${warnings.length} warning(s))`);
}

main();
