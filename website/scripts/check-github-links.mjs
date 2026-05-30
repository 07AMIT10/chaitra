import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.join(__dirname, "..");

/** Legacy GitHub paths (topic folder at repo root, not under topics/). */
const LEGACY_TREE = /github\.com\/07AMIT10\/chaitra\/tree\/main\/(?!topics\/)[A-Z][A-Z0-9_]*/;
const LEGACY_BLOB = /github\.com\/07AMIT10\/chaitra\/blob\/main\/(?!topics\/)[A-Z][A-Z0-9_]*/;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(p, out);
    } else if (/\.(mdx?|tsx?|astro|mjs)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

let failed = false;
for (const file of walk(websiteRoot)) {
  const text = fs.readFileSync(file, "utf8");
  if (LEGACY_TREE.test(text) || LEGACY_BLOB.test(text)) {
    console.error(`legacy GitHub path in ${path.relative(websiteRoot, file)}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("ok: no legacy github.com/07AMIT10/chaitra/*/main/<TOPIC> paths in website/");
