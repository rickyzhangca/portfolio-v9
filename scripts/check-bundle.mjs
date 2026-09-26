import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const dist = path.resolve("dist");
const manifest = JSON.parse(
  await readFile(path.join(dist, ".vite/manifest.json"), "utf8")
);
const visited = new Set();
const initialFiles = new Set();
const collect = (key) => {
  if (visited.has(key)) {
    return;
  }
  visited.add(key);
  const chunk = manifest[key];
  assert(chunk, `Missing static import in manifest: ${key}`);
  initialFiles.add(chunk.file);
  for (const dependency of chunk.imports ?? []) {
    collect(dependency);
  }
};
const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry);
assert(
  entries.length === 1,
  "Expected one app entry; define per-entry budgets before adding pages"
);
const entry = entries[0];
collect(entry[0]);
let rawBytes = 0;
let gzipBytes = 0;
for (const file of initialFiles) {
  const content = await readFile(path.join(dist, file));
  rawBytes += content.length;
  gzipBytes += gzipSync(content).length;
}
console.log(
  `Initial JS: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip (${initialFiles.size} files)`
);
// Baseline: ~876 KB raw / 278 KB gzip. Dynamic imports and media are separate.
assert(rawBytes <= 950_000, `Initial JS exceeds 950 KB: ${rawBytes}`);
assert(gzipBytes <= 300_000, `Initial JS exceeds 300 KB gzip: ${gzipBytes}`);
