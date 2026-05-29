import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const topics = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "website/src/data/topics.json"), "utf8")
);

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;

function looksLikeDiagram(content) {
  const lines = content.trim().split("\n");
  return lines.some((line) => /\[/.test(line) && /\]/.test(line)) || lines.some((line) => /→/.test(line));
}

function stripLeadingH1(body) {
  if (!/^#\s/.test(body)) return body;
  return body.replace(/^#\s+.+\r?\n?/, "");
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

for (const t of topics) {
  const src = path.join(repoRoot, t.folder, "README.md");
  const destDir = path.join(repoRoot, "website/src/content/topics", t.slug);
  const dest = path.join(destDir, "readme-body.md");
  if (!fs.existsSync(src)) {
    console.warn(`skip ${t.slug}: no README at ${src}`);
    continue;
  }
  fs.mkdirSync(destDir, { recursive: true });
  let body = fs.readFileSync(src, "utf8");
  body = stripLeadingH1(body);
  body = processFences(body);
  fs.writeFileSync(dest, body, "utf8");
  console.log(`synced ${t.slug}`);
}
