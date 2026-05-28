import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const topics = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "website/src/data/topics.json"), "utf8")
);

for (const t of topics) {
  const src = path.join(repoRoot, t.folder, "README.md");
  const destDir = path.join(repoRoot, "website/src/content/topics", t.slug);
  const dest = path.join(destDir, "readme-body.md");
  if (!fs.existsSync(src)) {
    console.warn(`skip ${t.slug}: no README at ${src}`);
    continue;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`synced ${t.slug}`);
}
