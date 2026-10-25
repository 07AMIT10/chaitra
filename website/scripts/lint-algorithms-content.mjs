#!/usr/bin/env node
/**
 * Content quality lint for the algorithms content directories.
 *
 * Errors fail CI; there is no warn tier — every check is a hard requirement.
 *
 * The page checks are pure functions over strings (see `check*` exports) so they
 * can be exercised against fixtures without touching the real corpus:
 *
 *   node scripts/lint-algorithms-content.mjs                       # lint everything
 *   node scripts/lint-algorithms-content.mjs --slug union-find     # lint one algorithm
 *   node scripts/lint-algorithms-content.mjs --file /tmp/f/page.mdx  # lint one page
 *
 * The interactive checks exist because Astro server-renders React components to
 * static HTML: without a `client:*` directive they never hydrate, so a page can
 * build cleanly, log zero console errors, and still be completely dead.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const ALGORITHMS_ROOT = path.join(repoRoot, "algorithms");
const COMPONENTS_DIR = path.join(repoRoot, "website/src/components/algorithms");
const COMPONENTS_REL = "website/src/components/algorithms";

const REQUIRED_FIELDS = [
  "title",
  "slug",
  "field",
  "fieldLabel",
  "reframe",
  "oneLine",
  "mathBranches",
  "primitives",
  "attributions",
];

/**
 * Primitive library components that are intentionally static: they render
 * standalone markup and need no hydration. Everything else imported through the
 * `@alg/*` alias must carry an explicit Astro client directive.
 */
export const STATIC_PRIMITIVES = new Set([
  "SeriesChart",
  "GrowthTable",
  "PrimitiveShell",
  "Afterimage",
  "MentalImage",
  "Transmission",
  "MissionCard",
  "ChapterMark",
  "NextUp",
  "NextMission",
]);

const CLIENT_DIRECTIVE_RE = /(?:^|\s)client:(visible|load|idle|only)(?=[\s/>=]|$)/;

const BANNED_WORDS = ["delve", "leverage", "robust", "comprehensive", "seamless"];
const BANNED_PHRASES = ["it's worth noting", "in conclusion"];

// ---------------------------------------------------------------------------
// meta.yaml parsing (unchanged contract)
// ---------------------------------------------------------------------------

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

