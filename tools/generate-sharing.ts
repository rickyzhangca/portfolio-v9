import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { SITE_IMAGE, SITE_NAME, SITE_URL } from "../src/lib/site.ts";
import type { ArticleMetadata } from "../src/types/article.ts";
import { PROJECT_ROOT } from "./articles.ts";
import { writeChanged } from "./files.ts";

// Static instances: resvg ignores variable-font axes and would draw the
// default (thinnest) weight. The Noto build font is subset to CJK ranges:
// resvg moves a whole mixed-script line to its fallback font, so Noto must
// have no Latin glyphs for "Design engineer 的…" to keep Latin in Google Sans.
const FONT_FILES = [
  "google-sans-regular.ttf",
  "google-sans-semibold.ttf",
  "noto-sans-sc-semibold.ttf",
].map((file) => path.join(PROJECT_ROOT, "tools/fonts", file));
const FONT_FAMILY = "'Google Sans', 'Noto Sans SC'";
const CJK = "\\p{Script=Han}\\u3000-\\u303f\\uff00-\\uffef";
const CJK_CHARACTER = new RegExp(`[${CJK}]`, "u");
const WRAP_TOKEN = new RegExp(`[${CJK}]|[^\\s${CJK}]+`, "gu");
const WHITESPACE = /\s/u;
const TOUCH_ICON_SIZE = 180;
const ROUNDED_RECT = /(<rect[^>]*?)\s+rx="[^"]*"\s+ry="[^"]*"/;

function xml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "'": "&apos;",
        '"': "&quot;",
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character
  );
}

function lines(value: string, maxWidth: number, size: number): string[] {
  const result: string[] = [];
  let current = "";
  let width = 0;
  for (const match of value.matchAll(WRAP_TOKEN)) {
    const [word] = match;
    const wordWidth = [...word].reduce(
      (total, character) =>
        total + (CJK_CHARACTER.test(character) ? size : size * 0.55),
      0
    );
    if (width + wordWidth > maxWidth && current) {
      result.push(current);
      current = "";
      width = 0;
    }
    // Keep the source's spacing, including "engineer 的", but never start a
    // wrapped line with a space.
    const index = match.index ?? 0;
    const gap = current && WHITESPACE.test(value[index - 1] ?? "") ? " " : "";
    current += gap + word;
    width += wordWidth + gap.length * size * 0.3;
  }
  if (current) {
    result.push(current);
  }
  return result;
}

function renderPng(svg: string, width?: number) {
  return new Resvg(svg, {
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    font: {
      defaultFontFamily: "Google Sans",
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
    },
  })
    .render()
    .asPng();
}

function homeImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SITE_IMAGE.width}" height="${SITE_IMAGE.height}"><rect width="1200" height="630" fill="#f7f7f4"/><rect x="40" y="40" width="1120" height="550" rx="28" fill="white"/><g font-family="${FONT_FAMILY}"><text x="84" y="290" font-size="96" font-weight="600" fill="#26251f">${xml(SITE_NAME)}</text><text x="84" y="370" font-size="44" fill="#77756c">Design Engineer, Design Systems</text></g></svg>`;
}

export function generateSharing(articles: ArticleMetadata[]) {
  const directory = path.join(PROJECT_ROOT, "public/writing/og");
  mkdirSync(directory, { recursive: true });
  const cacheDirectory = path.join(
    PROJECT_ROOT,
    "node_modules/.cache/portfolio-writing"
  );
  mkdirSync(cacheDirectory, { recursive: true });
  const hashesFile = path.join(cacheDirectory, "sharing-hashes.json");
  const previous = existsSync(hashesFile)
    ? (JSON.parse(readFileSync(hashesFile, "utf8")) as Record<string, string>)
    : {};
  const hashes: Record<string, string> = {};
  const fontHash = createHash("sha256");
  for (const file of FONT_FILES) {
    fontHash.update(readFileSync(file));
  }
  const fontDigest = fontHash.digest("hex");
  const urls = [`<url><loc>${SITE_URL}/</loc></url>`];
  for (const article of articles) {
    for (const [locale, translation] of Object.entries(article.translations)) {
      if (!translation) {
        continue;
      }
      const key = `${article.slug}-${locale}`;
      const title = lines(translation.title, 1030, 64).slice(0, 3);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f7f7f4"/><rect x="40" y="40" width="1120" height="550" rx="28" fill="white"/><g font-family="${FONT_FAMILY}">${title.map((line, index) => `<text x="84" y="${200 + index * 84}" font-size="64" font-weight="600" fill="#26251f">${xml(line)}</text>`).join("")}<text x="84" y="530" font-size="32" fill="#77756c">${xml(SITE_NAME)}</text></g></svg>`;
      hashes[key] = createHash("sha256")
        .update(svg)
        .update(fontDigest)
        .digest("hex");
      const file = path.join(directory, `${key}.png`);
      if (previous[key] !== hashes[key] || !existsSync(file)) {
        writeChanged(file, renderPng(svg));
      }
      const languages = Object.keys(article.translations);
      const defaultLanguage = languages.includes("en") ? "en" : languages[0];
      const alternateLinks = [
        ...languages.map(
          (language) =>
            `<xhtml:link rel="alternate" hreflang="${language === "cn" ? "zh-CN" : "en"}" href="${SITE_URL}/writing/${language}/${article.slug}"/>`
        ),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/writing/${defaultLanguage}/${article.slug}"/>`,
      ].join("");
      urls.push(
        `<url><loc>${SITE_URL}/writing/${locale}/${article.slug}</loc><lastmod>${article.published}</lastmod>${alternateLinks}</url>`
      );
    }
  }
  const publicDirectory = path.join(PROJECT_ROOT, "public");
  const siteImages = [
    { file: "og.png", key: "site:home", svg: homeImage(), width: undefined },
    {
      file: "apple-touch-icon.png",
      key: "site:touch-icon",
      // iOS rounds the icon itself and fills transparent corners with black.
      svg: readFileSync(path.join(publicDirectory, "fav.svg"), "utf8").replace(
        ROUNDED_RECT,
        "$1"
      ),
      width: TOUCH_ICON_SIZE,
    },
  ];
  for (const image of siteImages) {
    hashes[image.key] = createHash("sha256")
      .update(image.svg)
      .update(fontDigest)
      .update(String(image.width))
      .digest("hex");
    const file = path.join(publicDirectory, image.file);
    if (previous[image.key] !== hashes[image.key] || !existsSync(file)) {
      writeChanged(file, renderPng(image.svg, image.width));
    }
  }
  for (const entry of readdirSync(directory)) {
    if (
      (entry.endsWith(".png") && !(entry.slice(0, -4) in hashes)) ||
      entry === ".hashes.json"
    ) {
      unlinkSync(path.join(directory, entry));
    }
  }
  writeChanged(hashesFile, `${JSON.stringify(hashes)}\n`);
  writeChanged(
    path.join(PROJECT_ROOT, "public/sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>\n`
  );
}
