import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const outDir = path.join(__dirname, "../src/assets/code");

const PAIRS = [
  ["topics/BLOOM_FILTERS/bloom_filter.rs", "bloom_filter.rs.txt"],
  ["topics/HYPERLOGLOG/hyperloglog.rs", "hyperloglog.rs.txt"],
  ["topics/COUNT_MIN_SKETCH/count_min_sketch.rs", "count_min_sketch.rs.txt"],
  ["topics/CONSISTENT_HASHING/consistent_hashing.rs", "consistent_hashing.rs.txt"],
];

fs.mkdirSync(outDir, { recursive: true });
for (const [srcRel, destName] of PAIRS) {
  const src = path.join(repoRoot, srcRel);
  const dest = path.join(outDir, destName);
  if (!fs.existsSync(src)) {
    console.warn(`skip missing ${srcRel}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`synced ${destName}`);
}
