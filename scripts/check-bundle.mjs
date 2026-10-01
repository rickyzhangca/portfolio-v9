import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const dist = path.resolve("dist/client");
const manifest = JSON.parse(
  await readFile(path.join(dist, ".vite/manifest.json"), "utf8")
);
const entries = Object.entries(manifest).filter(
  ([, chunk]) => chunk.isEntry && chunk.name === "entry.client"
);
assert(entries.length === 1, "Expected one Router client entry");
const [[clientEntry]] = entries;
const root = "src/router/root.tsx?__react-router-build-client-route";
const profiles = [
  {
    entries: [
      clientEntry,
      root,
      "src/router/home.tsx?__react-router-build-client-route",
      "src/app.tsx",
    ],
    name: "Home",
  },
  {
    entries: [
      clientEntry,
      root,
      "src/router/article.tsx?__react-router-build-client-route",
      "src/router/article.tsx?route-chunk=clientLoader",
    ],
    name: "Article",
  },
  {
    entries: [
      clientEntry,
      root,
      "src/router/not-found.tsx?__react-router-build-client-route",
    ],
    name: "Not found",
  },
];

const checkBudget = async (profile) => {
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
  for (const key of profile.entries) {
    collect(key);
  }
  const contents = await Promise.all(
    Array.from(initialFiles, (file) => readFile(path.join(dist, file)))
  );
  const rawBytes = contents.reduce(
    (total, content) => total + content.length,
    0
  );
  const gzipBytes = contents.reduce(
    (total, content) => total + gzipSync(content).length,
    0
  );
  console.log(
    `${profile.name} JS: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip (${initialFiles.size} files)`
  );
  // Preserve the original canvas budget for each route, including Home's lazy App.
  assert(rawBytes <= 950_000, `${profile.name} JS exceeds 950 KB: ${rawBytes}`);
  assert(
    gzipBytes <= 300_000,
    `${profile.name} JS exceeds 300 KB gzip: ${gzipBytes}`
  );
};
await Promise.all(profiles.map(checkBudget));