export function parseMetaYaml(raw) {
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

function isPresent(data, key) {
  const value = data[key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isNonEmptyString(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

// ---------------------------------------------------------------------------
// Pure page-text helpers
// ---------------------------------------------------------------------------

/**
 * Replace non-prose regions (fenced code, inline code spans, MDX comments) with
 * spaces, preserving length and newlines so line numbers stay exact. JSX and
 * prose are left intact.
 */
export function maskNonCode(source) {
  const chars = source.split("");
  const n = source.length;
  const mask = (start, end) => {
    for (let k = start; k < end; k++) if (chars[k] !== "\n") chars[k] = " ";
  };

  let i = 0;
  while (i < n) {
    if (source.startsWith("```", i) || source.startsWith("~~~", i)) {
      const fence = source.slice(i, i + 3);
      const close = source.indexOf(fence, i + 3);
      const end = close === -1 ? n : close + 3;
      mask(i, end);
      i = end;
      continue;
    }
    if (source[i] === "`") {
      const close = source.indexOf("`", i + 1);
      const end = close === -1 ? n : close + 1;
      mask(i, end);
      i = end;
      continue;
    }
    if (source.startsWith("{/*", i)) {
      const close = source.indexOf("*/}", i + 3);
      const end = close === -1 ? n : close + 3;
      mask(i, end);
      i = end;
      continue;
    }
    i++;
  }

  return chars.join("");
}

function lineOf(source, index) {
  let line = 1;
  for (let k = 0; k < index; k++) if (source[k] === "\n") line++;
  return line;
}

/** Return the attributes slice of a tag starting at `start` ('<'). */
function readTag(source, start) {
  const n = source.length;
  let i = start + 1;
  let depth = 0;
  let quote = null;
  while (i < n) {
    const ch = source[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
    } else if (ch === ">" && depth === 0) {
      const attrs = source.slice(start, i + 1);
      return { end: i + 1, attrs, selfClosing: /\/\s*>$/.test(attrs) };
    }
    i++;
  }
  return { end: -1, attrs: "", selfClosing: false };
}

/**
 * Parse JSX component elements (uppercase-initial names) from masked MDX.
 * HTML/lowercase tags are ignored entirely. Returns a flat list; `parent` is the
 * index of the nearest enclosing component element, or -1.
 */
export function parseJsxElements(masked) {
  const elements = [];
  const stack = [];
  const n = masked.length;
  let i = 0;

  while (i < n) {
    if (masked[i] !== "<") {
      i++;
      continue;
    }

    if (masked[i + 1] === "/") {
      const close = /^<\/([A-Za-z][\w.$:-]*)\s*>/.exec(masked.slice(i));
      if (close) {
        for (let s = stack.length - 1; s >= 0; s--) {
          if (stack[s].name === close[1]) {
            stack.length = s;
            break;
          }
        }
        i += close[0].length;
      } else {
        i++;
      }
      continue;
    }

    const open = /^<([A-Za-z][\w.$:-]*)/.exec(masked.slice(i));
    if (!open) {
      i++;
      continue;
    }
    const name = open[1];
    const { end, attrs, selfClosing } = readTag(masked, i);
    if (end < 0) {
      i++;
      continue;
    }

    if (/^[A-Z]/.test(name)) {
      const withoutStrings = attrs.replace(/"[^"]*"|'[^']*'/g, "");
      const hasClient = CLIENT_DIRECTIVE_RE.test(withoutStrings);
      const index = elements.length;
      elements.push({
        name,
        line: lineOf(masked, i),
        hasClient,
        selfClosing,
        parent: stack.length ? stack[stack.length - 1].index : -1,
      });
      if (!selfClosing) stack.push({ name, index });
    }

    i = end;
  }

  return elements;
}

/** Parse ES import declarations. Handles default, named and bare imports. */
export function parseImports(source) {
  const imports = [];
  const lines = source.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx++) {
    const m = /^\s*import\s+(.+?)\s+from\s+["']([^"']+)["']/.exec(lines[idx]);
    if (!m) continue;
    let clause = m[1].trim().replace(/^type\s+/, "");
    const specifier = m[2];
    const names = [];

    if (!clause.startsWith("{")) {
      const def = /^([A-Za-z_$][\w$]*)/.exec(clause);
      if (def) names.push(def[1]);
    }
    const named = /\{([^}]*)\}/.exec(clause);
    if (named) {
      for (const part of named[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) names.push(name);
      }
    }

    imports.push({ names, specifier, line: idx + 1 });
  }
  return imports;
}

// ---------------------------------------------------------------------------
// Pure checks — each returns [{ line?, message }]
// ---------------------------------------------------------------------------

/** Check 2: every non-static `@alg/*` primitive used needs a client directive. */
export function checkClientDirectives(pageSource, staticPrimitives = STATIC_PRIMITIVES) {
  const imports = parseImports(pageSource);
  const algNames = new Set(
    imports.flatMap((imp) => (imp.specifier.startsWith("@alg/") ? imp.names : []))
  );
  const masked = maskNonCode(pageSource);
  const errors = [];

  for (const el of parseJsxElements(masked)) {
    if (!algNames.has(el.name)) continue;
    if (staticPrimitives.has(el.name)) continue;
    if (el.hasClient) continue;
    errors.push({
      line: el.line,
      message:
        `<${el.name}> is interactive but has no Astro client directive — ` +
        `add client:visible (e.g. <${el.name} client:visible … />). ` +
        `Astro server-renders React and never hydrates it without one.`,
    });
  }
  return errors;
}

/** Check 3: no island may contain another island as a JSX child. */
export function checkNesting(pageSource) {
  const els = parseJsxElements(maskNonCode(pageSource));
  const errors = [];

  for (const el of els) {
    if (!el.hasClient) continue;
    let p = el.parent;
    while (p >= 0) {
      const ancestor = els[p];
      if (ancestor.hasClient) {
        errors.push({
          line: el.line,
          message:
            `nested island — <${el.name} client:*> is a JSX child of ` +
            `<${ancestor.name} client:*>. Astro islands cannot nest, so make the ` +
            `composite a single self-contained component and drop the inner directive.`,
        });
        break;
      }
      p = ancestor.parent;
    }
  }
  return errors;
}

/** Check 4: every `@alg/<Name>.tsx` import must resolve to a real component file. */
export function checkImportsResolve(pageSource, availableFiles) {
  const errors = [];
  for (const imp of parseImports(pageSource)) {
    if (!imp.specifier.startsWith("@alg/")) continue;
    const rel = imp.specifier.slice("@alg/".length);
    const candidates = [rel];
    if (rel === "") candidates.push("index.ts", "index.tsx");
    else if (!path.extname(rel)) candidates.push(`${rel}.tsx`, `${rel}.ts`);
    if (!candidates.some((c) => availableFiles.has(c))) {
      errors.push({
        line: imp.line,
        message: `import "${imp.specifier}" does not resolve — missing ${COMPONENTS_REL}/${
          rel || "index.tsx"
        }`,
      });
    }
  }
  return errors;
}

/** Check 5: meta.yaml `primitives` and the imported-and-used set must agree. */
export function checkMetaCrossCheck(meta, pageSource) {
  const errors = [];
  const imports = parseImports(pageSource);
  const imported = new Set(
    imports.flatMap((imp) => (imp.specifier.startsWith("@alg/") ? imp.names : []))
  );
  const masked = maskNonCode(pageSource);
  const used = new Set(
    parseJsxElements(masked)
      .map((el) => el.name)
      .filter((name) => imported.has(name))
  );
  const listed = (Array.isArray(meta.primitives) ? meta.primitives : [])
    .map(String)
    .filter((name) => !name.startsWith("bespoke:"));

  for (const name of listed) {
    if (!used.has(name)) {
      errors.push({
        message: `meta.yaml "primitives" lists "${name}" but page.mdx never imports and uses it`,
      });
    }
  }
  for (const name of used) {
    if (!listed.includes(name)) {
      errors.push({
        message: `page.mdx uses primitive "${name}" but meta.yaml "primitives" does not list it`,
      });
    }
  }
  return errors;
}

/** Check 6: no per-page CSS — primitives and tokens.css own the look. */
export function checkNoPerPageCss(pageSource) {
  const masked = maskNonCode(pageSource);
  const errors = [];
  const patterns = [
    { re: /className\s*=/g, what: "className=" },
    { re: /style\s*=\s*\{/g, what: "style={" },
    { re: /<style[\s>/]/gi, what: "<style" },
  ];

  for (const { re, what } of patterns) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(masked)) !== null) {
      errors.push({
        line: lineOf(masked, match.index),
        message: `per-page CSS — found "${what}" in page.mdx; primitives and tokens.css own the look`,
      });
    }
  }
  return errors;
}

