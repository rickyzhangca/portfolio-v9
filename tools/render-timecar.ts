/**
 * Renders the toy time machine on the desk and the maps the desk lamp
 * relights it with, from Ddiaz Design's "1985 DeLorean DMC-12 Time Machine
 * BTTF" (Sketchfab, glTF download, unzipped):
 *
 *   node tools/render-timecar.ts <unzipped model folder>
 *
 * three.js renders it in Chromium (tools/render-timecar.html): shot from
 * above, 34 degrees towards the screen's bottom, nose left, in a studio of
 * one softbox and no direct light. Alongside the photo come desk-space
 * normals and its surface (metalness, roughness, glass), which
 * `car-shader.wgsl` relights. cwebp encodes them into `src/assets/timecar`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PROJECT_ROOT } from "./articles.ts";

/** The card's width on the desk, in CSS px; the photo is encoded at 3x. */
const CARD_WIDTH = 248;
const ORIGIN = "http://timecar.render";
const MODEL_PREFIX = /^model\//u;
const CONTENT_TYPES: Record<string, string> = {
  ".bin": "application/octet-stream",
  ".gltf": "model/gltf+json",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

const [, , modelFolder] = process.argv;
if (!modelFolder) {
  throw new Error(
    "Usage: node tools/render-timecar.ts <unzipped model folder>"
  );
}
const page = path.join(PROJECT_ROOT, "tools/render-timecar.html");
const output = path.join(PROJECT_ROOT, "src/assets/timecar");
const work = mkdtempSync(path.join(tmpdir(), "timecar-"));

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu"],
});
try {
  const tab = await browser.newPage({ viewport: { height: 800, width: 800 } });
  // The page and the model are served from disk; three.js comes from its CDN.
  await tab.route(`${ORIGIN}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file =
      pathname === "/"
        ? page
        : path.join(
            modelFolder,
            decodeURIComponent(pathname.slice(1)).replace(MODEL_PREFIX, "")
          );
    route.fulfill({
      body: readFileSync(file),
      contentType:
        CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
    });
  });
  await tab.goto(`${ORIGIN}/`);
  await tab.waitForFunction(() => "__done" in globalThis, null, {
    timeout: 300_000,
  });
  const passes = await tab.evaluate(
    () => (globalThis as unknown as { __out: Record<string, string> }).__out
  );
  for (const [name, dataUrl] of Object.entries(passes)) {
    const base64 = dataUrl.split(",")[1] ?? "";
    writeFileSync(
      path.join(work, `${name}.png`),
      Buffer.from(base64, "base64")
    );
  }
} finally {
  await browser.close();
}

const cwebp = (input: string, out: string, args: string[]) =>
  execFileSync("cwebp", [
    "-quiet",
    ...args,
    path.join(work, input),
    "-o",
    path.join(output, out),
  ]);
const lossy = ["-q", "84", "-m", "6", "-sharp_yuv", "-alpha_q", "100"];
cwebp("beauty.png", "delorean.webp", [
  ...lossy,
  "-resize",
  String(CARD_WIDTH * 3),
  "0",
]);
cwebp("beauty.png", "delorean-2x.webp", [
  ...lossy,
  "-resize",
  String(CARD_WIDTH * 2),
  "0",
]);
// Normals tolerate a little loss; the surface map is flat colour, kept exact.
cwebp("normal.png", "delorean-normal.webp", [
  "-q",
  "92",
  "-m",
  "6",
  "-exact",
  "-alpha_q",
  "100",
  "-resize",
  String(CARD_WIDTH * 3),
  "0",
]);
cwebp("material.png", "delorean-material.webp", [
  "-lossless",
  "-z",
  "9",
  "-exact",
  "-resize",
  String(CARD_WIDTH * 3),
  "0",
]);
rmSync(work, { force: true, recursive: true });
console.log(`Wrote the time machine's photo and lamp maps to ${output}`);
