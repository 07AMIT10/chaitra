#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const topicsPath = path.join(root, "src/data/topics.json");
const topics = JSON.parse(fs.readFileSync(topicsPath, "utf8"));

const SPECIAL = {
  "large-language-models": "LlmTemperatureLab",
  "statistical-learning": "StatisticalLearningLab",
};

for (const t of topics) {
  if (t.status !== "readme-only") continue;
  const slug = t.slug;
  const mdxPath = path.join(root, `src/content/topics/${slug}/index.mdx`);
  if (!fs.existsSync(mdxPath)) {
    console.warn("skip missing", slug);
    continue;
  }
  let body = fs.readFileSync(mdxPath, "utf8");
  if (body.includes("<h2 id=\"lab\">")) {
    console.log("already patched", slug);
    continue;
  }

  const special = SPECIAL[slug];
  const importLine = special
    ? `import ${special} from "../../../components/preview/${special}.tsx";`
    : `import GenericPreviewLab from "../../../components/preview/GenericPreviewLab.tsx";`;

  const labBlock = special
    ? `<h2 id="lab">Lab</h2>\n\n<${special} client:visible />`
    : `<h2 id="lab">Lab</h2>\n\n<GenericPreviewLab slug="${slug}" client:visible />`;

  body = body.replace(
    /^---\n([\s\S]*?)\n---\n/,
    (m) => `${m.trim()}\n\n${importLine}\n`
  );

  body = body.replace(
    /<Callout[\s\S]*?<\/Callout>\n\n/,
    ""
  );

  if (!body.endsWith("\n")) body += "\n";
  body += `\n${labBlock}\n`;

  fs.writeFileSync(mdxPath, body);
  t.hasLab = true;
  t.labTier = "B";
  console.log("patched", slug);
}

fs.writeFileSync(topicsPath, `${JSON.stringify(topics, null, 2)}\n`);
console.log("topics.json updated");
