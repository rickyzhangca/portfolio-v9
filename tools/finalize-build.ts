import {
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

// Both Vercel cleanUrls and Vite preview resolve /writing/... from .html.
// Keep Router's rendered HTML/data intact; only normalize its file layout.
const directory = path.resolve("dist/client");
function flattenHtml(folder: string) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== "assets") {
      flattenHtml(path.join(folder, entry.name));
    }
    if (entry.isFile() && entry.name === "index.html" && folder !== directory) {
      renameSync(path.join(folder, entry.name), `${folder}.html`);
    }
  }
  if (folder !== directory && readdirSync(folder).length === 0) {
    rmdirSync(folder);
  }
}
flattenHtml(directory);

interface ManifestChunk {
  file: string;
  imports?: string[];
}

// The root shell imports the canvas App lazily, so the browser would only
// request it after hydration. Home always mounts it: preload it with the
// route modules instead of waiting.
function preloadCanvasApp() {
  const manifest: Record<string, ManifestChunk> = JSON.parse(
    readFileSync(path.join(directory, ".vite/manifest.json"), "utf8")
  );
  const files = new Set<string>();
  const collect = (key: string) => {
    const chunk = manifest[key];
    if (!chunk) {
      throw new Error(`Missing chunk in manifest: ${key}`);
    }
    if (files.has(chunk.file)) {
      return;
    }
    files.add(chunk.file);
    for (const dependency of chunk.imports ?? []) {
      collect(dependency);
    }
  };
  collect("src/app.tsx");
  const homePath = path.join(directory, "index.html");
  const html = readFileSync(homePath, "utf8");
  const links = Array.from(files)
    .filter((file) => !html.includes(`href="/${file}"`))
    .map((file) => `<link rel="modulepreload" href="/${file}"/>`)
    .join("");
  const anchor = html.indexOf('<link rel="stylesheet"');
  if (anchor === -1) {
    throw new Error("Home HTML has no stylesheet link to preload before");
  }
  writeFileSync(homePath, html.slice(0, anchor) + links + html.slice(anchor));
}
preloadCanvasApp();
