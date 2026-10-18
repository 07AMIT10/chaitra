import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const ALGORITHMS_ROOT = path.join(repoRoot, "algorithms");
const contentRoot = path.join(repoRoot, "website/src/content/algorithms");
const outPath = path.join(repoRoot, "website/src/data/algorithms.json");

/**
 * Hand-rolled YAML reader for the small, fixed shape of `meta.yaml`.
 * Supports: `key: value`, `key: [a, b, c]` flow lists, block lists, booleans.
 * Mirrors the approach used by generate-drishti-catalog.mjs, extended for flow lists.
 */
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
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

function titleCase(id) {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function compare(a, b) {
  const la = String(a).toLowerCase();
  const lb = String(b).toLowerCase();
  if (la < lb) return -1;
  if (la > lb) return 1;
  return 0;
}

const algorithms = [];

if (fs.existsSync(ALGORITHMS_ROOT)) {
  const fieldDirs = fs
    .readdirSync(ALGORITHMS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"));

  for (const fieldDir of fieldDirs) {
    const fieldPath = path.join(ALGORITHMS_ROOT, fieldDir.name);
    const algorithmDirs = fs
      .readdirSync(fieldPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"));

    for (const algorithmDir of algorithmDirs) {
      const folderPath = path.join(fieldPath, algorithmDir.name);
      const metaPath = path.join(folderPath, "meta.yaml");
      if (!fs.existsSync(metaPath)) continue;

      const meta = parseMetaYaml(fs.readFileSync(metaPath, "utf8"));
      const slug = meta.slug || algorithmDir.name.toLowerCase().replace(/_/g, "-");
      const field = meta.field || fieldDir.name;

      algorithms.push({
        slug,
        folder: algorithmDir.name,
        field,
        fieldLabel: meta.fieldLabel || titleCase(field),
        title: meta.title ?? slug,
        reframe: meta.reframe ?? "",
        oneLine: meta.oneLine ?? "",
        tldr: asArray(meta.tldr),
        mathBranches: asArray(meta.mathBranches),
        primitives: asArray(meta.primitives),
        attributions: asArray(meta.attributions),
        relatedTopics: asArray(meta.relatedTopics),
        featured: meta.featured === true,
        hasPage: fs.existsSync(path.join(folderPath, "page.mdx")),
      });
    }
  }
}

algorithms.sort(
  (a, b) =>
    compare(a.field, b.field) || compare(a.title, b.title) || compare(a.slug, b.slug)
);

const fieldMap = new Map();
for (const algorithm of algorithms) {
  if (!fieldMap.has(algorithm.field)) {
    fieldMap.set(algorithm.field, {
      id: algorithm.field,
      label: algorithm.fieldLabel,
      count: 0,
    });
  }
  const entry = fieldMap.get(algorithm.field);
  entry.count += 1;
  if (!entry.label && algorithm.fieldLabel) entry.label = algorithm.fieldLabel;
}
const fields = [...fieldMap.values()].sort((a, b) => compare(a.id, b.id));

const branchMap = new Map();
for (const algorithm of algorithms) {
  for (const branch of algorithm.mathBranches) {
    branchMap.set(branch, (branchMap.get(branch) ?? 0) + 1);
  }
}
const mathBranches = [...branchMap.entries()]
  .map(([id, count]) => ({ id, count }))
  .sort((a, b) => compare(a.id, b.id));

const catalog = { algorithms, fields, mathBranches };

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(
  `wrote algorithms.json — ${algorithms.length} algorithms, ${fields.length} fields, ${mathBranches.length} math branches`
);
