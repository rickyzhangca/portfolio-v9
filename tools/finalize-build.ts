import { readdirSync, renameSync, rmdirSync } from "node:fs";
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
