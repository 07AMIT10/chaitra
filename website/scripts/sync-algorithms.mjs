import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const ALGORITHMS_ROOT = path.join(repoRoot, "algorithms");
const CONTENT_ROOT = path.join(repoRoot, "website/src/content/algorithms");

const CATALOG_PATH = path.join(repoRoot, "website/src/data/algorithms.json");
const REQUIRED_META = ["title", "slug", "field"];

function stripQuotes(value) {
  let v = value.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      v = v.slice(1, -1);
      if (first === '"') v = v.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }
  return v;
}

function parseFlowList(value) {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  const items = [];
  let current = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ",") {
      items.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  items.push(current);
  return items.map(stripQuotes).filter((item) => item !== "");
}

function parseMetaYaml(raw) {
  const data = {};
  let currentKey = null;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s*(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      const item = stripQuotes(listItem[1]);
      if (item !== "") data[currentKey].push(item);
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;

    const [, key, value] = kv;
    currentKey = key;

    if (value === "") {
      data[key] = null;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = parseFlowList(value);
    } else if (value === "true") {
      data[key] = true;
    } else if (value === "false") {
      data[key] = false;
    } else {
      data[key] = stripQuotes(value);
    }
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

/** JSON string literals are valid YAML double-quoted scalars. */
function scalar(value) {
  return JSON.stringify(String(value ?? ""));
}

function flowList(key, items) {
  return `${key}: [${items.map((item) => scalar(item)).join(", ")}]`;
}

function requiredField(data, key) {
  const value = data[key];
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function listMetaFiles() {
  if (!fs.existsSync(ALGORITHMS_ROOT)) return [];
  const out = [];
  const fieldDirs = fs
    .readdirSync(ALGORITHMS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"));
  for (const fieldDir of fieldDirs) {
    const fieldPath = path.join(ALGORITHMS_ROOT, fieldDir.name);
    const algorithmDirs = fs
      .readdirSync(fieldPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"));
    for (const algorithmDir of algorithmDirs) {
      const metaPath = path.join(fieldPath, algorithmDir.name, "meta.yaml");
      if (fs.existsSync(metaPath)) out.push(metaPath);
    }
  }
  return out;
}

// Always ensure the collection base directory exists so the glob loader and
// `astro build` behave even when no algorithms have been authored yet.
fs.mkdirSync(CONTENT_ROOT, { recursive: true });

const metaFiles = listMetaFiles();
let synced = 0;
let skipped = 0;
let malformed = 0;

for (const metaPath of metaFiles) {
  const folderPath = path.dirname(metaPath);
  const folder = path.basename(folderPath);
  const meta = parseMetaYaml(fs.readFileSync(metaPath, "utf8"));

  const missing = REQUIRED_META.filter((key) => !requiredField(meta, key));
  if (missing.length) {
    malformed += 1;
    console.error(
      `malformed meta.yaml (${folder}): missing required field(s) ${missing.join(", ")}`
    );
    continue;
  }

  const slug = String(meta.slug);
  const pagePath = path.join(folderPath, "page.mdx");
  if (!fs.existsSync(pagePath)) {
    skipped += 1;
    console.warn(`skip ${slug}: no page.mdx at algorithms/${path.basename(path.dirname(folderPath))}/${folder}/page.mdx`);
    continue;
  }

  const field = String(meta.field);
  const fieldLabel = meta.fieldLabel ? String(meta.fieldLabel) : field;
  const body = fs.readFileSync(pagePath, "utf8");

  const frontmatterLines = [
    "---",
    `title: ${scalar(meta.title)}`,
    `slug: ${slug}`,
    `field: ${field}`,
    `fieldLabel: ${scalar(fieldLabel)}`,
    `reframe: ${scalar(meta.reframe ?? "")}`,
    `oneLine: ${scalar(meta.oneLine ?? "")}`,
    flowList("tldr", asArray(meta.tldr)),
    flowList("mathBranches", asArray(meta.mathBranches)),
    flowList("primitives", asArray(meta.primitives)),
    flowList("attributions", asArray(meta.attributions)),
  ];
  const relatedTopics = asArray(meta.relatedTopics);
  if (relatedTopics.length) frontmatterLines.push(flowList("relatedTopics", relatedTopics));
  if (meta.featured === true) frontmatterLines.push("featured: true");
  frontmatterLines.push("---");

  const destDir = path.join(CONTENT_ROOT, slug);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(
    path.join(destDir, "index.mdx"),
    `${frontmatterLines.join("\n")}\n\n${body}`,
    "utf8"
  );
  synced += 1;
  console.log(`synced algorithm ${slug}`);
}

if (malformed > 0) {
  console.error(`algorithms sync failed: ${malformed} malformed meta.yaml file(s)`);
  process.exit(1);
}

// Touch the catalog so downstream builds never read a stale file.
if (!fs.existsSync(CATALOG_PATH)) {
  fs.writeFileSync(
    CATALOG_PATH,
    `${JSON.stringify({ algorithms: [], fields: [], mathBranches: [] }, null, 2)}\n`,
    "utf8"
  );
}

console.log(`algorithms sync complete — ${synced} synced, ${skipped} skipped`);