/** Check 7: no banned filler, case-insensitive and whole-word. */
export function checkBannedFiller(pageSource) {
  const masked = maskNonCode(pageSource).replace(/[\u2018\u2019]/g, "'");
  const errors = [];

  for (const word of BANNED_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    let match;
    while ((match = re.exec(masked)) !== null) {
      errors.push({
        line: lineOf(masked, match.index),
        message: `banned filler "${match[0]}" — rewrite it in plain language`,
      });
    }
  }
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let match;
    while ((match = re.exec(masked)) !== null) {
      errors.push({
        line: lineOf(masked, match.index),
        message: `banned filler "${match[0]}" — rewrite it in plain language`,
      });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Corpus discovery
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Display-math fences
// ---------------------------------------------------------------------------

/**
 * Check 8: a `$$` display-math fence must be alone on its line.
 *
 * If a `$$` shares its line with anything else, remark-math mis-parses the block and the
 * failure is silent. An opening `$$ \begin{aligned}` becomes the fence's *meta* text, which
 * mdast-util-math discards, and a closing `\end{aligned} $$` is not recognised as a fence
 * at all, so the math node runs to end of file and swallows every later block — the rest of
 * the page renders as literal text. The build still succeeds and nothing is logged, which is
 * why this is a lint rule and not a build error.
 */
export function checkMathFences(pageSource) {
  const masked = maskNonCode(pageSource).replace(/\\\$/g, "  ");
  const errors = [];
  const lines = masked.split("\n");
  let bare = 0;

  for (let k = 0; k < lines.length; k++) {
    const count = (lines[k].match(/\$\$/g) ?? []).length;
    if (count === 0) continue;
    if (lines[k].trim() === "$$") {
      bare++;
      continue;
    }
    if (count % 2 === 1) {
      errors.push({
        line: k + 1,
        message:
          'a `$$` display-math fence must sit alone on its line — write `$$` on one line, the maths on the next, and `$$` on its own line after. Sharing the line (e.g. `$$ \\begin{aligned}` or `\\end{aligned} $$`) makes remark-math swallow the rest of the page as literal text with no build error.',
      });
    }
  }

  if (bare % 2 === 1) {
    errors.push({
      line: lineOf(masked, masked.lastIndexOf("\n$$")),
      message: `unbalanced display-math fence — ${bare} lines contain only \`$$\`, which is an odd number, so one fence is never closed and everything after it is swallowed`,
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Corpus discovery
// ---------------------------------------------------------------------------

function listMetaFiles() {
  if (!fs.existsSync(ALGORITHMS_ROOT)) return [];
  const out = [];
  const fieldDirs = fs
    .readdirSync(ALGORITHMS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"));
  for (const fieldDir of fieldDirs) {
    const fieldPath = path.join(ALGORITHMS_ROOT, fieldDir.name);
    for (const algorithmDir of fs
      .readdirSync(fieldPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))) {
      const metaPath = path.join(fieldPath, algorithmDir.name, "meta.yaml");
      if (fs.existsSync(metaPath)) out.push(metaPath);
    }
  }
  return out;
}

function availableComponentFiles() {
  if (!fs.existsSync(COMPONENTS_DIR)) return new Set();
  return new Set(fs.readdirSync(COMPONENTS_DIR));
}

function metaFieldErrors(meta, label) {
  const display = `${label}/meta.yaml`;
  const errors = [];
  const push = (message) => errors.push({ display, message });
  for (const field of REQUIRED_FIELDS) {
    if (!isPresent(meta, field)) push(`missing required field "${field}"`);
  }
  if ("reframe" in meta && !isNonEmptyString(meta.reframe)) {
    push('"reframe" is empty');
  }
  if ("oneLine" in meta && !isNonEmptyString(meta.oneLine)) {
    push('"oneLine" is empty');
  }
  const tldr = Array.isArray(meta.tldr) ? meta.tldr : [];
  if (tldr.length < 3) {
    push(`"tldr" needs at least 3 entries (found ${tldr.length})`);
  }
  const attributions = Array.isArray(meta.attributions) ? meta.attributions : [];
  if (attributions.length === 0) {
    push('"attributions" is empty');
  }
  return errors;
}

function pageErrors(pageSource, { meta, availableFiles, displayPath }) {
  const out = [];
  const add = (list) => {
    for (const e of list) {
      const where = e.line ? `${displayPath}:${e.line}` : displayPath;
      out.push({ display: where, message: e.message });
    }
  };
  add(checkNoPerPageCss(pageSource));
  add(checkBannedFiller(pageSource));
  add(checkMathFences(pageSource));
  add(checkClientDirectives(pageSource));
  add(checkNesting(pageSource));
  add(checkImportsResolve(pageSource, availableFiles));
  if (meta) add(checkMetaCrossCheck(meta, pageSource));
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { slug: null, file: null, help: false, bad: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") args.slug = argv[++i] ?? null;
    else if (a === "--file") args.file = argv[++i] ?? null;
    else if (a === "--help" || a === "-h") args.help = true;
    else {
      console.error(`lint-algorithms-content: unknown argument "${a}"`);
      args.bad = true;
    }
  }
  return args;
}

const USAGE = `Usage: lint-algorithms-content.mjs [--slug <slug>] [--file <page.mdx>]

  (no flags)        lint every algorithm under algorithms/
  --slug <slug>     lint only the algorithm with this slug
  --file <path>     lint a single page.mdx standalone (uses its sibling meta.yaml)`;

function report(errors, { slug } = {}) {
  if (!errors.length) {
    console.log("lint-algorithms-content: OK");
    return 0;
  }
  for (const e of errors) {
    const scope = slug ? `[${slug}] ` : "";
    const line = e.line ? `${e.display}:${e.line}` : e.display;
    console.error(`ERROR ${scope}${line}: ${e.message}`);
  }
  console.error(`\nlint-algorithms-content: ${errors.length} error(s)`);
  return 1;
}

function runFileMode(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    console.error(`lint-algorithms-content: no such file: ${absolute}`);
    return 1;
  }
  const pageSource = fs.readFileSync(absolute, "utf8");
  const dir = path.dirname(absolute);
  const siblingMeta = path.join(dir, "meta.yaml");
  const meta = fs.existsSync(siblingMeta)
    ? parseMetaYaml(fs.readFileSync(siblingMeta, "utf8"))
    : null;
  const slug = meta?.slug ? String(meta.slug) : path.basename(dir).toLowerCase().replace(/_/g, "-");

  const errors = [];
  if (pageSource.includes("TODO")) {
    errors.push({ display: absolute, message: 'page.mdx contains literal "TODO"' });
  }
  if (meta) errors.push(...metaFieldErrors(meta, dir));
  errors.push(
    ...pageErrors(pageSource, { meta, availableFiles: availableComponentFiles(), displayPath: absolute })
  );
  return report(errors, { slug });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.bad) {
    console.log(USAGE);
    return args.bad ? 1 : 0;
  }

  if (args.file) return runFileMode(args.file);

  const all = listMetaFiles().map((metaPath) => ({
    metaPath,
    folderPath: path.dirname(metaPath),
  }));
  const selected = args.slug
    ? all.filter(({ metaPath }) => {
        const meta = parseMetaYaml(fs.readFileSync(metaPath, "utf8"));
        const folderSlug = path
          .basename(path.dirname(metaPath))
          .toLowerCase()
          .replace(/_/g, "-");
        return (meta.slug ? String(meta.slug) : folderSlug) === args.slug;
      })
    : all;

  if (args.slug && selected.length === 0) {
    console.error(`lint-algorithms-content: no algorithm with slug "${args.slug}"`);
    return 1;
  }

  const availableFiles = availableComponentFiles();
  const errors = [];

  for (const { metaPath, folderPath } of selected) {
    const meta = parseMetaYaml(fs.readFileSync(metaPath, "utf8"));
    const label = folderPath.replace(`${repoRoot}${path.sep}`, "");
    const slug = meta.slug
      ? String(meta.slug)
      : path.basename(folderPath).toLowerCase().replace(/_/g, "-");

    errors.push(
      ...metaFieldErrors(meta, label).map((e) => ({ ...e, slug }))
    );

    const pagePath = path.join(folderPath, "page.mdx");
    if (!fs.existsSync(pagePath)) {
      errors.push({ display: `${label}/page.mdx`, message: "missing", slug });
      continue;
    }
    const page = fs.readFileSync(pagePath, "utf8");
    if (page.includes("TODO")) {
      errors.push({
        display: `${label}/page.mdx`,
        message: 'contains literal "TODO"',
        slug,
      });
    }
    errors.push(
      ...pageErrors(page, {
        meta,
        availableFiles,
        displayPath: `${label}/page.mdx`,
      }).map((e) => ({ ...e, slug }))
    );
  }

  if (!errors.length) {
    console.log("lint-algorithms-content: OK");
    return 0;
  }
  for (const e of errors) {
    console.error(`ERROR ${e.slug ? `[${e.slug}] ` : ""}${e.display}: ${e.message}`);
  }
  console.error(`\nlint-algorithms-content: ${errors.length} error(s)`);
  return 1;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  process.exitCode = main();
}
